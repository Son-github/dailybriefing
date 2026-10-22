# AIOps 작업 보고서 — 2026-10-23

**AWS 계정/리소스 조회·생성·수정·삭제, Terraform plan/apply/destroy, 실제 OpenAI 요청/SNS Publish/이메일 발송, 원격 GitHub Workflow 실행은 하지 않았습니다.** 코드 작성·공개 문서/패키지 다운로드·로컬 Mock/빌드 검증까지만 수행했습니다.

## A. 새 Python 파일

lambda/aiops의 handler/event_parser/log_sanitizer/error_classifier/deduplicator/gpt_analyzer/sns_notifier/config를 추가했습니다. 두 이벤트를 공통 Incident로 변환하고 필드 배제·마스킹·분류·공유 중복/한도·선택 AI·알림 캐시·SNS 순서로 처리합니다. 파일별 책임은 [AIOPS_ARCHITECTURE](AIOPS_ARCHITECTURE.md)에 정리했습니다. requirements.in/txt는 직접·전이 버전/해시, requirements-dev.txt와 pyproject.toml은 pytest/ruff 설정입니다.

scripts/build_aiops.sh는 Linux x86_64/CPython3.13 ZIP을 빌드하고 크기/ELF/무결성/SHA256을 검사합니다. scripts/aiops_mock_event.py는 네 가지 합성 JSON만 생성합니다. 실제 장애를 제품 endpoint에 추가하지 않았습니다.

## B. Terraform 변경

기존 vpc/frontend/ecr/iam/alb/ecs/rds/nat 8개를 유지하고 Main의 선택적 aiops를 추가했습니다. 기본 enable_aiops=false/ai_enabled=false입니다. 새 Root/State/NAT/AI 모델 서버가 없습니다.

aiops 모듈은 Lambda/Python3.13/Execution Role·최소권한 policy, 자기 log group, Backend ERROR Subscription+invoke permission, 실제 ECS 대상 task/deployment EventBridge Rule2개+target/permission, SNS Topic/email subscription/topic policy, On-Demand DynamoDB/TTL/암호화, Lambda 비동기 재시도 설정, Lambda Errors alarm을 정의합니다. VPC에는 연결하지 않습니다. 자기 로그를 구독하면 precondition이 실패하며 permission 뒤에 Subscription을 생성합니다.

ECS outputs에 cluster ARN/service ARN/log group ARN을 추가하고 Root에서 연결합니다. ARN/식별자만 전달하고 키 원문은 Terraform에 넣지 않습니다. ZIP 경로와 hash는 로컬 파일에서 사용하고 미생성 시 빌드 안내 precondition이 있습니다. 기존 bootstrap/State 구성은 그대로입니다.

## C. Spring Boot 변경

`backend/src/main/java/com/dailybriefing/common/Errors.java`만 변경했습니다. API5xx는 고정 errorCode/httpStatus/exception명 ERROR를 추가하고, 예상치 못한500에도 같은 안정적 필드를 기록합니다. 기존 plain text 형식/Request ID/MDC/INFO·WARN·응답 구조는 유지합니다. 예외 원문/키/본문/전체 Stack Trace를 새로 출력하지 않습니다.

`AiopsErrorLogTest`2개로 5xx 코드/상태 기록과 원문/Throwable 제외, 4xx 구독 미발생을 확인했습니다. frontend 비즈니스 코드/profile/Compose/Flyway/실제 .env/기존 DB는 수정하지 않았습니다.

## D. 사용자 준비

키가 필요 없는 로컬 Mock부터 사용합니다. 나중에 AWS를 실제 사용할 때만 기존 Backend 준비, 개인 SNS 이메일, ZIP, 모델/한도, 동일 계정/서울 SecureString 또는 Secret ARN을 입력합니다. 키 값은 사용자 Console에서 직접 등록하고 ARN만 tfvars에 넣습니다. 실제 email은 State에 저장되므로 State 접근제어가 필요합니다. Confirm subscription은 사용자가 해야 하며 재생성 후 다시 필요할 수 있습니다. [체크리스트](AIOPS_CHECKLIST.md).

## E. 로컬 명령

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r lambda/aiops/requirements.txt
.venv/bin/python -m pip install -r lambda/aiops/requirements-dev.txt
.venv/bin/python -m ruff check lambda/aiops
.venv/bin/python -m ruff format --check lambda/aiops
.venv/bin/python -m pytest lambda/aiops
AIOPS_PYTHON=.venv/bin/python bash scripts/build_aiops.sh
terraform fmt -check -recursive infra
```

계정 접근 없는 init -backend=false/credential 차단 validate 및 테스트 상세는 [AIOPS_LOCAL_TEST](AIOPS_LOCAL_TEST.md)/[INFRA_VERIFICATION](INFRA_VERIFICATION.md)을 확인하세요. 본 작업은 /tmp 가상환경을 사용했습니다. 기본 pytest는 socket 연결을 차단합니다.

## F. 미래 AWS 최초 배포 — 미실행

사용자 기존 Main Backend→키 ARN/이메일/AI OFF 설정→로컬 검사/ZIP→사용자 Main plan 검토/수동 apply→SNS 구독 확인→기본 알림/실제 로그 전달 검증→데이터 정책·한도 확인 후 AI1회→ECS 실제 실패/정상 종료 비교 순서입니다. [실제 사용자 명령과 확인 항목](AIOPS_AWS_DEPLOYMENT.md). GitHub Actions는 Python/ZIP/Terraform 정적 검사만 수행하고 Lambda 코드를 별도 원격 수정하지 않습니다.

## G. 미래 삭제 — 미실행

processing_enabled=false로 처리/감지 중단 선반영→근거 로그 안전 보존→기존 DB/S3/ECR 정책 확인→사용자 Main destroy 목록 검토/수동 적용→함수/규칙/구독/Topic/Table/로그/권한/알람 잔존 확인입니다. Bootstrap은 유지하며 사용자 사전 등록한 OpenAI 키용 Secret/CMK는 별도 관리합니다. OpenAI usage/key revoke와 AWS 지연 청구도 따로 확인합니다.

## H. 실제 검증

| 검사 | 결과 | 범위 |
|---|---|---|
| Python ruff lint/format | 성공 | 소스8개+테스트5개 |
| pytest | 성공 | 58개, 네트워크 차단/Mock/Fake/공식 SDK Mock transport 포함 |
| Lambda ZIP | 성공 | Linux x86_64 cp313 wheel/해시/크기/ELF3개/ZIP integrity |
| 재현 빌드 | 성공 | 동일 환경에서 최종 ZIP 두 번 빌드, SHA256 일치 |
| ZIP SHA256 | 기록 | 66ce015f784f632e9208bf7efb1d9b9fce58f1bb6917d1a84569ac6eb5e6f052 |
| ZIP 크기 | 기록 | 22,778,698 bytes, 소스/의존성 변경 시 hash/크기도 변경됨 |
| Terraform fmt/init-backend=false/validate | 성공 | Main+Bootstrap, AWS credentials/metadata 차단, 계정 조회 없음 |
| 구조/Secret/SPA/배포 script/actionlint | 성공 | AIOps 연결·비밀 원문/CI 자동 인프라 변경 금지, actionlint shellcheck 제외 |
| Frontend lint/typecheck/Vitest/build | 성공 | 36개, 기존 앱 소스 유지 |
| Backend clean/test/integrationTest/bootJar | 성공 | 단위35개+PostgreSQL 통합10개 |
| Docker image/Compose | 성공 | 별도 dailybriefing-aiops-check project/DEMO/3서비스 healthy |
| PC·모바일 Playwright | 성공 | 32개, 기존 기능과 정적 DEMO |
| 실제 AWS/유료 OpenAI/SNS/메일 수신 | 미실행 | 사용자 비용 금지 요청 준수 |
| GitHub Workflow 원격 실행/CI Linux ZIP import | 미실행 | YAML 및 job 작성/정적 검증만 수행 |
| Checkov/tfsec/IAM simulator/실제 DynamoDB 조건 통합 | 미실행 | 로컬 검증을 계정 보안 감사로 해석하지 않음 |

초기 실패도 구분합니다. Python 테스트 첫 수집에서는 최신 SDK의 transport 패키지명이 httpx2인 점을 맞추지 못했으며 실제 설치된 SDK 타입에 맞춰 수정 후 통과했습니다. 초기 Gradle 실행은 생성 build의 `Test 2.class` 중복 때문에 로딩 실패했고 소스/DB를 유지한 Gradle clean 후 통과했습니다. 로컬 Docker가 꺼져 있어 첫 Compose 접근이 실패했고 Docker 기동 후 격리 project에서 재검증했습니다. 해결하지 않은 테스트 실패를 숨기지 않습니다.

## I. 미완료/운영 한계

실제 계정 권한/한도/Subscription/EventBridge 전달/Secret 복호화/Lambda 런타임/AI 모델 권한/실제 이메일/요금/삭제·재생성을 검증하지 않았습니다. 설치 전 과거 장애는 자동 수집하지 않으며 최초 ECS와 AIOps를 동시에 생성할 때 감지 준비 이전 오류는 놓칠 수 있습니다. 기존 정상 Backend 뒤에 AIOps를 설치하고 이후 실패를 안전한 테스트 환경에서 검증하세요.

정규식 마스킹은 완전하지 않고 AI 원인 후보는 확정이 아닙니다. DynamoDB/SNS 전달은 exactly-once가 아니며 캐시/게시 상태의 불확실 구간에서 중복이나 재시도 종료 후 손실이 가능합니다. 배치당 고유 장애 상한/신규 메일 상한을 넘으면 생략 지표를 남깁니다. 원본 payload DLQ를 추가하지 않은 초기 설계입니다. [비용·보안·한계](AIOPS_COST_SECURITY.md), [실제 측정 빈 양식](AIOPS_MEASUREMENTS.md)에 맞춰 나중에 관측한 결과만 성과로 기록하세요.
