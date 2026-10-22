"""정규식은 완전한 DLP가 아닙니다. allowlist 수집과 AI 기본 OFF를 함께 사용합니다."""

from dataclasses import fields, replace
import re

REDACTED = "[REDACTED]"
PATTERNS = [
    (r"(?im)^.*(?:authorization|cookie|set-cookie)\s*[:=].*$", "[REDACTED HEADER]"),
    (r"(?i)Bearer\s+[^\s,;\"']+", "Bearer " + REDACTED),
    (r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", REDACTED),
    (r"(?i)(?:https?|postgres(?:ql)?|mysql)://[^\s/@:]+:[^\s/@]+@", "[REDACTED CONNECTION]@"),
    (
        r"(?i)([\"']?(?:password|passwd|pwd|secret|client[_-]?secret|jwt[_-]?secret|api[_-]?key|serviceKey|authKey|access[_-]?token|refresh[_-]?token|token|aws[_-]?secret[_-]?access[_-]?key)[\"']?\s*[:=]\s*)(?:\"[^\"]*\"|'[^']*'|[^\s&,;}]+)",
        r"\1[REDACTED]",
    ),
    (r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b", REDACTED),
    (r"\bsk-[A-Za-z0-9_-]{8,}\b", REDACTED),
    (r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[REDACTED EMAIL]"),
    (r"(?<!\w)(?:\+82[- .]?)?0?1[016789][- .]?\d{3,4}[- .]?\d{4}(?!\w)", "[REDACTED PHONE]"),
    (r"\b\d{6}[- ]?[1-4]\d{6}\b", "[REDACTED PERSONAL ID]"),
    (r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "[REDACTED IP]"),
    (r"(?i)(?:/Users/|/home/)[^/\s]+", "/[REDACTED USER]"),
    (r"\b[A-Za-z0-9_+/=-]{40,}\b", "[REDACTED OPAQUE]"),
]


def sanitize(text, limit=3000):
    value = str(text)[:32000]
    for pattern, replacement in PATTERNS:
        value = re.sub(pattern, replacement, value)
    return value[:limit]


def sanitize_incident(incident, limit):
    # 원문 exception 인자/전체 stack 대신 주요 프레임 5개만 사용합니다.
    stack = "\n".join(
        line
        for line in incident.stack.splitlines()
        if line.strip().startswith(("at ", "Caused by:"))
    )
    values = {
        f.name: sanitize(getattr(incident, f.name), min(limit, 500))
        for f in fields(incident)
        if isinstance(getattr(incident, f.name), str)
    }
    values["message"] = sanitize(
        incident.message.splitlines()[0] if incident.message else "", limit
    )
    values["stack"] = sanitize("\n".join(stack.splitlines()[:5]), min(limit, 800))
    # message+stack의 합계에도 상한을 적용합니다.
    values["stack"] = values["stack"][: max(0, limit - len(values["message"]))]
    return replace(incident, **values)
