"""배포 시 환경변수로만 제어합니다. 로컬 테스트는 이 파일이 SDK를 생성하지 않습니다."""

from dataclasses import dataclass
import os


def number(name, default, low, high):
    value = int(os.getenv(name, str(default)))
    if not low <= value <= high:
        raise ValueError(f"Invalid configuration: {name}")
    return value


@dataclass(frozen=True)
class Config:
    processing_enabled: bool = True
    ai_enabled: bool = False
    model: str = ""
    daily_limit: int = 5
    notification_limit: int = 20
    max_log_chars: int = 3000
    max_output_tokens: int = 700
    api_timeout: int = 10
    dedup_seconds: int = 1800
    lease_seconds: int = 75
    max_events: int = 20
    ai_severities: tuple = ("HIGH", "CRITICAL")
    service: str = "daily-briefing"
    cluster_arn: str = ""
    service_arn: str = ""
    service_name: str = "backend"
    topic_arn: str = ""
    table_name: str = ""
    key_arn: str = ""
    input_price: float = 0
    output_price: float = 0

    @classmethod
    def from_env(cls):
        value = cls(
            processing_enabled=os.getenv("PROCESSING_ENABLED", "true").lower() == "true",
            ai_enabled=os.getenv("AI_ENABLED", "false").lower() == "true",
            model=os.getenv("GPT_MODEL", ""),
            daily_limit=number("DAILY_GPT_LIMIT", 5, 0, 100),
            notification_limit=number("DAILY_NOTIFICATION_LIMIT", 20, 0, 100),
            max_log_chars=number("MAX_LOG_CHARS", 3000, 256, 8000),
            max_output_tokens=number("MAX_OUTPUT_TOKENS", 700, 128, 2000),
            api_timeout=number("GPT_TIMEOUT_SECONDS", 10, 1, 15),
            dedup_seconds=number("DEDUP_SECONDS", 1800, 60, 86400),
            max_events=number("MAX_EVENTS", 20, 1, 50),
            ai_severities=tuple(os.getenv("AI_SEVERITIES", "HIGH,CRITICAL").split(",")),
            service=os.getenv("SERVICE_NAME", "daily-briefing"),
            cluster_arn=os.getenv("ECS_CLUSTER_ARN", ""),
            service_arn=os.getenv("ECS_SERVICE_ARN", ""),
            service_name=os.getenv("ECS_SERVICE_NAME", "backend"),
            topic_arn=os.getenv("SNS_TOPIC_ARN", ""),
            table_name=os.getenv("STATE_TABLE", ""),
            key_arn=os.getenv("OPENAI_KEY_ARN", ""),
            input_price=float(os.getenv("INPUT_USD_PER_MILLION", "0")),
            output_price=float(os.getenv("OUTPUT_USD_PER_MILLION", "0")),
        )
        if value.ai_enabled and (not value.model or not value.key_arn):
            raise ValueError("AI requires GPT_MODEL and OPENAI_KEY_ARN")
        return value
