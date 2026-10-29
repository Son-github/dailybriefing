"""오류별 개별 발송과 폭주 요약. 상태/예약/SNS 실패는 재시도하며 원문은 로그에 남기지 않습니다."""

import json
import time
from datetime import datetime
from config import Config
from event_parser import parse_event
from log_sanitizer import sanitize_incident
from error_classifier import classify
from deduplicator import StateStore, fingerprint
from gpt_analyzer import Analyzer, Outcome, client_factory
from sns_notifier import Notifier, notification, burst_notification
from burst import BurstStore, SummaryScheduler, event_key


def metric(name, **values):
    # 허용한 숫자/고정 상태만 기록합니다. 이벤트/예외 객체/본문은 금지합니다.
    print(json.dumps({"metric": name, "at": time.time(), **values}))


def process(event, config, state, analyzer, notifier, context=None, *, burst, scheduler):
    if not config.processing_enabled:
        return {"maintenance": True}
    if isinstance(event, dict) and event.get("aiops_summary") is True:
        return send_summary(event, config, state, burst, notifier)
    incidents = parse_event(event, config)
    counts = dict(
        parsed=len(incidents),
        duplicate=0,
        published=0,
        skipped=0,
        batch_dropped=0,
        aggregated=0,
    )
    retry = False
    metric("received", received_at=time.time(), parsed=len(incidents))
    groups = set()
    candidates = []
    for raw in incidents:
        incident = sanitize_incident(raw, config.max_log_chars)
        classification = classify(incident)
        if not classification:
            counts["skipped"] += 1
            continue
        group = fingerprint(incident, classification.kind)
        if group not in groups and len(groups) >= config.max_events:
            counts["batch_dropped"] += 1
            continue
        groups.add(group)
        # 그룹이 같아도 실제 logEvent가 다르면 각각 처리합니다. 공급자 재전송만 중복 제거합니다.
        candidates.append((incident, classification, group, event_key(raw)))
    for incident, classification, group, identity in candidates:
        key = "delivery-v2-" + identity
        try:
            observed_at = datetime.fromisoformat(
                incident.timestamp.replace("Z", "+00:00")
            ).timestamp()
        except (ValueError, OverflowError):
            observed_at = None
        metric("incident", observed_at=observed_at, fingerprint=group, kind=classification.kind)
        result, owner, record = state.claim(key, retention=172800)
        if result == "duplicate":
            counts["duplicate"] += 1
            continue
        if result == "inflight":
            retry = True
            continue
        try:
            decision = burst.accept(group, identity, classification.kind)
            if decision["mode"] == "aggregate":
                scheduler.ensure(decision["bucket"], decision["until"])
                state.update(key, owner, "SENT")
                counts["aggregated"] += 1
                metric("burst_aggregated", fingerprint=group)
                continue
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
                            http_status=outcome.http_status or None,
                            provider_error_code=outcome.provider_error_code,
                            retry_after_seconds=outcome.retry_after_seconds,
                            fingerprint=group,
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
            metric("sns_published", fingerprint=group, email_received="NOT_VERIFIED")
        except Exception:
            # 예약/SNS/상태 갱신 장애는 같은 이벤트 ID로 재시도합니다. 알림 캐시가 있으면 GPT를 재호출하지 않습니다.
            state.update(key, owner, "RETRY")
            metric("notification_failed")
            retry = True
    metric("batch", **counts)
    if retry:
        raise RuntimeError("AIOps delivery pending; retry safely") from None
    return counts


def send_summary(event, config, state, burst, notifier):
    key = event.get("bucket", "")
    if not isinstance(key, str) or not key.startswith("bucket#") or len(key) > 160:
        raise ValueError("Invalid summary reference")
    result, owner, record = state.claim("summary-v2-" + key, retention=172800)
    if result == "duplicate":
        return {"summary_duplicate": True}
    if result == "inflight":
        raise RuntimeError("Summary delivery pending")
    try:
        cached = record.get("notification")
        if cached:
            message = json.loads(cached)
        else:
            row = burst.seal(key)
            if not row:
                state.update("summary-v2-" + key, owner, "SUPPRESSED")
                return {"summary_expired": True}
            if not state.quota("notifications", config.notification_limit):
                state.update("summary-v2-" + key, owner, "SUPPRESSED")
                metric("notification_limit", summary=True)
                return {"summary_limited": True}
            message = burst_notification(row)
            state.update("summary-v2-" + key, owner, "PROCESSING", message)
        notifier.publish(message)
        state.update("summary-v2-" + key, owner, "SENT")
        metric("burst_summary_published")
        return {"summary_published": True}
    except Exception:
        state.update("summary-v2-" + key, owner, "RETRY")
        raise RuntimeError("Summary delivery pending") from None


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
        burst = BurstStore(session.client("dynamodb", config=sdk), config.table_name)
        scheduler = SummaryScheduler(session.client("scheduler", config=sdk), config)
        return process(
            event, config, state, analyzer, notifier, context, burst=burst, scheduler=scheduler
        )
    except Exception:
        metric("invocation_failed")
        raise RuntimeError("AIOps failed; inspect sanitized metrics and retry policy") from None
