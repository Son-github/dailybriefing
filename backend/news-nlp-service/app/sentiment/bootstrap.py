import os
import boto3
from urllib.parse import urlparse

def _parse_s3_uri(uri: str):
    u = urlparse(uri)
    if u.scheme != "s3":
        raise ValueError("MODEL_S3_URI must be s3://bucket/prefix")
    return u.netloc, u.path.lstrip("/")

def download_model_if_needed():
    s3_uri = os.getenv("MODEL_S3_URI", "").strip()
    local_dir = os.getenv("MODEL_LOCAL_DIR", "/models/sentiment")

    if not s3_uri:
        return

    os.makedirs(local_dir, exist_ok=True)

    bucket, prefix = _parse_s3_uri(s3_uri)
    s3 = boto3.client("s3")

    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/"):
                continue
            rel = key[len(prefix):].lstrip("/")
            dst = os.path.join(local_dir, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            s3.download_file(bucket, key, dst)
