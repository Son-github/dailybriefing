"""한국어 알림을 생성하고 SNS Publish만 수행합니다. 이메일 실제 수신은 별도 확인합니다."""

from log_sanitizer import sanitize

REASONS = {
    "DISABLED": "AI 분석 비활성화",
    "LIMIT": "일일 GPT 호출 제한 도달",
    "SEVERITY": "심각도 정책으로 분석 생략",
    "SUCCESS": "AI 분석 성공",
    "AUTHENTICATION": "AI 인증 실패",
    "TIMEOUT": "AI 시간 초과",
    "RATE_LIMIT": "AI 호출 속도 제한 — 요청 간격 조정 필요",
    "UNKNOWN_429": "AI 429 응답 — 크레딧/한도/속도 원인 미확인",
    "CREDIT_EXHAUSTED": "OpenAI API 크레딧 부족",
    "QUOTA_EXHAUSTED": "OpenAI API 할당량 부족 — 결제/사용 한도 확인 필요",
    "ORG_SPEND_LIMIT": "OpenAI 조직 지출 한도 도달",
    "PROJECT_SPEND_LIMIT": "OpenAI 프로젝트 지출 한도 도달",
    "ORG_USAGE_LIMIT": "OpenAI 승인 사용 한도 도달",
    "PERMISSION_DENIED": "OpenAI API 접근 거절 — 프로젝트/모델/지역 권한 확인 필요",
    "MODEL_UNAVAILABLE": "OpenAI 요청 대상 없음 — 모델명/접근 권한 확인 필요",
    "REQUEST_TOO_LARGE": "AI 입력 길이 제한 초과",
    "SERVICE_OVERLOADED": "OpenAI 서비스 일시 과부하",
    "REFUSAL": "AI 거부 응답",
    "INCOMPLETE": "AI 응답 길이/완료 상태 오류",
    "INVALID_RESPONSE": "AI 응답 형식 오류",
    "API_FAILURE": "AI 요청 실패 — 모델 권한·서비스 상태 확인 필요",
}


AI_CHECKS = {
    "CREDIT_EXHAUSTED": "API 키가 속한 조직의 활성 크레딧·만료일·충전 반영을 확인하세요. 반복 호출로 해결되지 않습니다.",
    "QUOTA_EXHAUSTED": "API 키의 조직/프로젝트와 Billing의 크레딧·사용 한도를 확인하세요. 현재 정보만으로 잔액 0원이라고 단정하지 않습니다.",
    "ORG_SPEND_LIMIT": "조직의 지출 한도를 확인하세요. 예산을 검토한 뒤 변경 여부를 결정하세요.",
    "PROJECT_SPEND_LIMIT": "해당 프로젝트의 지출 한도를 확인하세요. 충전 잔액이 있어도 한도에 걸릴 수 있습니다.",
    "ORG_USAGE_LIMIT": "조직의 승인 사용 한도를 확인하고 필요한 경우 지원 절차를 확인하세요.",
    "RATE_LIMIT": "요청을 잠시 멈추고 표시된 대기 시간과 모델 RPM/TPM 및 다른 호출을 확인하세요.",
    "UNKNOWN_429": "세부 원인이 제공되지 않았습니다. 크레딧·프로젝트 한도·호출 속도를 함께 확인하고 반복 호출은 피하세요.",
    "SERVICE_OVERLOADED": "일시 과부하일 수 있습니다. 대기 시간과 서비스 상태를 확인한 뒤 재시험하세요.",
}


TITLES = {
    "API_TIMEOUT": "외부 API 응답 지연",
    "DATABASE_CONNECTION_ERROR": "데이터베이스 연결 오류",
    "CONFIGURATION_ERROR": "애플리케이션 설정 오류",
    "EXTERNAL_API_ERROR": "외부 API 호출 오류",
    "HTTP_SERVER_ERROR": "서버 내부 오류",
    "ECS_TASK_START_FAILED": "ECS 작업 시작 실패",
    "ECS_TASK_EXITED": "ECS 컨테이너 비정상 종료",
    "ECS_DEPLOYMENT_FAILED": "ECS 배포 실패",
}
CHECKS = {
    "API_TIMEOUT": [
        "외부 API 상태와 최근 응답 시간을 확인하세요.",
        "연결·응답 제한 시간과 재시도 설정을 확인하세요.",
    ],
    "DATABASE_CONNECTION_ERROR": [
        "RDS 상태와 DB endpoint·접속 설정을 확인하세요.",
        "ECS→RDS 보안 그룹과 연결 풀 사용량을 확인하세요.",
    ],
    "CONFIGURATION_ERROR": [
        "최근 배포에서 필수 환경변수가 빠졌는지 확인하세요.",
        "Parameter Store/Secret ARN과 읽기 권한을 확인하세요. 키 원문은 공유하지 마세요.",
    ],
    "EXTERNAL_API_ERROR": [
        "오류 코드로 DNS·TLS·인증·상위 서비스 응답 문제를 구분하세요.",
        "공급자 상태와 허용 도메인·API 권한을 확인하세요.",
    ],
    "HTTP_SERVER_ERROR": [
        "요청 번호로 서버 로그의 관련 예외를 확인하세요.",
        "최근 배포 변경과 같은 요청의 재현 조건을 확인하세요.",
    ],
}


def displayed_time(value):
    from datetime import datetime, timedelta, timezone

    try:
        moment = (
            datetime.fromtimestamp(value, timezone.utc)
            if isinstance(value, (int, float))
            else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        )
        if moment.tzinfo is None:
            return str(value) + " (시간대 미표기)"
        return moment.astimezone(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M:%S KST")
    except (ValueError, TypeError, OverflowError):
        return str(value) or "기록 없음"


def notification(incident, classification, outcome):
    title = TITLES.get(classification.kind, classification.kind)
    severity = {"HIGH": "높음", "CRITICAL": "긴급"}.get(
        classification.severity, classification.severity
    )
    analysis = outcome.analysis
    lines = [
        "Daily Briefing 장애 분석",
        "",
        "1. 한눈에 보기",
        f"오류: {title}",
        f"심각도: {severity} ({classification.severity})",
        f"발생 시각: {displayed_time(incident.timestamp)}",
        f"AI 상태: {REASONS.get(outcome.reason, 'AI 분석 실패 — 기본 알림')}",
    ]
    if getattr(outcome, "http_status", 0):
        lines.append(f"AI HTTP 상태: {outcome.http_status}")
    if getattr(outcome, "provider_error_code", ""):
        lines.append(f"AI 오류 코드: {outcome.provider_error_code}")
    if getattr(outcome, "retry_after_seconds", None):
        lines.append(
            f"제공된 재요청 대기 시간: 최소 {outcome.retry_after_seconds}초 (자동 재호출하지 않음)"
        )
    if outcome.reason in AI_CHECKS:
        lines.append("AI 연결 확인: " + AI_CHECKS[outcome.reason])
    if analysis:
        lines += [f"AI 요약: {analysis['error_type']}", "", "2. 원인 후보와 근거"]
        for i, item in enumerate(analysis["probable_causes"], 1):
            lines += [f"{i}) 원인 후보: {item['cause']}", f"   관측 근거: {item['reason']}"]
        if not analysis["probable_causes"]:
            lines.append("- 원인을 좁힐 증거가 부족합니다.")
        lines += ["", "3. 먼저 확인할 순서"]
        lines += [f"{i}. {item}" for i, item in enumerate(analysis["recommended_actions"], 1)]
        if not analysis["recommended_actions"]:
            lines.append("- 추가 로그를 확보한 뒤 점검 순서를 판단하세요.")
        lines += ["", "4. 점검 대상 / 추가로 필요한 정보"]
        lines += ["- 점검 대상: " + item for item in analysis["resources_to_check"]]
        lines += ["- 추가 확인: " + item for item in analysis["additional_checks"]]
    else:
        lines += ["", "2. 기본 점검 순서 (AI 분석 결과 아님)"]
        checks = CHECKS.get(
            classification.kind,
            ["ECS 이벤트와 CloudWatch 로그를 확인하세요.", "최근 배포와 실행 설정을 확인하세요."],
        )
        lines += [f"{i}. {item}" for i, item in enumerate(checks, 1)]
    lines += [
        "",
        "추정과 확인을 구분하세요",
        "원인은 후보이며 AWS 리소스를 직접 조회하거나 변경하지 않았습니다.",
        "",
        "원본 확인용 정보",
        f"분류: {classification.kind}",
        f"오류 코드: {incident.code or '기록 없음'} / HTTP 상태: {incident.status or '기록 없음'}",
        f"발생 위치: {incident.location or '기록 없음'}",
        f"요청 번호: {incident.request_id or '없음'}",
        f"이벤트 ID: {incident.event_id or '없음'}",
        f"로그 스트림: {incident.stream or '없음'}",
        f"오류 메시지: {incident.message}",
    ]
    return {
        "subject": sanitize(f"[Daily Briefing][{severity}] {title}", 100).replace("\n", " "),
        "message": sanitize("\n".join(lines), 12000),
    }


class Notifier:
    def __init__(self, client, topic):
        self.client, self.topic = client, topic

    def publish(self, message):
        # 캐시된 알림도 재마스킹합니다. 원문은 출력하지 않습니다.
        self.client.publish(
            TopicArn=self.topic,
            Subject=sanitize(message["subject"], 100).replace("\n", " "),
            Message=sanitize(message["message"], 12000),
        )


def burst_notification(row):
    return {
        "subject": "[Daily Briefing] 반복 오류 요약 · " + TITLES.get(row["kind"], row["kind"]),
        "message": (
            "Daily Briefing 반복 오류 요약\n\n"
            f"오류: {TITLES.get(row['kind'], row['kind'])}\n"
            f"개별 메일 대신 모은 오류: {row['occurrences']}회(10번째 오류 포함)\n\n"
            "집계 시간\n"
            f"- 시작: {displayed_time(int(row['first_seen']))}\n"
            f"- 종료: {displayed_time(int(row['until']))}\n"
            f"- 마지막 수신: {displayed_time(int(row['last_seen']))}\n\n"
            "집계 기준\n"
            "- 같은 오류가 수신 시각 기준 3분 안에 10회 발생해 집계로 전환했습니다.\n"
            "- 직전 9건은 개별 알림 대상이며 한도나 발송 실패로 미발송될 수 있습니다.\n"
            "- 횟수는 수집한 이벤트 기준이며 재전송은 제외합니다. 전체 실패 수가 아닙니다.\n"
            "- 이 메일은 복구 확인 알림이 아닙니다.\n\n"
            f"추적용 분류: {row['kind']}\n"
            f"오류 식별값: {row['fingerprint'][:16]}"
        ),
    }
