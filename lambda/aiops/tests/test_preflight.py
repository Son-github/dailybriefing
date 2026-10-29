from importlib.util import spec_from_file_location, module_from_spec
import base64
import hashlib
import json
from pathlib import Path
from unittest.mock import Mock
import pytest

SCRIPT = Path(__file__).resolve().parents[3] / "scripts/aiops_preflight.py"
spec = spec_from_file_location("aiops_preflight", SCRIPT)
preflight = module_from_spec(spec)
spec.loader.exec_module(preflight)


def fake_cloud(tmp_path, monkeypatch, used=4, limit=5):
    monkeypatch.setattr(preflight, "ROOT", tmp_path)
    monkeypatch.setattr(preflight, "zip_is_current", lambda: True)
    archive = tmp_path / "lambda/aiops/build/aiops.zip"
    archive.parent.mkdir(parents=True)
    archive.write_bytes(b"local-test-archive")
    env = dict(
        PROCESSING_ENABLED="true",
        AI_ENABLED="true",
        GPT_MODEL="gpt-6-luna",
        GPT_REASONING_EFFORT="none",
        AI_SEVERITIES="HIGH,CRITICAL",
        OPENAI_KEY_ARN="private-arn",
        SNS_TOPIC_ARN="private-topic",
        STATE_TABLE="state",
        DAILY_GPT_LIMIT=str(limit),
        DAILY_NOTIFICATION_LIMIT="20",
    )
    config = {
        "FunctionArn": "function",
        "CodeSha256": base64.b64encode(hashlib.sha256(archive.read_bytes()).digest()).decode(),
        "Environment": {"Variables": env},
    }
    calls = []

    def aws(region, *args):
        calls.append(tuple(args[:2]))
        action = tuple(args[:2])
        if action == ("sts", "get-caller-identity"):
            return {"Account": "expected"}
        if action == ("lambda", "get-function-configuration"):
            return config
        if action == ("sns", "list-subscriptions-by-topic"):
            return {
                "Subscriptions": [
                    {
                        "Protocol": "email",
                        "SubscriptionArn": "arn:subscription",
                        "Endpoint": "private@example.com",
                    }
                ]
            }
        if action == ("logs", "describe-subscription-filters"):
            return {
                "subscriptionFilters": [{"destinationArn": "function", "filterPattern": '"ERROR"'}]
            }
        return {"Item": {"calls": {"N": str(used)}}}

    monkeypatch.setattr(preflight, "aws_json", aws)
    settings = {
        "account": "expected",
        "region": "ap-northeast-2",
        "project": "dailybriefing",
        "mode": "running",
    }
    return settings, config, calls


def test_local_default_never_uses_aws_or_prints_private_settings(monkeypatch, capsys):
    monkeypatch.setattr(
        preflight,
        "local_settings",
        lambda: {"account": "private-account", "region": "x", "project": "y", "mode": "running"},
    )
    cloud = Mock()
    monkeypatch.setattr(preflight, "check_cloud", cloud)
    assert preflight.main([]) == 0
    cloud.assert_not_called()
    assert "private-account" not in capsys.readouterr().out


def test_insufficient_remaining_attempts_block_two_case_test(tmp_path, monkeypatch):
    settings, _, calls = fake_cloud(tmp_path, monkeypatch)
    result = preflight.check_cloud(settings, 2)
    assert not result["ready_for_cases"]
    assert result["quotas"]["gpt"]["remaining"] == 1
    assert any("카운터는 초기화되지 않습니다" in x for x in result["blockers"])
    assert all(call in preflight.READ_ACTIONS for call in calls)


def test_enough_quota_and_current_deployment_pass_without_secret_values(tmp_path, monkeypatch):
    settings, _, _ = fake_cloud(tmp_path, monkeypatch, limit=6)
    result = preflight.check_cloud(settings, 2)
    assert result["ready_for_cases"]
    assert result["ai_or_email_calls_made_by_tool"] == 0
    assert "private@example.com" not in json.dumps(result)
    assert "private-arn" not in json.dumps(result)


def test_wrong_account_stops_before_other_aws_reads(tmp_path, monkeypatch):
    settings, _, calls = fake_cloud(tmp_path, monkeypatch)
    settings["account"] = "other"
    with pytest.raises(RuntimeError):
        preflight.check_cloud(settings, 2)
    assert calls == [("sts", "get-caller-identity")]


def test_old_zip_or_wrong_reasoning_blocks_cloud_test(tmp_path, monkeypatch):
    settings, config, _ = fake_cloud(tmp_path, monkeypatch, limit=6)
    config["CodeSha256"] = "old"
    config["Environment"]["Variables"]["GPT_REASONING_EFFORT"] = "medium"
    result = preflight.check_cloud(settings, 2)
    assert not result["ready_for_cases"]
    assert not result["zip_matches"]
    assert any("GPT_REASONING_EFFORT" in x for x in result["blockers"])


def test_cli_wrapper_cannot_execute_aws_writes(monkeypatch):
    run = Mock()
    monkeypatch.setattr(preflight.subprocess, "run", run)
    for args in [
        ("logs", "put-log-events"),
        ("lambda", "invoke"),
        ("sns", "publish"),
        ("dynamodb", "update-item"),
    ]:
        with pytest.raises(ValueError):
            preflight.aws_json("ap-northeast-2", *args)
    run.assert_not_called()


def test_stale_local_zip_blocks_testing_even_if_old_cloud_zip_matches(tmp_path, monkeypatch):
    settings, _, _ = fake_cloud(tmp_path, monkeypatch, limit=6)
    monkeypatch.setattr(preflight, "zip_is_current", lambda: False)
    result = preflight.check_cloud(settings, 2)
    assert not result["ready_for_cases"]
    assert any("ZIP이 현재 Python 소스와 다릅니다" in message for message in result["blockers"])


@pytest.mark.parametrize("cases", [6, 8])
def test_six_or_eight_case_preflight_reads_only_after_explicit_flag(monkeypatch, cases):
    settings = {"account": "not-for-output"}
    monkeypatch.setattr(preflight, "local_settings", lambda: settings)
    cloud = Mock(return_value={"ready_for_cases": True})
    monkeypatch.setattr(preflight, "check_cloud", cloud)
    assert preflight.main(["--aws-readonly", "--cases", str(cases)]) == 0
    cloud.assert_called_once_with(settings, cases)
