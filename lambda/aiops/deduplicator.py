"""DynamoDB 조건부 lease/TTL/원자적 quota. 테이블 장애는 fail-closed하여 GPT 호출을 막습니다."""

from datetime import datetime, timezone
import hashlib
import json
import re
import uuid


def fingerprint(incident, kind):
    value = "|".join(
        [incident.service, kind, incident.exception, incident.location, incident.message]
    )
    value = re.sub(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}\b", "<id>", value)
    value = re.sub(r"\b[0-9a-fA-F]{16,}\b", "<id>", value)
    value = re.sub(r"requestId=\S+", "requestId=<id>", value)
    value = re.sub(r"\d+", "#", value)
    return hashlib.sha256(value.encode()).hexdigest()


def conditional(error):
    return (
        getattr(error, "response", {}).get("Error", {}).get("Code")
        == "ConditionalCheckFailedException"
    )


class StateStore:
    def __init__(self, table, config, clock):
        self.table, self.config, self.clock = table, config, clock

    def claim(self, key, retention=None):
        now = int(self.clock())
        owner = uuid.uuid4().hex
        try:
            result = self.table.update_item(
                Key={"pk": "incident#" + key},
                UpdateExpression="SET #s=:processing, #o=:owner, lease_until=:lease, expires_at=:expires",
                ConditionExpression="attribute_not_exists(pk) OR expires_at <= :now OR #s=:retry OR (#s=:processing AND lease_until <= :now)",
                ExpressionAttributeNames={"#s": "status", "#o": "owner"},
                ExpressionAttributeValues={
                    ":processing": "PROCESSING",
                    ":retry": "RETRY",
                    ":owner": owner,
                    ":lease": now + self.config.lease_seconds,
                    ":expires": now + (retention or self.config.dedup_seconds),
                    ":now": now,
                },
                ReturnValues="ALL_OLD",
            )
            previous = result.get("Attributes", {})
            return "claimed", owner, previous if int(previous.get("expires_at", 0)) > now else {}
        except Exception as e:
            if not conditional(e):
                raise RuntimeError("State store unavailable") from None
            record = self.table.get_item(Key={"pk": "incident#" + key}, ConsistentRead=True).get(
                "Item", {}
            )
            return (
                ("duplicate" if record.get("status") in ("SENT", "SUPPRESSED") else "inflight"),
                "",
                {},
            )

    def quota(self, kind, limit):
        if limit <= 0:
            return False
        now = int(self.clock())
        day = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%d")
        try:
            self.table.update_item(
                Key={"pk": f"quota#{kind}#{day}"},
                UpdateExpression="SET expires_at=:expires ADD calls :one",
                ConditionExpression="attribute_not_exists(calls) OR calls < :limit",
                ExpressionAttributeValues={":one": 1, ":limit": limit, ":expires": now + 172800},
            )
            return True
        except Exception as e:
            if conditional(e):
                return False
            raise RuntimeError("Quota store unavailable") from None

    def update(self, key, owner, status, notification=None):
        expression = "SET #s=:status, lease_until=:zero"
        values = {":status": status, ":zero": 0, ":owner": owner}
        if notification is not None:
            # 정제된 이메일만 보관합니다. 원본 이벤트/로그/키는 저장하지 않습니다.
            expression += ", notification=:notification"
            values[":notification"] = json.dumps(notification, ensure_ascii=False)
        if status == "PROCESSING":
            expression = expression.replace("lease_until=:zero", "lease_until=:lease")
            values.pop(":zero")
            values[":lease"] = int(self.clock()) + self.config.lease_seconds
        self.table.update_item(
            Key={"pk": "incident#" + key},
            UpdateExpression=expression,
            ConditionExpression="#o=:owner",
            ExpressionAttributeNames={"#s": "status", "#o": "owner"},
            ExpressionAttributeValues=values,
        )
