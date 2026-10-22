"""원본 HTTP body/headers/env를 수집하지 않고 허용된 장애 필드만 추출합니다."""

import base64
from dataclasses import dataclass
import io
import gzip
import json
import re


@dataclass
class Incident:
    source: str
    service: str
    timestamp: str
    event_id: str
    message: str
    level: str = "ERROR"
    exception: str = ""
    location: str = ""
    request_id: str = ""
    code: str = ""
    status: int = 0
    stream: str = ""
    stack: str = ""


PLAIN = re.compile(
    r"^(\S+)\s+(ERROR|WARN|INFO|DEBUG|TRACE)\s+requestId=(\S+)\s+(\S+)\s+-\s+(.*)", re.S
)


def parse_log(item, stream, service):
    text = str(item.get("message", ""))[:32000]
    fields = {}
    if text.lstrip().startswith("{"):
        try:
            raw = json.loads(text)
            if not isinstance(raw, dict):
                return None
            # 임의 JSON 필드/중첩 객체는 전달하지 않습니다.
            fields = {
                k: raw[k]
                for k in (
                    "level",
                    "message",
                    "timestamp",
                    "exception",
                    "requestId",
                    "logger",
                    "errorCode",
                    "httpStatus",
                    "stack_trace",
                )
                if isinstance(raw.get(k), (str, int))
            }
        except ValueError:
            return None
    else:
        match = PLAIN.match(text)
        if not match:
            return None
        ts, level, request, logger, message = match.groups()
        fields = dict(timestamp=ts, level=level, requestId=request, logger=logger, message=message)
    if str(fields.get("level")).upper() != "ERROR":
        return None
    message = str(fields.get("message", ""))

    def token(name):
        match = re.search(r"\b" + name + r"=([A-Za-z0-9_.$-]+)", message)
        return match.group(1) if match else ""

    status = str(fields.get("httpStatus", token("httpStatus")))
    exception = str(fields.get("exception", token("exception")))
    if not exception:
        match = re.search(r"\b([\w.$]+(?:Exception|Error))\b", message)
        exception = match.group(1) if match else ""
    return Incident(
        "logs",
        service,
        str(fields.get("timestamp", item.get("timestamp", ""))),
        str(item.get("id", "")),
        message,
        exception=exception,
        request_id=str(fields.get("requestId", "")),
        location=str(fields.get("logger", "")),
        code=str(fields.get("errorCode", token("errorCode"))),
        status=int(status) if status.isdigit() else 0,
        stream=str(stream),
        stack=str(fields.get("stack_trace", "")),
    )


def parse_event(event, config):
    if not isinstance(event, dict):
        return []
    if "awslogs" in event:
        try:
            compressed = base64.b64decode(event["awslogs"]["data"], validate=True)
            if len(compressed) > 1_500_000:
                return []
            # gzip bomb 방지. 유효하지 않거나 너무 큰 이벤트는 원문 출력 없이 제외합니다.
            with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as f:
                raw = f.read(2_000_001)
            if len(raw) > 2_000_000:
                return []
            data = json.loads(raw)
            if not isinstance(data, dict):
                return []
            if data.get("messageType") != "DATA_MESSAGE":
                return []
            items = data.get("logEvents", [])
            if not isinstance(items, list):
                return []
            return [
                incident
                for item in items
                if isinstance(item, dict)
                if (incident := parse_log(item, data.get("logStream", ""), config.service))
            ]
        except (ValueError, KeyError, TypeError, OSError, EOFError):
            return []
    if event.get("source") != "aws.ecs":
        return []
    d = event.get("detail", {})
    if not isinstance(d, dict) or not config.cluster_arn:
        return []
    kind = event.get("detail-type")
    if kind == "ECS Task State Change":
        if d.get("clusterArn") != config.cluster_arn:
            return []
        if d.get("group") != "service:" + config.service_name or d.get("lastStatus") != "STOPPED":
            return []
        code = d.get("stopCode", "")
        if code not in ("TaskFailedToStart", "EssentialContainerExited"):
            return []  # UserInitiated/ServiceSchedulerInitiated/정상 배포·축소 종료 제외
        containers = d.get("containers", [])
        if not isinstance(containers, list):
            return []
        if code == "EssentialContainerExited" and not any(
            c.get("name") == "backend" and c.get("exitCode", 0) != 0
            for c in containers
            if isinstance(c, dict)
        ):
            return []
        message = str(d.get("stoppedReason", ""))
        location = str(d.get("taskDefinitionArn", ""))
    elif kind == "ECS Deployment State Change":
        if (
            config.service_arn not in event.get("resources", [])
            or d.get("eventName") != "SERVICE_DEPLOYMENT_FAILED"
        ):
            return []
        code = "SERVICE_DEPLOYMENT_FAILED"
        message = str(d.get("reason", ""))
        location = config.service_name
    else:
        return []
    return [
        Incident(
            "ecs",
            config.service,
            str(event.get("time", "")),
            str(event.get("id", "")),
            message,
            code=code,
            location=location,
        )
    ]
