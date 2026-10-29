"""3분 이동 구간의 10번째 오류부터 10분 집계. 수신 확인과 집계를 한 트랜잭션으로 기록합니다."""

from datetime import datetime, timezone
import hashlib
import json
import time
from boto3.dynamodb.types import TypeSerializer, TypeDeserializer

SERIALIZER, DESERIALIZER = TypeSerializer(), TypeDeserializer()


def encode(item):
    return {k: SERIALIZER.serialize(v) for k, v in item.items()}


def decode(item):
    return {k: DESERIALIZER.deserialize(v) for k, v in item.items()}


def event_key(incident):
    # CloudWatch 재전송은 같은 ID, 서로 다른 실제 오류는 별개 ID입니다.
    # 공급자 ID가 없는 합성 이벤트에만 시각/메시지로 대체합니다. 원문은 저장하지 않습니다.
    identity = incident.event_id or (incident.timestamp + "|" + incident.message)
    value = "|".join([incident.source, incident.service, incident.stream, identity])
    return hashlib.sha256(value.encode()).hexdigest()


class BurstStore:
    def __init__(self, client, table, clock=time.time):
        self.client, self.table, self.clock = client, table, clock

    def get(self, key):
        return decode(
            self.client.get_item(
                TableName=self.table, Key=encode({"pk": key}), ConsistentRead=True
            ).get("Item", {})
        )

    def put(self, item, **conditions):
        return {"Put": {"TableName": self.table, "Item": encode(item), **conditions}}

    def accept(self, group, identity, kind):
        """재전송은 같은 판단을 반환하며 집계 횟수를 늘리지 않습니다. 경합은 제한 횟수만 재시도합니다."""
        receipt_key, group_key = "receipt#" + identity, "burst-group#" + group
        for _ in range(8):
            now = int(self.clock())
            receipt = self.get(receipt_key)
            if receipt and int(receipt["expires_at"]) > now:
                return json.loads(receipt["decision"])
            old = self.get(group_key)
            recent = [int(t) for t in old.get("recent", []) if int(t) >= now - 180]
            row = {
                "pk": group_key,
                "version": int(old.get("version", 0)) + 1,
                "recent": recent,
                "expires_at": now + 172800,
            }
            bucket = None
            if int(old.get("until", 0)) > now:
                row.update(bucket=old["bucket"], until=int(old["until"]))
                decision = {"mode": "aggregate", "bucket": row["bucket"], "until": row["until"]}
                bucket = {
                    "Update": {
                        "TableName": self.table,
                        "Key": encode({"pk": row["bucket"]}),
                        "UpdateExpression": "SET last_seen=:now ADD occurrences :one",
                        "ConditionExpression": "#s=:pending",
                        "ExpressionAttributeNames": {"#s": "status"},
                        "ExpressionAttributeValues": encode(
                            {":now": now, ":one": 1, ":pending": "PENDING"}
                        ),
                    }
                }
            elif len(recent) >= 9:
                key = "bucket#" + group + "-" + identity[:16]
                row.update(bucket=key, until=now + 600, recent=[])
                decision = {"mode": "aggregate", "bucket": key, "until": now + 600}
                bucket = self.put(
                    {
                        "pk": key,
                        "kind": kind,
                        "fingerprint": group,
                        "first_seen": now,
                        "last_seen": now,
                        "until": now + 600,
                        "occurrences": 1,
                        "trigger_count": 10,
                        "status": "PENDING",
                        "expires_at": now + 172800,
                    },
                    ConditionExpression="attribute_not_exists(pk)",
                )
            else:
                row["recent"] = (recent + [now])[-9:]
                decision = {"mode": "immediate"}
            # 이전 집계가 끝나면 새 구간을 시작합니다. 버킷은 별도 항목으로 남아 늦은 요약도 안전합니다.
            group_condition = (
                {"ConditionExpression": "attribute_not_exists(pk)"}
                if not old
                else {
                    "ConditionExpression": "#v=:version",
                    "ExpressionAttributeNames": {"#v": "version"},
                    "ExpressionAttributeValues": encode({":version": old["version"]}),
                }
            )
            writes = [
                self.put(
                    {
                        "pk": receipt_key,
                        "decision": json.dumps(decision),
                        "expires_at": now + 172800,
                    },
                    ConditionExpression="attribute_not_exists(pk) OR expires_at <= :now",
                    ExpressionAttributeValues=encode({":now": now}),
                ),
                self.put(row, **group_condition),
            ]
            if bucket:
                writes.append(bucket)
            try:
                self.client.transact_write_items(TransactItems=writes)
                return decision
            except Exception as e:
                code = getattr(e, "response", {}).get("Error", {}).get("Code")
                if code not in ("TransactionCanceledException", "TransactionConflictException"):
                    raise RuntimeError("Burst state unavailable") from None
                if code == "TransactionCanceledException":
                    reasons = e.response.get("CancellationReasons", [])
                    if any(
                        r.get("Code")
                        not in ("None", "ConditionalCheckFailed", "TransactionConflict")
                        for r in reasons
                    ):
                        raise RuntimeError("Burst transaction failed") from None
        raise RuntimeError("Burst state contention; retry delivery")

    def seal(self, key):
        """집계 종료 시 스냅샷을 고정합니다. 그 이후 트랜잭션은 이 버킷을 갱신하지 못합니다."""
        row = self.get(key)
        if not row or int(row["expires_at"]) <= int(self.clock()):
            return None
        if int(self.clock()) < int(row["until"]):
            raise RuntimeError("Summary is not due")
        if row["status"] == "PENDING":
            result = self.client.update_item(
                TableName=self.table,
                Key=encode({"pk": key}),
                UpdateExpression="SET #s=:sealed",
                ConditionExpression="#s=:pending",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues=encode({":sealed": "SEALED", ":pending": "PENDING"}),
                ReturnValues="ALL_NEW",
            )
            return decode(result["Attributes"])
        return row


class SummaryScheduler:
    def __init__(self, client, config, clock=time.time):
        self.client, self.config, self.clock = client, config, clock

    def ensure(self, bucket, until):
        # 민감정보/로그를 스케줄에 넣지 않습니다. 이름·토큰은 버킷마다 고정합니다.
        name = "burst-" + hashlib.sha256(bucket.encode()).hexdigest()[:48]
        # Scheduler의 분 단위 정밀도로 인해 집계 종료 전에 실행되지 않도록 올림합니다.
        due = ((max(until, int(self.clock()) + 60) + 59) // 60) * 60
        moment = datetime.fromtimestamp(due, timezone.utc)
        try:
            self.client.get_schedule(Name=name, GroupName=self.config.schedule_group)
            return
        except Exception as e:
            if (
                getattr(e, "response", {}).get("Error", {}).get("Code")
                != "ResourceNotFoundException"
            ):
                raise RuntimeError("Summary schedule lookup failed") from None
        try:
            self.client.create_schedule(
                Name=name,
                GroupName=self.config.schedule_group,
                ClientToken=name,
                ScheduleExpression="at(" + moment.strftime("%Y-%m-%dT%H:%M:%S") + ")",
                ScheduleExpressionTimezone="UTC",
                FlexibleTimeWindow={"Mode": "OFF"},
                ActionAfterCompletion="DELETE",
                Target={
                    "Arn": self.config.function_arn,
                    "RoleArn": self.config.schedule_role_arn,
                    "Input": json.dumps({"aiops_summary": True, "bucket": bucket}),
                    "RetryPolicy": {"MaximumEventAgeInSeconds": 3600, "MaximumRetryAttempts": 2},
                },
            )
        except Exception as e:
            if getattr(e, "response", {}).get("Error", {}).get("Code") != "ConflictException":
                raise RuntimeError("Summary scheduling failed") from None
            # 동일 예약은 재전송으로 인한 정상 중복입니다. 실패는 수집 Lambda 재시도로 복구합니다.
