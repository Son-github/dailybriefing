from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from dataclasses import replace
from threading import Lock
from unittest.mock import Mock
import pytest
from botocore.exceptions import ClientError
from config import Config
from deduplicator import StateStore
from gpt_analyzer import Outcome
from handler import process
from sns_notifier import Notifier, notification
from conftest import logs, plain
from event_parser import Incident
from error_classifier import Classification


class FakeTable:
    """DynamoDB 조건식의 상태 전이를 lock 아래 재현합니다. 실제 AWS 원자성 검증은 별도입니다."""

    def __init__(self):
        self.items = {}
        self.lock = Lock()

    def get_item(self, Key, **kwargs):
        with self.lock:
            return {"Item": deepcopy(self.items.get(Key["pk"], {}))}

    def update_item(self, Key, ExpressionAttributeValues, **kwargs):
        with self.lock:
            key = Key["pk"]
            old = deepcopy(self.items.get(key, {}))
            row = self.items.setdefault(key, {})
            v = ExpressionAttributeValues
            allowed = True
            if key.startswith("quota#"):
                allowed = row.get("calls", 0) < v[":limit"]
                if allowed:
                    row.update(calls=row.get("calls", 0) + 1, expires_at=v[":expires"])
            elif ":processing" in v:
                allowed = (
                    not old
                    or row["expires_at"] <= v[":now"]
                    or row["status"] == "RETRY"
                    or (row["status"] == "PROCESSING" and row["lease_until"] <= v[":now"])
                )
                if allowed:
                    row.update(
                        status="PROCESSING",
                        owner=v[":owner"],
                        lease_until=v[":lease"],
                        expires_at=v[":expires"],
                    )
            else:
                allowed = row.get("owner") == v[":owner"]
                if allowed:
                    row.update(status=v[":status"], lease_until=v.get(":lease", 0))
                    if ":notification" in v:
                        row["notification"] = v[":notification"]
            if not allowed:
                raise ClientError(
                    {"Error": {"Code": "ConditionalCheckFailedException"}}, "UpdateItem"
                )
            return {"Attributes": old}


def store(config):
    return StateStore(FakeTable(), config, lambda: 1800000000)


def test_atomic_claim_and_quota_concurrency(config):
    state = store(config)
    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(lambda _: state.claim("same")[0], range(40)))
        quota = list(pool.map(lambda _: state.quota("gpt", 5), range(40)))
    assert results.count("claimed") == 1
    assert sum(quota) == 5


def test_ttl_checks_do_not_wait_for_background_deletion(config):
    now = [100]
    state = StateStore(FakeTable(), config, lambda: now[0])
    _, owner, _ = state.claim("same")
    state.update("same", owner, "PROCESSING", {"subject": "old", "message": "old"})
    state.update("same", owner, "SENT")
    assert state.claim("same")[0] == "duplicate"
    now[0] += config.dedup_seconds + 1
    result, _, record = state.claim("same")
    assert result == "claimed" and not record  # 이전 기간 이메일을 재사용하지 않습니다.


def test_state_unavailable_fails_closed(config):
    table = Mock()
    table.update_item.side_effect = RuntimeError("secret original")
    with pytest.raises(RuntimeError, match="State store unavailable"):
        StateStore(table, config, lambda: 1).claim("same")


def test_pipeline_disabled_duplicate_and_sanitized(config, capsys):
    state = store(config)
    analyzer = Mock()
    notifier = Mock()
    event = logs(
        plain(
            "errorCode=TIMEOUT httpStatus=504 exception=ApiException password=top-secret person@example.com"
        )
    )
    assert process(event, config, state, analyzer, notifier)["published"] == 1
    assert process(event, config, state, analyzer, notifier)["duplicate"] == 1
    analyzer.analyze.assert_not_called()
    message = notifier.publish.call_args.args[0]["message"]
    assert "top-secret" not in message and "person@example.com" not in message
    assert "top-secret" not in capsys.readouterr().out


def test_ai_quota_and_fallback_email(config):
    config = replace(config, ai_enabled=True, daily_limit=1)
    state = store(config)
    analyzer = Mock()
    analyzer.analyze.return_value = Outcome(reason="TIMEOUT")
    notifier = Mock()
    event = logs(
        plain("errorCode=TIMEOUT httpStatus=504 detail=alpha"),
        plain("errorCode=TIMEOUT httpStatus=504 detail=beta"),
    )
    assert process(event, config, state, analyzer, notifier)["published"] == 2
    assert analyzer.analyze.call_count == 1
    assert "일일 GPT 호출 제한" in notifier.publish.call_args.args[0]["message"]


def test_sns_retry_uses_cached_message_without_second_gpt(config):
    config = replace(config, ai_enabled=True)
    state = store(config)
    analyzer = Mock()
    analyzer.analyze.return_value = Outcome(reason="API_FAILURE")
    notifier = Mock()
    notifier.publish.side_effect = [RuntimeError("private error"), None]
    with pytest.raises(RuntimeError, match="delivery pending"):
        process(logs(plain()), config, state, analyzer, notifier)
    assert process(logs(plain()), config, state, analyzer, notifier)["published"] == 1
    assert analyzer.analyze.call_count == 1


def test_notification_limit_and_maintenance_never_call_gpt(config):
    config = replace(config, ai_enabled=True, notification_limit=0)
    state = store(config)
    analyzer = Mock()
    notifier = Mock()
    assert process(logs(plain()), config, state, analyzer, notifier)["skipped"] == 1
    assert process(logs(plain()), config, state, analyzer, notifier)["duplicate"] == 1
    analyzer.analyze.assert_not_called()
    notifier.publish.assert_not_called()
    assert process(logs(plain()), replace(config, processing_enabled=False), None, None, None) == {
        "maintenance": True
    }


def test_inflight_requests_retry_instead_of_ack_losing_alarm(config):
    state = store(config)
    event = logs(plain())
    from event_parser import parse_event
    from log_sanitizer import sanitize_incident
    from deduplicator import fingerprint

    incident = sanitize_incident(parse_event(event, config)[0], config.max_log_chars)
    state.claim(fingerprint(incident, "API_TIMEOUT"))
    with pytest.raises(RuntimeError, match="delivery pending"):
        process(event, config, state, Mock(), Mock())


def test_sns_payload_and_publish_failure():
    client = Mock()
    client.publish.side_effect = RuntimeError("publish failed")
    message = notification(
        Incident("logs", "service", "now", "id", "safe"),
        Classification("API_TIMEOUT", "HIGH"),
        Outcome(reason="LIMIT"),
    )
    assert "호출 제한" in message["message"]
    with pytest.raises(RuntimeError):
        Notifier(client, "topic").publish(message)
    assert client.publish.call_args.kwargs["TopicArn"] == "topic"


def test_config_defaults_and_explicit_model_requirement(monkeypatch):
    monkeypatch.delenv("AI_ENABLED", raising=False)
    assert not Config.from_env().ai_enabled
    monkeypatch.setenv("AI_ENABLED", "true")
    with pytest.raises(ValueError):
        Config.from_env()
    monkeypatch.setenv("DAILY_GPT_LIMIT", "101")
    with pytest.raises(ValueError):
        Config.from_env()


def test_daily_quota_is_utc_day_and_failure_consumes_attempt(config):
    now = [1800000000]
    state = StateStore(FakeTable(), config, lambda: now[0])
    assert state.quota("gpt", 1)
    assert not state.quota("gpt", 1)
    now[0] += 86400
    assert state.quota("gpt", 1)


def test_repeated_prefix_does_not_hide_new_failure_in_same_batch(config):
    config = replace(config, max_events=2)
    event = logs(
        *([plain()] * 50), plain("errorCode=INTERNAL httpStatus=500 exception=OtherException")
    )
    notifier = Mock()
    counts = process(event, config, store(config), Mock(), notifier)
    assert counts["published"] == 2 and counts["duplicate"] == 49 and counts["batch_dropped"] == 0
