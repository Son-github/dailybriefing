"""두 감지 경로의 공통 처리. 실제 SNS 실패만 안전한 예외로 재시도하며 원본 이벤트는 로그에 남기지 않습니다."""

import json
import time
from datetime import datetime
from config import Config
from event_parser import parse_event
from log_sanitizer import sanitize_incident
from error_classifier import classify
from deduplicator import StateStore, fingerprint
from gpt_analyzer import Analyzer, Outcome, client_factory
from sns_notifier import Notifier, notification


def metric(name, **values):
    # 허용한 숫자/고정 상태만 기록합니다. 이벤트/예외 객체/본문은 금지합니다.
    print(json.dumps({"metric": name, "at": time.time(), **values}))


def process(event, config, state, analyzer, notifier, context=None):
    if not config.processing_enabled:
        return {"maintenance": True}
    incidents = parse_event(event, config)
    counts = dict(
        parsed=len(incidents),
        duplicate=0,
        published=0,
        skipped=0,
        batch_dropped=0,
    )
    retry = False
    metric("received", received_at=time.time(), parsed=len(incidents))
    candidates = []
    seen = set()
    for raw in incidents:
        incident = sanitize_incident(raw, config.max_log_chars)
        classification = classify(incident)
        if not classification:
            counts["skipped"] += 1
            continue
        key = fingerprint(incident, classification.kind)
        if key in seen:
            counts["duplicate"] += 1
            continue
        seen.add(key)
        candidates.append((incident, classification, key))
    counts["batch_dropped"] = max(0, len(candidates) - config.max_events)
    for incident, classification, key in candidates[: config.max_events]:
        try:
            observed_at = datetime.fromisoformat(
                incident.timestamp.replace("Z", "+00:00")
            ).timestamp()
        except (ValueError, OverflowError):
            observed_at = None
        metric("incident", observed_at=observed_at, fingerprint=key, kind=classification.kind)
        result, owner, record = state.claim(key)
        if result == "duplicate":
            counts["duplicate"] += 1
            continue
        if result == "inflight":
            retry = True
            continue
        try:
            cached = record.get("notification")
            if cached:
                message = json.loads(cached)
            else:
                # SNS도 일일 제한. 분석 이전에 예약해 불필요한 GPT 비용을 막습니다.
                if not state.quota("notifications", config.notification_limit):
                    state.update(key, owner, "SUPPRESSED")
                    counts["skipped"] += 1
                    metric("notification_limit")
                    continue
                outcome = Outcome(reason="DISABLED")
                if config.ai_enabled:
                    if classification.severity not in config.ai_severities:
                        outcome = Outcome(reason="SEVERITY")
                    elif (
                        context
                        and context.get_remaining_time_in_millis()
                        < (config.api_timeout + 20) * 1000
                    ):
                        outcome = Outcome(reason="TIMEOUT")
                    elif state.quota("gpt", config.daily_limit):
                        started = time.time()
                        outcome = analyzer.analyze(incident, classification)
                        metric(
                            "gpt",
                            started_at=started,
                            ended_at=time.time(),
                            result=outcome.reason,
                            fingerprint=key,
                            usage_reported=outcome.usage_reported,
                            input_tokens=outcome.input_tokens,
                            output_tokens=outcome.output_tokens,
                            estimated_usd=(
                                outcome.input_tokens * config.input_price
                                + outcome.output_tokens * config.output_price
                            )
                            / 1e6
                            if outcome.usage_reported and config.input_price and config.output_price
                            else None,
                        )
                    else:
                        outcome = Outcome(reason="LIMIT")
                message = notification(incident, classification, outcome)
                state.update(key, owner, "PROCESSING", message)
            notifier.publish(message)
            state.update(key, owner, "SENT")
            counts["published"] += 1
            metric("sns_published", fingerprint=key, email_received="NOT_VERIFIED")
        except Exception:
            # SNS/상태 갱신 장애는 같은 정규화 키로 재시도합니다. 알림 캐시가 있으면 GPT를 재호출하지 않습니다.
            state.update(key, owner, "RETRY")
            metric("notification_failed")
            retry = True
    metric("batch", **counts)
    if retry:
        raise RuntimeError("AIOps delivery pending; retry safely") from None
    return counts


def lambda_handler(event, context):
    try:
        import boto3
        from botocore.config import Config as SDKConfig

        config = Config.from_env()
        # SDK는 실제 Lambda 호출 시에만 생성합니다. import/test에는 네트워크 부수효과가 없습니다.
        session = boto3.session.Session()
        sdk = SDKConfig(connect_timeout=2, read_timeout=3, retries={"total_max_attempts": 1})
        state = StateStore(
            session.resource("dynamodb", config=sdk).Table(config.table_name), config, time.time
        )
        analyzer = Analyzer(config, client_factory(config, session))
        notifier = Notifier(session.client("sns", config=sdk), config.topic_arn)
        return process(event, config, state, analyzer, notifier, context)
    except Exception:
        metric("invocation_failed")
        raise RuntimeError("AIOps failed; inspect sanitized metrics and retry policy") from None
