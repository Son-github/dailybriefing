from pathlib import Path
from types import SimpleNamespace
import json
import subprocess
import sys

import pytest
from event_parser import Incident, parse_event
from error_classifier import Classification, classify
from sns_notifier import notification, displayed_time

SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"


def test_mail_prioritizes_summary_and_actions_over_trace_ids():
    analysis = {
        "error_type": "DB 연결에 실패했습니다.",
        "probable_causes": [{"cause": "연결 경로 문제 가능성", "reason": "JDBC 예외가 기록됨"}],
        "recommended_actions": ["DB 상태를 확인하세요.", "접속 설정을 확인하세요."],
        "resources_to_check": ["RDS"],
        "additional_checks": ["연결 풀 지표가 더 필요합니다."],
    }
    incident = Incident(
        "logs",
        "svc",
        "2026-10-29T00:00:00Z",
        "event",
        "safe",
        request_id="request",
        code="INTERNAL",
        status=500,
    )
    result = notification(
        incident,
        Classification("DATABASE_CONNECTION_ERROR", "HIGH"),
        SimpleNamespace(analysis=analysis, reason="SUCCESS"),
    )
    text = result["message"]
    assert "데이터베이스 연결 오류" in result["subject"]
    assert text.index("1. 한눈에 보기") < text.index("2. 원인 후보와 근거")
    assert text.index("3. 먼저 확인할 순서") < text.index("원본 확인용 정보")
    assert "1. DB 상태를 확인하세요." in text and "2. 접속 설정을 확인하세요." in text
    assert "2026-10-29 09:00:00 KST" in text
    assert "요청 번호: request" in text and "HTTP 상태: 500" in text
    assert "AI 상태: AI 분석 성공" in text


def test_no_ai_output_is_not_presented_as_ai_analysis():
    result = notification(
        Incident("logs", "svc", "", "", "safe"),
        Classification("API_TIMEOUT", "HIGH"),
        SimpleNamespace(analysis=None, reason="LIMIT"),
    )
    text = result["message"]
    assert "일일 GPT 호출 제한 도달" in text
    assert "AI 분석 결과 아님" in text and "응답 시간" in text
    assert "원인 후보와 근거" not in text


def test_empty_analysis_and_sensitive_fields_stay_readable_and_masked():
    analysis = dict(
        error_type="확인 필요",
        probable_causes=[],
        recommended_actions=[],
        resources_to_check=[],
        additional_checks=[],
    )
    result = notification(
        Incident("logs", "svc", "now", "event", "password=private-value"),
        Classification("HTTP_SERVER_ERROR", "CRITICAL"),
        SimpleNamespace(analysis=analysis, reason="SUCCESS"),
    )
    assert "증거가 부족" in result["message"]
    assert "추가 로그를 확보" in result["message"]
    assert "private-value" not in result["message"]
    assert "[긴급]" in result["subject"]


@pytest.mark.parametrize("value", ["invalid", "", "2026-10-29T00:00:00"])
def test_time_without_timezone_is_not_silently_assumed_utc(value):
    assert "KST" not in displayed_time(value)


def test_all_synthetic_error_codes_have_expected_classification(config):
    sys.path.insert(0, str(SCRIPTS))
    from aiops_mock_event import SCENARIOS, generate

    assert len(SCENARIOS) == 9
    for name, case in SCENARIOS.items():
        incidents = parse_event(generate(name), config)
        assert len(incidents) == 1
        assert classify(incidents[0]).kind == case["expected"]
        assert case["checks"]


def test_case_suite_is_local_only_and_keeps_actual_ai_results_unverified(tmp_path):
    out = tmp_path / "cases"
    subprocess.run(
        [sys.executable, str(SCRIPTS / "aiops_test_cases.py"), "--output", str(out)], check=True
    )
    manifest = json.loads((out / "manifest.json").read_text())
    assert [x["scenario"] for x in manifest] == ["rds", "environment", "timeout", "http500"]
    assert all(x["actual_ai_result"] == "미검증" for x in manifest)
    assert "실제 AI 응답/실제 발송 결과 아님" in (out / "email-preview.txt").read_text()
    assert (out / "REPORT.md").exists()
    for item in manifest:
        assert "awslogs" in json.loads((out / (item["scenario"] + ".json")).read_text())
    again = subprocess.run(
        [sys.executable, str(SCRIPTS / "aiops_test_cases.py"), "--output", str(out)],
        capture_output=True,
    )
    assert again.returncode != 0


def test_credit_and_speed_limit_emails_give_different_next_actions():
    from gpt_analyzer import Outcome

    incident = Incident("logs", "service", "", "", "safe")
    classified = Classification("API_TIMEOUT", "HIGH")
    credit = notification(
        incident,
        classified,
        Outcome(
            reason="CREDIT_EXHAUSTED",
            http_status=429,
            provider_error_code="credit_balance_exhausted",
        ),
    )["message"]
    rate = notification(
        incident,
        classified,
        Outcome(
            reason="RATE_LIMIT",
            http_status=429,
            provider_error_code="rate_limit_exceeded",
            retry_after_seconds=17,
        ),
    )["message"]
    assert "크레딧 부족" in credit and "반복 호출로 해결되지 않습니다" in credit
    assert "최소 17초" in rate and "호출 속도 제한" in rate
    assert "AI HTTP 상태: 429" in credit and "AI 오류 코드: credit_balance_exhausted" in credit
