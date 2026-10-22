import pytest
from event_parser import Incident
from log_sanitizer import sanitize, sanitize_incident
from deduplicator import fingerprint


@pytest.mark.parametrize(
    "text,secret",
    [
        ("password=hunter2", "hunter2"),
        ("api_key=private-value", "private-value"),
        ('{"client_secret":"hidden-value"}', "hidden-value"),
        ("Authorization: Bearer private-value", "private-value"),
        ("Cookie: refreshToken=private-value", "private-value"),
        ("serviceKey=decoded%2Bkey", "decoded%2Bkey"),
        ("eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiMSJ9.signature123", "signature123"),
        ("jdbc:postgresql://username:private-value@db:5432/app", "private-value"),
        ("email person@example.com phone 010-1234-5678", "person@example.com"),
        ("phone 010-1234-5678", "010-1234-5678"),
        ("id 900101-1234567", "900101-1234567"),
        ("address 192.168.10.4", "192.168.10.4"),
        ("/Users/person/project", "person"),
        ("AWS " + "AK" + "IA" + "A" * 16, "AK" + "IA" + "A" * 16),
    ],
)
def test_masks(text, secret):
    assert secret not in sanitize(text)


def test_stack_limit_and_total():
    incident = Incident(
        "logs",
        "service",
        "now",
        "id",
        "x" * 2000,
        stack="\n".join("at app.Function:123" for _ in range(100)),
    )
    result = sanitize_incident(incident, 500)
    assert len(result.message) + len(result.stack) <= 500
    assert len(result.stack.splitlines()) <= 5


def test_fingerprint_ignores_request_timestamp_and_numbers():
    a = Incident("logs", "service", "now", "1", "requestId=one failed 123", location="app:12")
    b = Incident("logs", "service", "later", "2", "requestId=two failed 456", location="app:98")
    assert fingerprint(a, "TIMEOUT") == fingerprint(b, "TIMEOUT")
