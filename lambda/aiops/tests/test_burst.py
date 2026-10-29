from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from unittest.mock import Mock
import json
import pytest
from botocore.exceptions import ClientError
from botocore.stub import Stubber
import boto3
from burst import BurstStore, SummaryScheduler, encode, event_key
from handler import process
from deduplicator import StateStore
from conftest import logs, plain
from fake_burst import FakeBurstClient
from test_state_handler import FakeTable


def setup(config):
    now = [1800000000]
    client = FakeBurstClient()
    burst = BurstStore(client, "test", lambda: now[0])
    state = StateStore(FakeTable(), config, lambda: now[0])
    scheduler, notifier, analyzer = Mock(), Mock(), Mock()
    return now, client, burst, state, scheduler, notifier, analyzer


def deliver(env, config, event):
    _, _, burst, state, scheduler, notifier, analyzer = env
    return process(event, config, state, analyzer, notifier, burst=burst, scheduler=scheduler)


def log_event(index, message=None):
    event = logs(plain(message) if message else plain())
    import base64
    import gzip

    data = json.loads(gzip.decompress(base64.b64decode(event["awslogs"]["data"])))
    data["logEvents"][0]["id"] = f"provider-event-{index}"
    event["awslogs"]["data"] = base64.b64encode(gzip.compress(json.dumps(data).encode())).decode()
    return event


def test_tenth_event_starts_single_burst_and_summary_counts(config):
    env = setup(config)
    for i in range(12):
        deliver(env, config, log_event(i))
    now, client, burst, state, scheduler, notifier, analyzer = env
    assert notifier.publish.call_count == 9
    assert scheduler.ensure.call_count == 3
    bucket, until = scheduler.ensure.call_args.args
    assert burst.get(bucket)["occurrences"] == 3
    assert until == now[0] + 600
    analyzer.analyze.assert_not_called()
    now[0] += 600
    assert deliver(env, config, {"aiops_summary": True, "bucket": bucket})["summary_published"]
    assert notifier.publish.call_count == 10
    assert "3회" in notifier.publish.call_args.args[0]["message"]
    assert burst.get(bucket)["status"] == "SEALED"
    assert deliver(env, config, {"aiops_summary": True, "bucket": bucket})["summary_duplicate"]
    assert notifier.publish.call_count == 10


def test_exact_rolling_three_minute_boundary(config):
    env = setup(config)
    now, _, burst, *_ = env
    for i in range(9):
        assert burst.accept("group", str(i), "API_TIMEOUT")["mode"] == "immediate"
    now[0] += 180
    assert burst.accept("group", "tenth", "API_TIMEOUT")["mode"] == "aggregate"
    env = setup(config)
    now, _, burst, *_ = env
    for i in range(9):
        burst.accept("group", str(i), "API_TIMEOUT")
    now[0] += 181
    assert burst.accept("group", "after-window", "API_TIMEOUT")["mode"] == "immediate"


def test_sliding_window_is_not_fixed_three_minute_buckets(config):
    env = setup(config)
    now, _, burst, *_ = env
    for i in range(5):
        burst.accept("group", str(i), "API_TIMEOUT")
    now[0] += 179
    for i in range(5, 10):
        result = burst.accept("group", str(i), "API_TIMEOUT")
    assert result["mode"] == "aggregate"


def test_transport_redelivery_does_not_count_as_new_occurrence(config):
    env = setup(config)
    for i in range(10):
        deliver(env, config, log_event(i))
    bucket, _ = env[4].ensure.call_args.args
    assert deliver(env, config, log_event(9))["duplicate"] == 1
    assert env[2].get(bucket)["occurrences"] == 1
    # State lease 만료 후에도 receipt가 남아 있으므로 집계는 늘지 않습니다.
    env[0][0] += 1900
    deliver(env, config, log_event(9))
    assert env[2].get(bucket)["occurrences"] == 1


def test_schedule_failure_retries_without_double_count(config):
    env = setup(config)
    for i in range(9):
        deliver(env, config, log_event(i))
    env[4].ensure.side_effect = [RuntimeError("offline"), None]
    with pytest.raises(RuntimeError):
        deliver(env, config, log_event(9))
    deliver(env, config, log_event(9))
    bucket, _ = env[4].ensure.call_args.args
    assert env[2].get(bucket)["occurrences"] == 1
    assert env[5].publish.call_count == 9


def test_new_window_does_not_overwrite_pending_old_summary(config):
    env = setup(config)
    for i in range(10):
        deliver(env, config, log_event(i))
    old_bucket, _ = env[4].ensure.call_args.args
    env[0][0] += 601
    for i in range(10, 20):
        deliver(env, config, log_event(i))
    new_bucket, _ = env[4].ensure.call_args.args
    assert new_bucket != old_bucket
    deliver(env, config, {"aiops_summary": True, "bucket": old_bucket})
    assert env[2].get(old_bucket)["status"] == "SEALED"
    assert env[2].get(new_bucket)["status"] == "PENDING"


def test_summary_sns_retry_reuses_snapshot_and_quota(config):
    env = setup(config)
    for i in range(10):
        deliver(env, config, log_event(i))
    bucket, _ = env[4].ensure.call_args.args
    env[0][0] += 600
    env[5].publish.side_effect = [RuntimeError("SNS failed"), None]
    summary = {"aiops_summary": True, "bucket": bucket}
    with pytest.raises(RuntimeError):
        deliver(env, config, summary)
    message = env[5].publish.call_args.args[0]
    deliver(env, config, summary)
    assert env[5].publish.call_args.args[0] == message
    assert next(r["calls"] for k, r in env[3].table.items.items() if k.startswith("quota#")) == 10


def test_summary_quota_and_maintenance_are_honored(config):
    env = setup(config)
    for i in range(10):
        deliver(env, config, log_event(i))
    bucket, _ = env[4].ensure.call_args.args
    env[0][0] += 600
    summary = {"aiops_summary": True, "bucket": bucket}
    assert deliver(env, replace(config, processing_enabled=False), summary) == {"maintenance": True}
    assert deliver(env, replace(config, notification_limit=9), summary)["summary_limited"]
    assert env[5].publish.call_count == 9


def test_separate_error_groups_do_not_share_threshold(config):
    env = setup(config)
    for i in range(9):
        deliver(env, config, log_event(i))
    deliver(env, config, log_event(99, "errorCode=INTERNAL httpStatus=500 exception=OtherError"))
    assert env[5].publish.call_count == 10
    env[4].ensure.assert_not_called()


def test_atomic_parallel_accepts_keep_receipt_and_count_consistent(config):
    env = setup(config)
    burst = env[2]
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda i: burst.accept("group", str(i), "API_TIMEOUT"), range(25)))
    assert sum(r["mode"] == "immediate" for r in results) == 9
    bucket = next(r["bucket"] for r in results if r["mode"] == "aggregate")
    assert burst.get(bucket)["occurrences"] == 16
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda i: burst.accept("group", str(i), "API_TIMEOUT"), range(25)))
    assert burst.get(bucket)["occurrences"] == 16


def test_early_summary_retries_and_expired_summary_is_suppressed(config):
    env = setup(config)
    for i in range(10):
        deliver(env, config, log_event(i))
    bucket, _ = env[4].ensure.call_args.args
    with pytest.raises(RuntimeError):
        deliver(env, config, {"aiops_summary": True, "bucket": bucket})
    env[0][0] += 172801
    assert deliver(env, config, {"aiops_summary": True, "bucket": bucket})["summary_expired"]


def test_state_failure_does_not_call_ai_or_email(config):
    env = setup(config)
    env[2].client = Mock()
    env[2].client.get_item.side_effect = RuntimeError("private state error")
    with pytest.raises(RuntimeError):
        deliver(env, replace(config, ai_enabled=True), log_event(1))
    env[5].publish.assert_not_called()
    env[6].analyze.assert_not_called()


def test_missing_provider_id_has_stable_fallback(config):
    from event_parser import Incident

    incident = Incident("logs", "svc", "now", "", "safe")
    assert event_key(incident) == event_key(incident)
    assert event_key(incident) != event_key(replace(incident, timestamp="later"))


def test_scheduler_only_creates_at_schedule_and_deletes_after_execution(config):
    client = Mock()
    client.get_schedule.side_effect = ClientError(
        {"Error": {"Code": "ResourceNotFoundException"}}, "GetSchedule"
    )
    config = replace(
        config, schedule_group="group", schedule_role_arn="role", function_arn="function"
    )
    scheduler = SummaryScheduler(client, config, lambda: 100)
    scheduler.ensure("bucket#safe", 700)
    request = client.create_schedule.call_args.kwargs
    assert request["ScheduleExpression"].startswith("at(")
    assert request["ActionAfterCompletion"] == "DELETE"
    assert request["FlexibleTimeWindow"] == {"Mode": "OFF"}
    assert json.loads(request["Target"]["Input"]) == {
        "aiops_summary": True,
        "bucket": "bucket#safe",
    }
    client.get_schedule.side_effect = None
    scheduler.ensure("bucket#safe", 700)
    assert client.create_schedule.call_count == 1


def test_dynamodb_request_shape_using_actual_botocore_stubber(config):
    client = boto3.client(
        "dynamodb",
        region_name="ap-northeast-2",
        aws_access_key_id="test",
        aws_secret_access_key="test",
    )
    with Stubber(client) as stub:
        stub.add_response(
            "get_item",
            {},
            {"TableName": "test", "Key": encode({"pk": "receipt#id"}), "ConsistentRead": True},
        )
        stub.add_response(
            "get_item",
            {},
            {
                "TableName": "test",
                "Key": encode({"pk": "burst-group#group"}),
                "ConsistentRead": True,
            },
        )
        stub.add_response("transact_write_items", {})
        assert (
            BurstStore(client, "test", lambda: 100).accept("group", "id", "API_TIMEOUT")["mode"]
            == "immediate"
        )
        stub.assert_no_pending_responses()


def test_same_error_distinct_events_send_individual_mail_and_obey_ai_quota(config):
    from gpt_analyzer import Outcome

    config = replace(config, ai_enabled=True, daily_limit=1)
    env = setup(config)
    env[6].analyze.return_value = Outcome(reason="SUCCESS")
    for i in range(3):
        deliver(env, config, log_event(i))
    assert env[5].publish.call_count == 3
    assert env[6].analyze.call_count == 1
    assert "일일 GPT 호출 제한" in env[5].publish.call_args.args[0]["message"]


def test_individual_mail_failure_retry_keeps_burst_count_and_cached_analysis(config):
    from gpt_analyzer import Outcome

    config = replace(config, ai_enabled=True)
    env = setup(config)
    env[6].analyze.return_value = Outcome(reason="SUCCESS")
    env[5].publish.side_effect = [RuntimeError("SNS unavailable"), None]
    with pytest.raises(RuntimeError):
        deliver(env, config, log_event(1))
    deliver(env, config, log_event(1))
    group = next(v for k, v in env[1].rows.items() if k.startswith("burst-group#"))
    assert len(group["recent"]) == 1
    assert env[6].analyze.call_count == 1


def test_cloudwatch_batch_keeps_ten_distinct_errors_instead_of_collapsing_them(config):
    env = setup(config)
    result = deliver(env, config, logs(*([plain()] * 10)))
    assert result["published"] == 9 and result["aggregated"] == 1
    assert result["duplicate"] == 0


def test_scheduler_payload_matches_botocore_request_schema(config):
    client = boto3.client(
        "scheduler",
        region_name="ap-northeast-2",
        aws_access_key_id="test",
        aws_secret_access_key="test",
    )
    config = replace(
        config,
        schedule_group="dailybriefing-aiops-summary",
        schedule_role_arn="arn:aws:iam::123456789012:role/summary",
        function_arn="arn:aws:lambda:ap-northeast-2:123456789012:function:analyzer",
    )
    with Stubber(client) as stub:
        stub.add_client_error("get_schedule", service_error_code="ResourceNotFoundException")
        stub.add_response(
            "create_schedule",
            {"ScheduleArn": "arn:aws:scheduler:ap-northeast-2:123456789012:schedule/group/name"},
        )
        SummaryScheduler(client, config, lambda: 100).ensure("bucket#safe", 700)
        stub.assert_no_pending_responses()


def test_scheduler_permissions_failure_is_not_acknowledged(config):
    client = Mock()
    client.get_schedule.side_effect = ClientError(
        {"Error": {"Code": "AccessDeniedException"}}, "GetSchedule"
    )
    with pytest.raises(RuntimeError, match="lookup failed"):
        SummaryScheduler(client, config).ensure("bucket#safe", 1000)
    client.create_schedule.assert_not_called()


def test_cli_fixture_generates_distinct_current_events_for_burst_test():
    import base64
    import gzip
    from pathlib import Path
    import subprocess
    import sys

    script = Path(__file__).resolve().parents[3] / "scripts/aiops_mock_event.py"
    outputs = [
        json.loads(
            subprocess.check_output([sys.executable, str(script), "timeout", "--count", "12"])
        )
        for _ in range(2)
    ]
    batches = [
        json.loads(gzip.decompress(base64.b64decode(out["awslogs"]["data"]))) for out in outputs
    ]
    ids = [{e["id"] for e in batch["logEvents"]} for batch in batches]
    assert len(ids[0]) == 12 and len(ids[1]) == 12 and ids[0].isdisjoint(ids[1])
    assert "ERROR" in batches[0]["logEvents"][0]["message"]
    assert (
        subprocess.run(
            [sys.executable, str(script), "timeout", "--count", "51"], capture_output=True
        ).returncode
        != 0
    )
