import json
import pytest
from event_parser import parse_event
from error_classifier import classify
from conftest import logs, plain


def test_gzip_batch_plain_json_and_ignore_info(config):
    event = logs(
        plain(),
        json.dumps(
            {
                "level": "ERROR",
                "message": "connection",
                "exception": "SQLException",
                "headers": {"Authorization": "never collect"},
            }
        ),
        plain(level="INFO"),
    )
    incidents = parse_event(event, config)
    assert len(incidents) == 2
    assert incidents[0].request_id == "req-123"
    assert classify(incidents[0]).kind == "API_TIMEOUT"
    assert classify(incidents[1]).kind == "DATABASE_CONNECTION_ERROR"
    assert "Authorization" not in repr(incidents)


@pytest.mark.parametrize(
    "event",
    [None, [], {}, {"awslogs": {}}, {"awslogs": {"data": "bad"}}, {"awslogs": {"data": "e30="}}],
)
def test_invalid_events(event, config):
    assert parse_event(event, config) == []


def test_control(config):
    assert parse_event(logs(plain(), message_type="CONTROL_MESSAGE"), config) == []


def ecs(config, code="TaskFailedToStart", exit_code=1):
    return {
        "source": "aws.ecs",
        "detail-type": "ECS Task State Change",
        "id": "event",
        "time": "now",
        "detail": {
            "clusterArn": config.cluster_arn,
            "group": "service:backend",
            "lastStatus": "STOPPED",
            "stopCode": code,
            "stoppedReason": "failure",
            "containers": [{"name": "backend", "exitCode": exit_code}],
        },
    }


@pytest.mark.parametrize("code", ["TaskFailedToStart", "EssentialContainerExited"])
def test_task_failure(config, code):
    result = parse_event(ecs(config, code), config)
    assert classify(result[0]).severity == "CRITICAL"


@pytest.mark.parametrize("code", ["UserInitiated", "ServiceSchedulerInitiated", "SpotInterruption"])
def test_normal_stop_excluded(config, code):
    assert parse_event(ecs(config, code), config) == []


def test_exit_zero_and_other_service_excluded(config):
    assert parse_event(ecs(config, "EssentialContainerExited", 0), config) == []
    event = ecs(config)
    event["detail"]["group"] = "service:other"
    assert parse_event(event, config) == []


def test_deployment_has_service_arn_but_no_cluster_in_detail(config):
    event = {
        "source": "aws.ecs",
        "detail-type": "ECS Deployment State Change",
        "resources": [config.service_arn],
        "detail": {"eventName": "SERVICE_DEPLOYMENT_FAILED", "reason": "failed"},
    }
    assert classify(parse_event(event, config)[0]).kind == "ECS_DEPLOYMENT_FAILED"
    event["detail"]["eventName"] = "SERVICE_DEPLOYMENT_COMPLETED"
    assert parse_event(event, config) == []


@pytest.mark.parametrize(
    "message,kind",
    [
        (
            "request_failed errorCode=PROVIDER_NOT_CONFIGURED httpStatus=503 exception=ApiException",
            "CONFIGURATION_ERROR",
        ),
        (
            "request_failed errorCode=PROVIDER_CONNECT httpStatus=502 exception=ApiException",
            "EXTERNAL_API_ERROR",
        ),
        (
            "request_failed errorCode=INTERNAL httpStatus=500 exception=NullPointerException",
            "HTTP_SERVER_ERROR",
        ),
    ],
)
def test_safe_scenarios(config, message, kind):
    assert classify(parse_event(logs(plain(message)), config)[0]).kind == kind


def test_gzip_expansion_limit(config):
    assert parse_event(logs(plain("x" * 2_100_000)), config) == []
