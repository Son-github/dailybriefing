"""AWS 호출 없이 트랜잭션의 조건 확인과 일괄 반영을 재현합니다."""

from copy import deepcopy
from threading import Lock
from botocore.exceptions import ClientError
from burst import decode, encode


def conflict():
    raise ClientError(
        {
            "Error": {"Code": "TransactionCanceledException"},
            "CancellationReasons": [{"Code": "ConditionalCheckFailed"}],
        },
        "TransactWriteItems",
    )


class FakeBurstClient:
    def __init__(self):
        self.rows = {}
        self.lock = Lock()

    def get_item(self, Key, **kwargs):
        with self.lock:
            return {"Item": encode(deepcopy(self.rows.get(decode(Key)["pk"], {})))}

    def transact_write_items(self, TransactItems):
        with self.lock:
            planned = deepcopy(self.rows)
            for operation in TransactItems:
                if "Put" in operation:
                    put = operation["Put"]
                    item = decode(put["Item"])
                    old = planned.get(item["pk"], {})
                    values = decode(put.get("ExpressionAttributeValues", {}))
                    condition = put["ConditionExpression"]
                    if condition == "#v=:version":
                        if old.get("version") != values[":version"]:
                            conflict()
                    elif old and not (
                        ":now" in values and old.get("expires_at", 0) <= values[":now"]
                    ):
                        conflict()
                    planned[item["pk"]] = item
                else:
                    update = operation["Update"]
                    row = planned.get(decode(update["Key"])["pk"], {})
                    if row.get("status") != "PENDING":
                        conflict()
                    values = decode(update["ExpressionAttributeValues"])
                    row["occurrences"] += values[":one"]
                    row["last_seen"] = values[":now"]
            self.rows = planned

    def update_item(self, Key, **kwargs):
        with self.lock:
            row = self.rows[decode(Key)["pk"]]
            if row["status"] != "PENDING":
                conflict()
            row["status"] = "SEALED"
            return {"Attributes": encode(deepcopy(row))}
