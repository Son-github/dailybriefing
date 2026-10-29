# AIOps 운영과 검증

## 현재 확인한 범위

2026-10-29에 DB 연결·설정 누락·외부 API 시간 초과·HTTP 500·DNS·TLS 합성 ERROR 6종을 실제 CloudWatch에 기록했습니다. 6건 모두 AI 응답 처리와 SNS 게시, DynamoDB SENT 상태를 확인했습니다. 이메일 수신 사진은 추가할 예정입니다. [입력·실제 분석·평가 기록](AIOPS_OPERATIONAL_TEST_REPORT.md)

실제 DB나 외부 서비스를 고장 낸 시험은 아닙니다. ECS 실패 이벤트, 폭주 요약, 중단·재생성은 각각 추가 검증이 필요합니다.

## 오류가 들어온 뒤의 흐름

![AIOps 구성](assets/architecture/aiops-architecture.png)

1. Backend ERROR는 CloudWatch 구독으로, ECS Task/배포 실패는 EventBridge 규칙으로 Lambda에 전달됩니다.
2. Python 함수가 입력을 파싱하고 민감정보를 제거한 뒤 오류 유형·심각도·그룹을 결정합니다.
3. DynamoDB에서 같은 공급자 이벤트의 재전송, 전달 상태, 반복 횟수, 일일 한도를 확인합니다.
4. 개별 또는 요약 알림을 만들고, AI 대상이면 OpenAI Responses로 원인 후보와 확인 순서를 요청합니다.
5. SNS에 게시한 뒤 전달 상태를 기록합니다. AI 실패나 한도 도달은 기본 점검 안내로 대체합니다.

DynamoDB는 과거 원인을 찾아 새 오류의 정답으로 재사용하는 지식 저장소가 아닙니다. 전송 재시도용 분석 결과와 처리 상태를 보관합니다. 새로운 발생은 별도로 처리합니다.

### 반복과 재전송

같은 오류라도 평소에는 발생마다 알립니다. 수신 기준 3분 안에 10회가 발생하면 첫 9건은 개별 알림, 10번째부터는 10분간 모아 반복 횟수를 요약합니다. 이때만 EventBridge Scheduler 일회성 예약을 만들며 실행 후 삭제합니다. 앱 실행 중 5분마다 점검하는 정기 호출은 없습니다.

같은 이벤트 ID 재전송은 새 발생으로 세지 않습니다. 전달 실패 재시도와 알림 게시 사이에 중복 가능성은 남아 있으므로 이메일을 정확히 한 번 전달한다고 보장하지는 않습니다. SNS 게시 성공과 실제 받은편지함 도착도 구분합니다.

## 설정과 한도

실제 설정은 Git에서 제외된 infra/terraform.tfvars에 둡니다. 다음은 6종 검증 때 사용한 한도이며, 평소에는 필요한 수준으로 줄여 사용합니다.

```hcl
enable_aiops = true
# aiops_email: 수신할 개인 이메일
# aiops_openai_key_arn: SSM SecureString 또는 Secrets Manager ARN
aiops_package_path = "../lambda/aiops/build/aiops.zip"
aiops_settings = {
  processing_enabled = true
  ai_enabled = true
  model = "gpt-6-luna"
  reasoning_effort = "none"
  reserved_concurrency = -1
  daily_limit = 10
  notification_limit = 30
  max_log_chars = 3000
  max_output_tokens = 1200
  api_timeout = 15
  dedup_seconds = 1800
  max_events = 20
  ai_severities = ["HIGH", "CRITICAL"]
  log_retention_days = 7
}
```

| 설정 | 의미 |
| --- | --- |
| processing_enabled | 오류 처리 전체 켜기/끄기 |
| ai_enabled | 감지·기본 알림을 유지하면서 AI만 켜기/끄기 |
| ai_severities | HIGH·CRITICAL로 분류된 오류만 AI 요청. 모든 로그에 AI 호출하지 않음 |
| daily_limit | UTC 일자별 AI 시도 한도. 실패도 소비 |
| notification_limit | 개별·요약 알림의 일일 한도. AI 한도와 별개 |
| reserved_concurrency=-1 | 함수별 예약 없이 계정 공용 동시 실행 한도 사용 |
| dedup_seconds | 이전 설정 호환 값. 현재 3분/10회/10분 정책의 조절 값이 아님 |

마지막 6종 시험 종료 시 AI는 10/10, 알림은 21/30이었습니다. 이는 당시 기록이며 현재 남은 한도는 별도로 조회해야 합니다. 내부 횟수 제한은 전체 AWS·OpenAI 청구 상한이 아닙니다. ChatGPT 구독과 API 결제도 별개입니다.

처음 연결할 때는 ai_enabled=false로 SNS부터 확인하고, 실제 키 ARN과 모델 접근·결제 상태를 확인한 뒤 켜세요. SNS 확인 메일에서 Confirm subscription을 눌러야 수신됩니다. 모델은 현재 프로젝트 설정이며 최저가나 향후 제공 여부를 보장하는 값은 아닙니다.

## 코드 변경과 배포

Python 3.13 가상환경을 사용합니다. 기본 pytest는 외부 네트워크를 막고 AWS·OpenAI를 모의 객체로 대체합니다.

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r lambda/aiops/requirements.txt
.venv/bin/python -m pip install -r lambda/aiops/requirements-dev.txt
.venv/bin/python -m ruff check lambda/aiops
.venv/bin/python -m ruff format --check lambda/aiops
.venv/bin/python -m pytest lambda/aiops
AIOPS_PYTHON=.venv/bin/python bash scripts/build_aiops.sh
python3 scripts/aiops_preflight.py
```

빌드는 Linux x86_64/Python 3.13용 의존성을 묶습니다. git push만으로 Lambda가 바뀌지 않습니다. 운영자가 새 base.tfplan을 만들고 AIOps 코드·환경·권한 변경을 검토한 뒤 직접 적용합니다. [공통 Terraform 절차](DEPLOYMENT.md)

예약 동시 실행 오류가 나면 -1 설정과 계정 한도를 확인합니다. 0은 함수 실행을 차단하므로 대안으로 쓰지 않습니다. 부분 적용 뒤에는 기존 자원을 유지하고 새 계획으로 확인하세요.

## 로컬 시험 입력

```bash
python3 scripts/aiops_test_cases.py --output /tmp/dailybriefing-aiops-cases
python3 scripts/aiops_mock_event.py dns > /tmp/aiops-dns.json
python3 scripts/aiops_mock_event.py timeout --count 12 > /tmp/aiops-burst.json
```

위 명령은 파일만 생성합니다. 지원 사례는 rds, environment, timeout, http500, dns, tls, connection, provider-auth, upstream입니다. 미리보기는 실제 AI 결과가 아니며, JSON 생성만으로 CloudWatch 전달을 확인한 것도 아닙니다.

폭주 입력 12건을 실제로 전달하면 한도 여유가 있을 때 개별 9건과 나머지 3건의 요약 1건이 예상됩니다. 요약은 10분 이후 예약 전달 지연을 포함해 확인합니다. 실제 발송 시험은 비용과 수신 메일 수를 먼저 정하고 진행하세요.

## CloudWatch에서 전체 경로 확인

실제 로그 기록은 AI와 이메일을 발생시킬 수 있습니다. 운영 DB·키·보안 그룹을 고의로 변경하지 않고 합성 ERROR로 확인합니다. running 모드, 최신 코드, SNS Confirmed 상태와 남은 한도가 필요합니다.

```bash
# AWS 설정 조회만 수행. 키 원문을 조회하거나 테스트를 발송하지 않음
python3 scripts/aiops_preflight.py --aws-readonly --cases 2
```

검사는 계정 일치, Luna/none, 처리·AI 활성화, 키 ARN 존재, 소스·ZIP·배포 해시, ERROR 구독, 이메일 구독과 한도를 확인합니다. ready 결과가 OpenAI 잔액이나 모델 호출 성공까지 뜻하지는 않습니다.

### 입력 생성

프로젝트 최상위 폴더에서 실행합니다. 다음 Python은 로컬 JSON 파일만 생성합니다.

```bash
python3 - <<'PY'
from datetime import datetime, timezone
from pathlib import Path
import json
import sys
import time
import uuid

sys.path.insert(0, 'scripts')
from aiops_mock_event import SCENARIOS

folder = Path('/tmp/dailybriefing-cloudwatch-check')
folder.mkdir(parents=True, exist_ok=True)
for name in ['rds', 'environment', 'timeout', 'http500']:
    request_id = f'cw-test-{name}-{uuid.uuid4().hex[:8]}'
    timestamp = datetime.now(timezone.utc).isoformat()
    message = (
        f'{timestamp} ERROR requestId={request_id} '
        'com.dailybriefing.common.Errors - '
        + SCENARIOS[name]['message'] + ' testOnly=true'
    )
    event = [{'timestamp': int(time.time() * 1000), 'message': message}]
    (folder / f'{name}.json').write_text(json.dumps(event))
    print(name, '요청 번호:', request_id)
print('로컬 파일만 생성 완료:', folder)
PY
```

출력된 요청 번호를 보관하면 원본 로그와 이메일을 맞춰 볼 수 있습니다. `testOnly=true`는 자연 발생 로그와 구분하기 위한 표식입니다. 같은 테스트를 반복하면 실제 새 CloudWatch 이벤트로 집계되므로 의미 없이 재전송하지 않습니다.

### 실제 로그 기록

아래부터 실제 AWS 쓰기 및 이후 자동 분석·메일 발송이 발생합니다. 운영 데이터나 DB 설정은 바꾸지 않습니다. 현재 AWS CLI가 의도한 계정/서울 리전을 사용하는지 사용자가 먼저 확인하세요.

테스트 전용 스트림을 생성합니다.

```bash
AIOPS_TEST_STREAM="aiops-check-$(date +%Y%m%d-%H%M%S)"

aws logs create-log-stream \
  --region ap-northeast-2 \
  --log-group-name /dailybriefing/backend \
  --log-stream-name "$AIOPS_TEST_STREAM"
```

원하는 사례 한 건만 먼저 보내도 됩니다.

```bash
aws logs put-log-events \
  --region ap-northeast-2 \
  --log-group-name /dailybriefing/backend \
  --log-stream-name "$AIOPS_TEST_STREAM" \
  --log-events file:///tmp/dailybriefing-cloudwatch-check/rds.json
```

첫 사례의 AI 성공과 메일 수신을 확인한 뒤 나머지 3종을 전송합니다. 앞의 rds를 다시 포함하지 않습니다.

```bash
for scenario in environment timeout http500; do
  aws logs put-log-events \
    --region ap-northeast-2 \
    --log-group-name /dailybriefing/backend \
    --log-stream-name "$AIOPS_TEST_STREAM" \
    --log-events "file:///tmp/dailybriefing-cloudwatch-check/${scenario}.json" || break
  sleep 10
done
```

이렇게 하면 검증 경로는 `CloudWatch ERROR → 구독 → Lambda → DynamoDB → OpenAI → SNS → 이메일`입니다. put-log-events 성공은 로그 수집 성공이며 AI/메일 성공까지 의미하지 않습니다.

### 결과 확인

원본은 CloudWatch `/dailybriefing/backend`에서 방금 생성한 aiops-check-* 스트림으로 확인합니다. Lambda 처리 로그는 다음으로 확인합니다.

```bash
aws logs tail /aws/lambda/dailybriefing-aiops \
  --region ap-northeast-2 --since 20m --format short
```

| 확인 대상 | 성공 신호 | 의미 |
| --- | --- | --- |
| 원본 로그 | 요청 번호/ERROR/오류 코드 | CloudWatch에 입력이 도착함 |
| Lambda received | parsed > 0 | 구독 전달 및 파싱 성공 |
| Lambda incident | kind와 fingerprint | 오류 분류 및 그룹 식별 |
| Lambda gpt | result=SUCCESS | 구조화된 AI 결과 처리 성공. 내용의 정답 여부는 별도 |
| Lambda sns_published | 지표 존재 | SNS 게시 성공. 수신은 별도 확인 |
| 실제 이메일 | AI 상태: AI 분석 성공 | 사람이 수신하고 분석 내용을 읽음 |
| OpenAI Usage | 해당 프로젝트/모델 사용 기록 | 토큰 사용과 과금 별도 확인. 반영 지연 가능 |

여러 호출의 로그가 섞일 수 있으므로 Lambda RequestId로 호출을 나누고 incident/gpt/sns_published의 fingerprint를 연결합니다. AI 요청에는 앱 요청 번호를 보내지 않습니다. 앱 요청 번호는 원본 로그와 이메일 하단의 추적 정보로 맞춥니다.

CloudWatch Logs Insights에서 Lambda 로그 그룹을 선택하고 아래처럼 처리 지표만 볼 수도 있습니다. 쿼리는 로그 조회 비용이 발생할 수 있습니다.

```text
fields @timestamp, @requestId, metric, kind, fingerprint, result,
       parsed, published, aggregated, duplicate, skipped,
       input_tokens, output_tokens, usage_reported
| filter ispresent(metric)
| sort @timestamp desc
| limit 100
```

### 내용 평가

| 사례 | 기대 분류 | 적절한 설명/확인 순서 | 주의할 오답 |
| --- | --- | --- | --- |
| rds | DATABASE_CONNECTION_ERROR | JDBC 예외를 근거로 DB 상태/접속 대상/연결 풀/네트워크 후보 점검 | 비밀번호나 SG가 틀렸다고 근거 없이 확정 |
| environment | CONFIGURATION_ERROR | 설정 누락/Secret 연결/최근 배포 확인 | 입력에 없는 키 이름·ARN·값을 만들어냄 |
| timeout | API_TIMEOUT | 외부 응답 지연·연결/응답 제한 시간·공급자 상태 확인 | DB 장애나 특정 공급자 장애로 단정 |
| http500 | HTTP_SERVER_ERROR | IllegalStateException과 관련 스택/재현 정보 필요성 설명 | 실제 문제 코드를 봤다고 주장 |

AI는 이 합성 로그만 봅니다. 하나의 고정 정답 문장을 요구하지 말고 관측 근거에 맞는 후보인지, 안전한 순서인지, 정보 부족을 인정하는지를 평가하세요. 구조화 응답 성공/메일 수신/실제 원인 적중은 서로 다른 지표입니다.

추가로 dns/tls/connection/provider-auth/upstream을 시험하려면 2단계 Python의 사례 목록을 바꾸고 새로운 파일을 생성합니다. 남은 일일 한도와 테스트 횟수를 먼저 정하세요. 특히 provider-auth의 upstreamStatus=401을 OpenAI 키 오류나 앱 사용자 로그인 오류로 혼동하지 않는지 확인합니다.

생성된 REPORT.md 양식에 일시, 입력, AI 상태, 원인/근거 평가, 실제 메일 수신을 기록합니다. 공개 증거에는 키·이메일·계정 정보·실제 사용자 로그를 포함하지 않습니다.

## 메일이 없거나 AI가 생략된 경우

| 관측값 | 확인할 것 |
| --- | --- |
| 원본 로그는 있지만 received가 없음 | 로그 그룹/구독 필터/대상 Lambda/실행 권한/처리 중지 모드 |
| parsed=0 또는 skipped 증가 | 실제 로그 형식과 분류 지원 범위. 일반 INFO/WARN/사용자 4xx는 대상 아님 |
| duplicate 증가 | 동일 공급자 이벤트의 재전송인지 확인 |
| burst_aggregated / aggregated 증가 | 해당 그룹이 10분 집계 중. 개별 AI/메일 대신 요약 대기 |
| AI 일일 한도 안내 | 그날 분석 시도 수 확인. 오류 감지 실패와 구분 |
| TIMEOUT / AUTHENTICATION / RATE_LIMIT / API_FAILURE / INCOMPLETE | 각각 AI 응답 지연/키/사용량·크레딧/모델 권한·요청/출력 완료 상태 확인 |
| notification_limit | 일일 알림 한도 확인. AI 호출 전에 발송을 생략할 수 있음 |
| notification_failed / invocation_failed | 예약·상태 저장·SNS 및 권한 오류 경로 점검 |
| sns_published는 있으나 수신 안 됨 | SNS 구독 Confirmed, 수신 주소, 스팸함 확인 |

무조건 반복 호출하거나 키를 로그에 출력하지 않습니다. 새 진단 버전은 크레딧 부족/프로젝트·조직 한도/속도 제한을 알려진 코드로 구분합니다. 세부 코드 없는 UNKNOWN_429는 여전히 원인을 확정할 수 없습니다. 아래 429 진단과 OpenAI Billing/Usage를 함께 확인하세요.

## 자연 발생한 실제 앱 오류 확인

위 테스트는 실제 CloudWatch 연결을 검증하지만 실제 서비스 장애를 재현하지는 않습니다. 운영에서 외부 API/DB/서버 오류가 자연 발생했다면 다음을 확인합니다.

1. 앱 요청에서 받은 요청 번호와 발생 시각으로 `/dailybriefing/backend`의 실제 ECS 스트림을 찾습니다.
2. 해당 ERROR 이후 분석 Lambda의 incident/gpt/sns_published를 확인하고 메일의 요청 번호와 맞춥니다.
3. AI 원인 후보를 실제 점검 결과와 비교합니다. 오류가 멈췄다는 이유만으로 복구라고 기록하지 않습니다.

구독 설치 전 과거 로그를 이 절차가 자동 재분석하지는 않습니다. 실제 앱 장애를 의도적으로 재현하려면 운영 DB/키/보안 그룹을 바꾸는 대신 별도 테스트 환경과 실패하는 외부 API 대역 등을 준비해야 합니다. ECS Task/배포 실패는 CloudWatch ERROR와 별도 EventBridge 경로이며 이 4종 로그 시험으로 검증하지 않습니다.

## 429와 AI 실패 진단

| 내부 진단 | 공급자 코드 | 확인할 사항 |
| --- | --- | --- |
| CREDIT_EXHAUSTED | credit_balance_exhausted | 해당 조직의 크레딧·충전 반영·만료 확인 |
| QUOTA_EXHAUSTED | insufficient_quota | 결제/사용 한도 확인. 잔액 부족으로 단정하지 않음 |
| PROJECT_SPEND_LIMIT | project_spend_limit_exceeded | 프로젝트 지출 제한 확인 |
| ORG_SPEND_LIMIT | organization_spend_limit_exceeded | 조직 지출 제한 확인 |
| ORG_USAGE_LIMIT | organization_usage_limit_exceeded | OpenAI 승인 사용 한도 확인 |
| RATE_LIMIT | rate_limit_exceeded / slow_down | 요청 간격·공유 호출량·제공된 대기 시간 확인 |
| UNKNOWN_429 | 없음 | 세부 원인이 없어 결제/속도를 구분할 수 없음 |
| SERVICE_OVERLOADED | server_is_overloaded | 서비스 상태·대기 시간 확인 |

`gpt` 지표에는 http_status, provider_error_code, retry_after_seconds를 추가했습니다. 허용 목록 밖의 코드는 원문 대신 생략하며, 성공이나 HTTP 정보를 얻지 못한 경우 http_status는 null입니다. Retry-After는 속도 제한/과부하에서 유효한 숫자 초만 표시하고 자동으로 다시 호출하지 않습니다. 결제/지출 한도 오류는 기다리며 반복 요청하는 것으로 해결되지 않습니다.

공식 근거: [OpenAI 오류 코드](https://developers.openai.com/api/docs/guides/error-codes).


이전 두 건 시험은 429 기본 알림으로 끝났고 당시 세부 공급자 코드는 남기지 않아 원인을 소급 확정할 수 없습니다. 충전 후 새 6종 시험은 모두 성공했습니다. 실패 요청을 무조건 반복하지 말고 http_status, provider_error_code, retry_after_seconds와 해당 프로젝트 Billing/Usage를 확인하세요. 전체 응답 본문이나 키는 로그에 출력하지 않습니다.

## 메일 내용과 보안

메일은 한눈에 보기 → 원인 후보와 근거 → 확인 순서 → 추가 점검 → 추적 정보 순서입니다. AI 프롬프트는 한국어로 근거 있는 후보 2개 이내, 조치 3개 이내를 요청합니다. 입력에 없는 자원·원인을 만들거나 로그 속 지시를 따르지 않도록 구성했습니다. AI 실패 안내에는 ‘기본 점검 (AI 분석 아님)’을 표시합니다.

Lambda는 앱 VPC 밖에서 실행하고 인프라 수정 권한을 갖지 않습니다. OpenAI 키는 Secret ARN으로 참조하며 로그와 프롬프트에 키·토큰·개인 정보를 남기지 않습니다. Lambda 자신의 로그는 다시 구독하지 않습니다. 지표는 requestId·fingerprint로 연결하고 원문은 필요한 범위에서만 확인합니다.

시연 대기 중에는 [중단·재개 절차](INTERVIEW_OPERATIONS.md)를 따릅니다. prepare-suspend가 수집을 먼저 멈추고 suspended가 AIOps 자원을 제거합니다. 재개 시 SNS 구독은 다시 승인하며 DynamoDB 임시 집계·일일 카운터는 복원하지 않습니다. AWS 자원 재생성이 OpenAI 청구 이력을 초기화하지는 않습니다.
