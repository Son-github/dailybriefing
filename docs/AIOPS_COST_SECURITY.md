# AIOps 비용과 보안

AWS 리소스와 OpenAI API는 이번에 실행하지 않았습니다. 아래는 배포 후 발생 가능한 비용 요소이며 무료/고정금액을 보장하지 않습니다. AWS 비용과 OpenAI 비용은 별도입니다.

## 보수적 기본값

| 설정 | 기본 | 역할 |
|---|---|---|
| enable_aiops | false | AIOps 리소스 자체 생성 여부 |
| aiops_settings.ai_enabled / AI_ENABLED | false | 외부 OpenAI 요청 여부, 꺼져도 기본 SNS는 발송 가능 |
| processing_enabled | true | false면 구독 제거/Rule 비활성 및 대기 호출 처리 중단, 종료 전 사용 |
| model / GPT_MODEL | 빈 값 | AI 활성화 시 사용자가 실제 계정의 지원 모델 지정 |
| daily_limit / DAILY_GPT_LIMIT | 5 | UTC 일일 분석 예약 상한0~100, 실패도 소비 |
| notification_limit / DAILY_NOTIFICATION_LIMIT | 20 | UTC 일일 **새 장애 알림 예약** 상한0~100 |
| dedup_seconds / DEDUP_SECONDS | 1800 | 동일 오류30분 억제, 60~86400 |
| max_log_chars / MAX_LOG_CHARS | 3000 | 본문+주요 stack 합계 상한256~8000; 나머지 metadata도 필드별 축약 |
| max_output_tokens / MAX_OUTPUT_TOKENS | 700 | 출력 토큰128~2000 |
| api_timeout / GPT_TIMEOUT_SECONDS | 10초 | 1~15초, SDK 내부 재시도0 |
| ai_severities / AI_SEVERITIES | HIGH,CRITICAL | 분석 대상 심각도 |
| max_events / MAX_EVENTS | 20 | 한 배치 내 중복 제거 후 처리할 최대 고유 장애1~50 |
| log_retention_days | 7일 | AIOps 로그1/3/5/7/14/30일 |
| input/output_usd_per_million | 0 | 최신 계정 단가를 사용자가 입력해야 비용 추정 가능, 0이면 미설정 |

Lambda는256MB/60초/동시2개를 상한으로 정의합니다. 분석 시작 전 남은 시간이 API timeout+20초 미만이면 기본 알림으로 전환합니다. 실제 네트워크/서비스 실패로 Lambda timeout이나 재시도 종료가 발생하면 이메일이 누락될 수 있습니다.

DynamoDB 원자적 counter는 SDK 실제 요청 **시도 예약**을 제한합니다. OpenAI SDK 자동 재시도0회이므로 예약 하나당 GPT 요청 하나입니다. 수동 테이블 삭제/State 재생성은 이력을 초기화해 그날 상한을 다시 쓸 수 있으므로 예산 자체의 절대 한도로 해석하지 마세요. OpenAI project budget/usage limit과 AWS Budgets 알림도 별도로 설정합니다. 모델/계정별 지원·요금은 [공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-4.1-mini)와 [공식 API 요금](https://developers.openai.com/api/docs/pricing)을 실제 배포 시 확인하세요.

SNS 재시도는 새 알림 예약을 재사용합니다. Lambda 재시도/응답 유실로 Publish 시도 수와 실제 수신 수는 일일 새 알림20개와 다를 수 있습니다. Lambda Errors alarm은 분석 경로를 거치지 않으므로 이 한도의 별도 운영 알림입니다. 중복 이메일을 완전히 없앤다고 주장하지 않습니다.

한 CloudWatch batch에서 먼저 메모리로 동일 fingerprint를 합친 뒤 최대20개 고유 장애만 처리합니다. 초과는 batch_dropped 지표로 남기고 버립니다. 무제한 비용과 대량 메일을 막는 초기 보호 정책이며 대량 장애 감지의 손실 가능성이 있습니다. GPT 한도를 넘으면 기본 SNS를 발송하지만 SNS 자체 한도까지 넘으면 알림도 생략합니다. 이 차이를 운영자가 이해해야 합니다.

## 비용 발생 요소

- AWS Lambda 요청/실행시간, CloudWatch Logs 수집·보관/Subscription 전달, EventBridge 이벤트, SNS Publish/이메일 전달, DynamoDB On-Demand 요청/저장, CloudWatch Alarm.
- OpenAI 입력·출력 토큰. 응답 usage를 받았을 때만 사용량을 기록합니다. usage_reported=false의 token0은 **미보고 기본값**이며 과금0을 뜻하지 않습니다.
- SSM Standard SecureString/Secrets Manager/사용자 KMS의 저장·조회·복호화 조건. 실제 계정·리전 요금을 확인합니다.
- Lambda는 VPC 미연결이며 AIOps 전용 NAT/EC2/AI 모델 서버를 추가하지 않습니다. 기존 ECS의 NAT 등 비용과 별개입니다.
- Main 삭제 후 수동 Secret/CMK/보존 로그/외부 테스트 결과 저장소/Bootstrap State 비용은 별도일 수 있습니다. AWS Cost Explorer는 지연되므로 다음 집계도 확인합니다.

## 데이터와 IAM

1. structured 로그에서 허용 scalar만 수집합니다. headers/body/env/전체 이벤트는 제외합니다. 평문 로그도 본문/주요 stack만 축약하고 비밀번호/JWT/Authorization/Cookie/API Key/AWS Key/연결 자격증명/이메일/휴대전화/개인식별번호/IP/사용자 경로/긴 opaque 문자열을 마스킹합니다.
2. 정규식은 완전한 DLP가 아닙니다. 이름/주소/새 포맷/인코딩된 비밀은 놓칠 수 있습니다. 실제 앱 로그의 데이터 정책과 전송 허용 여부를 검토한 뒤에만 AI를 켭니다. SNS와 캐시에도 다시 마스킹하며, 수집 단계에서 민감 필드를 제외하는 것이 우선입니다.
3. SDK의 원문 exception/HTTP body/입력 로그/키를 Lambda 로그에 출력하지 않습니다. 출력은 숫자·고정 코드·fingerprint와 시간 중심입니다. GPT 결과도 JSON Schema를 재검증하고 문자열마다 재마스킹합니다.
4. OpenAI 키는 사용자가 SSM SecureString/Secrets Manager 단일 문자열로 등록하고 ARN만 tfvars에 전달합니다. AI OFF일 때 Secret 읽기 IAM 권한도 없습니다. 사용자 CMK를 쓰면 지정 ARN의 decrypt와 key policy를 따로 확인합니다.
5. Lambda Execution Role은 자기 로그 CreateLogStream/PutLogEvents, 자기 테이블 GetItem/UpdateItem, 자기 SNS Publish, 지정한 키 읽기/선택 CMK decrypt만 허용합니다. ECS/RDS/네트워크/SG 변경 권한이나 계정 탐색 도구가 없습니다.
6. SNS 이메일 endpoint는 subscription 특성상 Terraform State에 저장됩니다. sensitive 표시는 CLI 출력만 가리며 State 암호화/접근제어를 대신하지 않습니다. email을 공개 output/로그에 내보내지 마세요. DynamoDB에는 fingerprint/상태/owner/한도/정제 알림만 저장하며 TTL로 정리합니다.
7. DynamoDB 장애는 GPT fail-closed, SNS 실패는 캐시 재시도입니다. 정확히 한 번 전달/메일 수신 보장은 없습니다. TTL 정리는 즉시 삭제가 아니며 SDK/서비스 장애/불확실한 게시 결과는 실제 계정에서 검증해야 합니다.
8. `store=false`만으로 OpenAI의 모든 데이터 보관이 사라지는 것은 아닙니다. 사용 전 계정의 데이터 제어·정책을 확인하세요. AI는 원인 후보만 제시하며 보안 설정 자동 변경은 구현하지 않았습니다.

DynamoDB에서 SENT는 SNS 게시 완료이고 이메일 수신 확인은 아닙니다. 알림 한도로 생략한 항목은 SUPPRESSED로 구분합니다. TTL 기간 안에는 둘 다 중복 처리를 억제합니다.
