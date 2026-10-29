"""기본은 로컬 점검만 수행합니다. --aws-readonly도 설정/로그 연결/일일 한도 조회만 합니다.

테스트 로그 기록, Lambda invoke, AI 호출, SNS 발송, Terraform 실행 기능은 없습니다.
"""

import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import zipfile
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READ_ACTIONS = {
    ("sts", "get-caller-identity"),
    ("lambda", "get-function-configuration"),
    ("sns", "list-subscriptions-by-topic"),
    ("logs", "describe-subscription-filters"),
    ("dynamodb", "get-item"),
}


def aws_json(region, *args):
    if tuple(args[:2]) not in READ_ACTIONS:
        raise ValueError("이 도구는 승인된 읽기 작업만 지원합니다.")
    env = dict(os.environ, AWS_MAX_ATTEMPTS="1", AWS_RETRY_MODE="standard")
    result = subprocess.run(
        ["aws", "--region", region, "--no-cli-pager", *args, "--output", "json"],
        check=False,
        capture_output=True,
        text=True,
        env=env,
        timeout=35,
    )
    if result.returncode:
        match = re.search(r"\(([^)]+)\) when calling", result.stderr)
        code = match.group(1) if match else "credentials_or_network_error"
        raise RuntimeError(f"AWS {args[0]} {args[1]} 실패: {code}")
    return json.loads(result.stdout) if result.stdout.strip() else {}


def local_settings():
    path = ROOT / "infra/terraform.tfvars"
    text = path.read_text() if path.exists() else ""

    def value(name, default=""):
        match = re.search(
            r"^\s*" + name + r'\s*=\s*("[^"\n]*"|true|false|-?\d+)\s*(?:#.*)?$',
            text,
            re.MULTILINE,
        )
        return json.loads(match.group(1)) if match else default

    mode_path = ROOT / "infra/interview.auto.tfvars.json"
    mode = (
        json.loads(mode_path.read_text()).get("interview_mode", "running")
        if mode_path.exists()
        else value("interview_mode", "running")
    )
    return {
        "account": value("aws_account_id"),
        "region": value("region", "ap-northeast-2"),
        "project": value("project", "dailybriefing"),
        "mode": mode,
        "local_daily_limit": value("daily_limit", 5),
        "model_matches_luna": value("model") == "gpt-6-luna",
        "reasoning_is_none": value("reasoning_effort") == "none",
    }


def zip_is_current():
    folder = ROOT / "lambda/aiops"
    try:
        with zipfile.ZipFile(folder / "build/aiops.zip") as archive:
            sources = list(folder.glob("*.py"))
            return bool(sources) and all(
                archive.read(p.name) == p.read_bytes() for p in sources
            )
    except (OSError, KeyError, zipfile.BadZipFile):
        return False


def check_cloud(settings, cases):
    region = settings["region"]
    identity = aws_json(region, "sts", "get-caller-identity")
    if not settings["account"] or identity["Account"] != settings["account"]:
        raise RuntimeError("AWS CLI 계정이 프로젝트 설정과 달라 중단합니다.")
    config = aws_json(
        region,
        "lambda",
        "get-function-configuration",
        "--function-name",
        settings["project"] + "-aiops",
    )
    env = config.get("Environment", {}).get("Variables", {})
    problems = []
    if settings["mode"] != "running":
        problems.append(
            "로컬 요청 모드가 running이 아닙니다. 실제 AWS 모드와 함께 확인하세요."
        )
    for key, expected in [
        ("PROCESSING_ENABLED", "true"),
        ("AI_ENABLED", "true"),
        ("GPT_MODEL", "gpt-6-luna"),
        ("GPT_REASONING_EFFORT", "none"),
    ]:
        if env.get(key) != expected:
            problems.append(key + " 설정이 테스트 조건과 다릅니다.")
    if not env.get("OPENAI_KEY_ARN"):
        problems.append("키 ARN이 배포 환경에 없습니다. 원문 키는 출력하지 않습니다.")
    if "HIGH" not in env.get("AI_SEVERITIES", "").split(","):
        problems.append("기본 합성 사례의 HIGH 심각도가 AI 대상에서 제외돼 있습니다.")
    archive = ROOT / "lambda/aiops/build/aiops.zip"
    code_matches = archive.exists() and base64.b64encode(
        hashlib.sha256(archive.read_bytes()).digest()
    ).decode() == config.get("CodeSha256")
    if not zip_is_current():
        problems.append(
            "로컬 ZIP이 현재 Python 소스와 다릅니다. ZIP을 먼저 다시 빌드하세요."
        )
    if not code_matches:
        problems.append(
            "배포 ZIP과 로컬 ZIP이 다릅니다. 새 진단 코드를 빌드/배포해야 합니다."
        )
    subscriptions = aws_json(
        region,
        "sns",
        "list-subscriptions-by-topic",
        "--topic-arn",
        env["SNS_TOPIC_ARN"],
    )
    confirmed = [
        x
        for x in subscriptions.get("Subscriptions", [])
        if x.get("Protocol") == "email"
        and x.get("SubscriptionArn", "").startswith("arn:")
    ]
    if len(confirmed) != 1:
        problems.append(
            "확정 이메일 구독이 정확히 1개인지 확인하세요. 주소는 출력하지 않습니다."
        )
    filters = aws_json(
        region,
        "logs",
        "describe-subscription-filters",
        "--log-group-name",
        "/" + settings["project"] + "/backend",
    )
    connected = any(
        f.get("destinationArn") == config["FunctionArn"]
        and "ERROR" in f.get("filterPattern", "")
        for f in filters.get("subscriptionFilters", [])
    )
    if not connected:
        problems.append("백엔드 ERROR 구독 연결을 확인하세요.")
    quotas = {}
    for kind, variable in [
        ("gpt", "DAILY_GPT_LIMIT"),
        ("notifications", "DAILY_NOTIFICATION_LIMIT"),
    ]:
        day = datetime.now(UTC).strftime("%Y-%m-%d")
        item = aws_json(
            region,
            "dynamodb",
            "get-item",
            "--table-name",
            env["STATE_TABLE"],
            "--key",
            json.dumps({"pk": {"S": f"quota#{kind}#{day}"}}),
            "--consistent-read",
        ).get("Item", {})
        used, limit = int(item.get("calls", {}).get("N", "0")), int(env[variable])
        quotas[kind] = {"used": used, "limit": limit, "remaining": max(0, limit - used)}
        if limit - used < cases:
            problems.append(
                f"{kind}: {cases}건 검증에 필요한 여유가 없습니다. 충전해도 이 카운터는 초기화되지 않습니다."
            )
    return {
        "ready_for_cases": not problems,
        "cases_requested": cases,
        "zip_matches": code_matches,
        "error_subscription_connected": connected,
        "confirmed_email_count": len(confirmed),
        "quotas": quotas,
        "blockers": problems,
        "openai_billing_and_model_access": "이 도구는 조회하지 않음. 실제 API 결과로 별도 검증 필요",
        "ai_or_email_calls_made_by_tool": 0,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--aws-readonly",
        action="store_true",
        help="실제 AWS 설정/한도 읽기 조회 허용. 테스트 로그나 AI 요청은 보내지 않음",
    )
    parser.add_argument("--cases", type=int, choices=[1, 2, 4, 6, 8], default=2)
    args = parser.parse_args(argv)
    try:
        settings = local_settings()
        if args.aws_readonly:
            result = check_cloud(settings, args.cases)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0 if result["ready_for_cases"] else 1
        print(
            json.dumps(
                {
                    k: v
                    for k, v in settings.items()
                    if k not in ("account", "region", "project")
                }
                | {
                    "package_matches_source": zip_is_current(),
                    "mode_of_check": "local-only",
                    "aws_calls": 0,
                    "ai_calls": 0,
                    "notice": "로컬 설정만 확인했습니다. 실제 준비 상태는 --aws-readonly로 별도 확인하세요.",
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    except (RuntimeError, ValueError, KeyError, OSError, subprocess.TimeoutExpired):
        # 응답 본문/환경변수/키/이메일은 오류에도 출력하지 않습니다.
        print(
            "사전 확인 실패: 계정·자격증명·리전·권한·배포 상태를 확인하세요. 민감 원문은 출력하지 않습니다."
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
