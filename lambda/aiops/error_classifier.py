"""고정 코드/예외 클래스/상태 우선. 메시지만으로 원인을 확정하지 않습니다."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Classification:
    kind: str
    severity: str


def classify(incident):
    if incident.source == "ecs":
        return Classification(
            {
                "TaskFailedToStart": "ECS_TASK_START_FAILED",
                "EssentialContainerExited": "ECS_TASK_EXITED",
                "SERVICE_DEPLOYMENT_FAILED": "ECS_DEPLOYMENT_FAILED",
            }[incident.code],
            "CRITICAL",
        )
    if incident.code == "TIMEOUT" or incident.exception.endswith(
        ("SocketTimeoutException", "TimeoutException")
    ):
        return Classification("API_TIMEOUT", "HIGH")
    if incident.exception.endswith(
        (
            "SQLException",
            "SQLTransientConnectionException",
            "CannotCreateTransactionException",
            "DataAccessResourceFailureException",
            "JDBCConnectionException",
        )
    ):
        return Classification("DATABASE_CONNECTION_ERROR", "HIGH")
    if incident.code in ("PROVIDER_NOT_CONFIGURED",) or incident.exception.endswith(
        ("BeanCreationException", "BeanDefinitionStoreException")
    ):
        return Classification("CONFIGURATION_ERROR", "HIGH")
    if incident.code in (
        "PROVIDER_CONNECT",
        "PROVIDER_DNS",
        "PROVIDER_CONNECTION",
        "PROVIDER_TLS",
        "UPSTREAM_ERROR",
    ):
        return Classification("EXTERNAL_API_ERROR", "HIGH")
    if incident.status >= 500:
        return Classification("HTTP_SERVER_ERROR", "HIGH")
    return None
