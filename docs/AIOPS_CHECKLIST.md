# AIOps 사용자 작업 체크리스트

이번 구현에서는 AWS/OpenAI/SNS에 실제 요청하지 않았습니다. 아래 배포·키 등록·구독·유료 호출은 **사용자가 나중에 비용과 데이터를 확인한 후 직접 수행**합니다. 현재는 로컬 검사만 해도 됩니다.

## 지금 할 수 있는 로컬 확인

- [ ] Python3.13 가상환경을 만들고 잠긴 production/dev 의존성 설치. [명령](AIOPS_LOCAL_TEST.md).
- [ ] ruff check/format check, pytest 실행. 기본 테스트는 socket 연결을 막아 유료 호출을 방지함.
- [ ] 네 가지 합성 JSON 생성으로 DB/설정/timeout/500 시나리오 확인. 운영 DB나 사용자 데이터를 망가뜨리지 않음.
- [ ] build_aiops.sh로 Linux x86_64 CPython3.13 ZIP과 SHA256 생성. build 폴더는 Git 제외.
- [ ] Terraform fmt/init -backend=false/validate로 코드만 검사. 이 단계에 plan/apply/destroy를 추가하지 않음.

## 나중에 AWS를 사용할 때 — 사용자 준비

- [ ] 기존 Main Backend/ECS가 실제로 배포되었는지 확인. AIOps 때문에 VPC/ECS/RDS를 Console에서 중복 생성하지 않음.
- [ ] 처음에는 AI OFF/일일5회·신규 알림20개·중복30분을 유지할지 결정. 모든 비용이0원이라는 뜻은 아님.
- [ ] AI를 쓸 경우 OpenAI project API key/계정 모델 권한/usage/budget 확인. 실제 API 요금은 별도.
- [ ] AWS SSM SecureString 또는 Secrets Manager 단일 문자열로 키 직접 등록. Terraform에는 같은 계정/서울 ARN만 입력. 사용자 CMK라면 ARN/key policy도 확인.
- [ ] 수신 이메일 결정. 실제 이메일을 공개 예제/README/GitHub 로그에 넣지 않음. subscription endpoint는 민감 State에 저장됨.
- [ ] infra/terraform.tfvars에 enable_aiops/aiops_email/aiops_package_path/선택 key ARN/aiops_settings 입력. root .env나 VITE 변수에 OpenAI 키를 넣지 않음.
- [ ] ZIP이 최신 소스와 같은지 확인. Lambda 업데이트는 수동 Terraform 한 경로로만 수행하고 GitHub에서 별도 update-function-code 하지 않음.

## 나중에 배포 — Terraform 자동 생성 / 사용자 수동 승인

- [ ] [AIOPS_AWS_DEPLOYMENT](AIOPS_AWS_DEPLOYMENT.md)의 실제 명령과 비용을 확인한 뒤 Main plan 검토/사용자 apply. 이번 작업에서는 미실행.
- [ ] Lambda/IAM/CloudWatch Subscription/EventBridge Rules·targets/SNS Topic·subscription/DynamoDB/logs/alarm은 Terraform이 생성. Console에서 같은 자원을 수동으로 또 만들지 않음.
- [ ] SNS 확인 메일에서 Confirm subscription 클릭, SNS Console Confirmed 상태 확인. 재생성 후 다시 필요할 수 있음.
- [ ] Lambda의 VPC 미연결/256MB/60초/동시2개/Secret ARN만 존재 확인. 계정 concurrency 여유 확인.
- [ ] Backend ERROR 구독만 연결되고 Lambda 자신의 로그가 구독되지 않은지 확인.
- [ ] 실제 cluster/service만 EventBridge 필터에 들어가는지 확인. deployment 이벤트는 service ARN으로 제한.
- [ ] AI OFF 상태로 먼저 기본 알림 시험. Lambda 직접 합성 invoke는 이메일이 발송될 수 있어 별도 승인 후 실행.

## 나중에 검증·측정 — 실제 결과와 Mock 구분

- [ ] 테스트용 CloudWatch stream의 합성 ERROR가 구독→Lambda→SNS까지 전달되는지 확인.
- [ ] 별도 안전한 테스트 인프라에서 ECS Task 시작/비정상 종료/배포 실패를 재현하고 필터/메일을 확인. 운영 DB/실제 사용자 데이터 변경 금지.
- [ ] 정상 rolling/scaling/UserInitiated 종료는 알림이 없는지 확인.
- [ ] 반복 장애 중복 억제, UTC 일일 quota, Lambda 동시 요청의 DynamoDB 조건부 처리 확인.
- [ ] AI를 켜기 전에 마스킹/데이터 외부 전송 정책/모델/요금 확인. 한도 내1회부터 시험.
- [ ] AI 성공/401·429·timeout·schema 실패/한도 도달 시 한국어 기본 알림 확인.
- [ ] SNS 실패 재시도에서 캐시 재사용/Errors alarm 확인. 정확히1회 전달을 보장하지 않는다는 점 기록.
- [ ] SNS Publish 성공과 **실제 이메일 수신**을 각각 기록. [측정 양식](AIOPS_MEASUREMENTS.md)에 관측값만 입력.
- [ ] max_events 초과/알림 한도 초과의 생략 지표를 확인. 모든 장애를 무손실로 수신한다고 주장하지 않음.

## 종료·잔여 비용

- [ ] 필요한 로그/이메일/측정 결과를 안전하게 보존. 원문/개인정보를 포트폴리오에 공개하지 않음.
- [ ] 처리 중단 processing_enabled=false를 사용자가 먼저 반영해 정상 종료 오탐 최소화.
- [ ] 기존 Main의 DB/S3/ECR 정책을 검토하고 수동 destroy 절차 진행. Bootstrap은 유지. AIOps도 같은 State에서 정리됨.
- [ ] Lambda/Rule/targets/permissions/SNS Topic·subscription/DynamoDB/로그/알람/Role 삭제를 Console에서 확인.
- [ ] 사용자가 사전 등록한 OpenAI 키용 SSM/Secret/CMK는 별도 보관/삭제 판단. 필요 시 OpenAI key revoke.
- [ ] AWS Bills/Cost Explorer와 OpenAI usage를 별도로 확인. State/보존 로그/수동 Secret/잔존 리소스 비용이 남을 수 있음.
