# AIOps 실제 측정 기록 양식

아직 실제 AWS 장애 감지/유료 GPT 분석/SNS 게시/메일 수신 측정값은 없습니다. 아래는 미래 실험용 빈 양식입니다. Mock 테스트의 실행 시간/성공 건수를 실제 운영 성과로 바꿔 적지 마세요.

| 항목 | 관측값/증거 |
|---|---|
| 실험 일자/환경/인프라 버전 | 미측정 |
| 시나리오 RDS/설정/timeout/500/ECS | 미측정 |
| 로그 관측 시각 | 미측정 |
| EventBridge/Lambda 수신 시각 | 미측정 |
| GPT 시작/종료 시각 | 미측정 |
| SNS Publish 성공/시각/MessageId(개인정보 제외) | 미측정 |
| 실제 이메일 수신 여부/시각(사람 확인) | 미측정 |
| 감지 성공/누락/오탐 여부 | 미측정 |
| 원인 후보 적절성/틀린 추정/검토자 근거 | 미측정 |
| GPT 실제 시도/중복 생략/한도 생략 | 미측정 |
| 입력/출력 토큰/usage_reported | 미측정 |
| 추정 단가 기준일/모델/추정비용 | 미측정 |
| 실제 OpenAI 사용량/청구 내역 | 미측정 |
| AWS 비용 집계/반영 지연 | 미측정 |
| 수동 분석 시간/AI 보조 분석 시간 | 미측정 |
| 데이터/비밀정보 노출 점검 | 미측정 |
| 종료 후 리소스/이메일 구독/잔여 비용 | 미측정 |

Lambda 로그는 received/incident/gpt/sns_published/notification_failed/notification_limit/batch/invocation_failed의 JSON을 기록합니다. fingerprint로 같은 유형을 연결하고 UTC epoch timestamp를 사용합니다. observed_at 파싱 실패는 null입니다. GPT usage가 제공되지 않으면 usage_reported=false이며 토큰0을 비용0으로 해석하지 않습니다. 입력·출력 단가를 설정하지 않으면 estimated_usd=null입니다. 추정값은 청구액과 다릅니다.

CloudWatch Logs Insights 예시(향후 사용자 실행):

```text
fields @timestamp, metric, fingerprint, result, observed_at, received_at,
       started_at, ended_at, input_tokens, output_tokens, usage_reported,
       estimated_usd, published, duplicate, skipped, batch_dropped
| filter ispresent(metric)
| sort @timestamp desc
| limit 100
```

실험 중복/반복 횟수/시간대/네트워크/모델을 같게 맞춰 비교하고 원본 개인정보를 증거로 붙이지 마세요. SNS 게시 성공은 이메일 실제 수신과 다른 단계입니다. 수동/AI 보조 분석 성과는 관측 후에만 작성합니다.
