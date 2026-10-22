"""한국어 알림을 생성하고 SNS Publish만 수행합니다. 이메일 실제 수신은 별도 확인합니다."""

from log_sanitizer import sanitize

REASONS = {
    "DISABLED": "AI 분석 비활성화",
    "LIMIT": "일일 GPT 호출 제한 도달",
    "SEVERITY": "심각도 정책으로 분석 생략",
    "SUCCESS": "AI 분석 성공",
    "AUTHENTICATION": "AI 인증 실패",
    "TIMEOUT": "AI 시간 초과",
    "RATE_LIMIT": "AI 사용량 제한 응답",
    "REFUSAL": "AI 거부 응답",
    "INCOMPLETE": "AI 응답 길이/완료 상태 오류",
}


def notification(incident, classification, outcome):
    lines = [
        f"Daily Briefing 장애 알림 [{classification.severity}]",
        f"관측 시각: {incident.timestamp}",
        f"유형: {classification.kind}",
        f"위치: {incident.location}",
        f"Request ID: {incident.request_id or '없음'}",
        f"이벤트 ID: {incident.event_id}",
        f"로그 스트림: {incident.stream}",
        f"주요 메시지: {incident.message}",
        f"AI 상태: {REASONS.get(outcome.reason, 'AI 분석 실패 — 기본 알림')}",
        "아래 원인은 추정입니다. AWS 리소스를 실제 조회하거나 변경하지 않았습니다.",
    ]
    if outcome.analysis:
        for item in outcome.analysis["probable_causes"]:
            lines.append("원인 후보: " + item["cause"] + " / 근거: " + item["reason"])
        for key, label in [
            ("resources_to_check", "점검 리소스"),
            ("recommended_actions", "권장 점검/해결"),
            ("additional_checks", "추가 확인"),
        ]:
            lines.extend(label + ": " + x for x in outcome.analysis[key])
    else:
        lines += [
            "기본 점검: ECS 이벤트/CloudWatch 로그/최근 배포와 환경변수/DB SG 및 endpoint/외부 API 권한·timeout을 확인하세요."
        ]
    return {
        "subject": sanitize("[Daily Briefing] " + classification.kind, 100).replace("\n", " "),
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
