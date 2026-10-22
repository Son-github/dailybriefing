"""기본 테스트에서 AWS/OpenAI/SNS에 연결하는 실수를 즉시 차단합니다."""

import base64
import gzip
import json
import socket
import pytest
from dataclasses import replace
from config import Config


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def blocked(*args, **kwargs):
        raise AssertionError("External network is forbidden in local tests")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setenv("AWS_EC2_METADATA_DISABLED", "true")


@pytest.fixture
def config():
    return replace(
        Config(),
        cluster_arn="arn:cluster:test",
        service_arn="arn:service:test",
        topic_arn="arn:topic:test",
    )


def logs(*messages, message_type="DATA_MESSAGE"):
    data = {
        "messageType": message_type,
        "logStream": "ecs/backend/test",
        "logEvents": [
            {"id": str(i), "timestamp": 1, "message": msg} for i, msg in enumerate(messages)
        ],
    }
    return {
        "awslogs": {"data": base64.b64encode(gzip.compress(json.dumps(data).encode())).decode()}
    }


def plain(
    message="request_failed errorCode=TIMEOUT httpStatus=504 exception=ApiException", level="ERROR"
):
    return (
        "2026-10-22T09:00:00+09:00 "
        + level
        + " requestId=req-123 com.dailybriefing.common.Errors - "
        + message
    )
