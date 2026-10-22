# AIOps 미래 사용자 배포 절차

**아래 AWS 조회·쓰기/실제 GPT 요청/이메일 발송/plan·apply·destroy는 이번 작업에서 실행하지 않았습니다. 비용을 이해한 사용자가 나중에 직접 수행할 절차입니다. GitHub Actions는 이를 자동 실행하지 않습니다.**

## 1. 준비

기존 [AWS_SETUP](AWS_SETUP.md)과 [DEPLOYMENT](DEPLOYMENT.md)에 따라 실제 Main의 Backend가 준비되어야 합니다. AIOps만 별도 Root/State로 생성하지 않습니다. AWS 실행 권한은 사용자의 단기 SSO/IAM role이고 GitHub 앱 배포 역할에 Lambda/Terraform 관리 권한을 추가하지 않습니다.

OpenAI API의 project별 키를 준비하고 usage/budget를 확인합니다. AWS Console→SSM Parameter Store→Create parameter에서 `/dailybriefing/aiops/openai-api-key` 같은 사용자 이름으로 SecureString을 등록하거나 Secrets Manager에 단일 SecretString으로 저장합니다. Console에서 표시되는 **ARN**을 복사합니다. 이 기능이 사용할 키 원문을 Terraform/env 예제/GitHub/명령 히스토리에 넣지 않습니다. AI OFF로 기본 알림만 시험할 때는 키 등록이 필수 아닙니다.

받을 개인 이메일을 결정합니다. Terraform은 SNS Topic/subscription을 생성하지만 수신자는 직접 Confirm subscription을 눌러야 합니다. 재생성 때 다시 확인해야 할 수 있습니다. PendingConfirmation 상태에서는 Publish 성공이어도 메일을 못 받습니다.

## 2. 로컬 패키징·Terraform 설정

먼저 [로컬 검사](AIOPS_LOCAL_TEST.md)와 ZIP 빌드를 수행합니다. `infra/terraform.tfvars`의 기존 값은 유지하고 다음을 추가합니다.

```hcl
enable_backend = true
enable_aiops = true
aiops_email = "사용자가_직접_설정할_실제_이메일"
aiops_package_path = "../lambda/aiops/build/aiops.zip"
# 처음에는 AI OFF로 감지/SNS만 확인. 원문 키가 아닌 같은 계정/서울 ARN.
aiops_openai_key_arn = ""
aiops_settings = {
  processing_enabled = true
  ai_enabled = false
  daily_limit = 5
  notification_limit = 20
}
```

AI를 실제 활성화할 때만 `ai_enabled=true`, `model="gpt-4.1-mini"` 등 계정에서 지원하는 모델과 aiops_openai_key_arn을 입력합니다. 모델은 예시이며 latest/최저가 보장이 아닙니다. CMK가 있으면 aiops_secret_kms_key_arn과 key policy도 준비합니다. API 비용은 이때부터 발생할 수 있습니다.

Root는 실제 module.ecs 출력을 연결하므로 log group/cluster/service를 수동 추정하지 마세요. ZIP이 없으면 활성화 plan/apply에서 build 스크립트를 먼저 실행하라는 precondition이 실패합니다. 파일 해시로 코드 변경을 추적합니다.

## 3. 사용자가 수동 생성 (미실행 명령)

```bash
# 기존 Main Backend가 준비된 사용자 환경에서만
AIOPS_PYTHON=.venv/bin/python bash scripts/build_aiops.sh
terraform -chdir=infra init -backend-config=backend.hcl
terraform -chdir=infra validate
terraform -chdir=infra plan -out=aiops.tfplan
# 사용자 계정/변경 목록/비용/기존 자원 영향 확인 후에만 직접 실행
terraform -chdir=infra apply aiops.tfplan
terraform -chdir=infra output aiops
```

Lambda/SNS/DynamoDB/Role/policy/log group/Subscription/두 EventBridge Rule/targets/invoke permissions/Lambda Errors alarm이 같은 Main에 추가됩니다. 기존 8개 모듈이 의도 없이 삭제·재생성되는 plan이면 중단하세요. Lambda는 VPC 연결 없음/256MB/60초/동시2개, account의 concurrency 여유도 확인합니다.

## 4. Console 검증

- Lambda→해당 함수: Python3.13/x86_64/handler.lambda_handler, 환경값에 Secret ARN만 있고 원문이 없는지 확인.
- CloudWatch→Backend log group→Subscription filters: ERROR 패턴/해당 Lambda, Lambda 자신의 log group은 구독되지 않음.
- EventBridge→Rules: 실제 cluster+service task STOPPED의 허용 stopCode와 실제 service ARN의 deployment failure만 전달.
- DynamoDB→table: pk/On-Demand/TTL expires_at/암호화 확인. quota/알림 캐시는 민감 상태이므로 필요 인원만 읽기.
- SNS→Subscriptions: 확인 메일에서 Confirm한 뒤 상태 Confirmed 확인. 필요한 권한/Topic policy가 알림 경로를 허용하는지 점검.
- CloudWatch→Lambda log group: 지표 JSON에 원문/키/이메일이 없는지 확인.

## 5. 안전한 장애 검증

실제 운영 DB/사용자 설정을 망가뜨리지 않습니다. [합성 이벤트 생성](AIOPS_LOCAL_TEST.md)은 로컬에서만 먼저 확인합니다. 실제 Lambda invoke/SNS 테스트는 수신자가 메일을 받는 **유료 가능 작업**입니다. 사용자가 승인한 후에만 다음을 실행합니다.

```bash
python3 scripts/aiops_mock_event.py timeout > /tmp/aiops-timeout.json
# FUNCTION_NAME은 terraform output aiops의 실제 function_name
aws lambda invoke --function-name "$FUNCTION_NAME" --cli-binary-format raw-in-base64-out --payload fileb:///tmp/aiops-timeout.json /tmp/aiops-invoke-result.json
```

직접 invoke는 Python 처리/SNS만 확인하고 실제 CloudWatch subscription/EventBridge 전달은 검증하지 않습니다. 별도 승인된 테스트용 CloudWatch log stream에 합성 ERROR 한 줄을 남겨 전체 Logs 경로를 검증하세요. 처음에는 AI OFF 상태에서 기본 이메일을 확인합니다. 같은 오류 반복 시 DynamoDB SENT/중복 지표와 추가 메일 억제를 확인합니다.

ECS 경로는 별도 테스트용 Main/테스트 데이터에서만 잘못된 이미지 digest·필수 설정 등 의도한 실패를 재현하고 원상 복구합니다. 실제 DB/개인 데이터가 있는 서비스의 SG/비밀번호를 고의 변경하지 마세요. 실제 ECS TaskFailedToStart/배포 실패 이벤트의 필터/중복/메일 수신을 확인하고 정상 rolling/scaling/사용자 종료는 알림이 없어야 합니다. 합성 입력만 통과했다고 실제 AWS 감지 성공으로 기록하지 않습니다.

AI를 켠 뒤에는 마스킹된 입력 정책/모델 권한을 검토하고 1회부터 확인합니다. 401/429/timeout/schema 거부 시 한국어 기본 알림, 일일 GPT 제한 도달 시 분석 생략 안내, SNS Publish 실패 시 Lambda 재시도와 Errors alarm을 확인합니다. 실제 API 오류 유발도 별도 테스트 환경/작은 한도에서만 수행합니다.

## 6. 운영·배포·삭제

코드 변경은 로컬 검사→ZIP 재생성→사용자 Main plan/apply입니다. GitHub Actions가 별도로 update-function-code를 호출하지 않습니다. 감지 중단은 aiops_settings.processing_enabled=false를 사용자가 검토해 먼저 반영하고, 전체 종료는 기존 Main 삭제 절차를 따릅니다. AIOps만 끄려면 enable_aiops=false의 삭제 목록을 사용자 검토합니다.

전체 Main destroy에서는 Lambda/permissions/subscriptions/EventBridge targets·rules/SNS email/topic/DynamoDB/알람/AIOps logs도 정리됩니다. Bootstrap은 유지합니다. DB protect와 S3/ECR 정리 절차는 기존 [DEPLOYMENT](DEPLOYMENT.md)를 따라야 합니다. 삭제 전 필요한 로그/알림 근거를 안전하게 보관하고 대기 중인 호출이 없는지 확인하세요. subscription 권한/PendingConfirmation, 로그 보존, IAM 역할 연결, 수동 자원 의존으로 삭제가 실패할 수 있어 실제 계정 검증이 필요합니다.

삭제 후 Console에서 함수/Rule/Subscription/Topic/Table/로그/알람/Role이 없는지 확인합니다. 사용자 선행 OpenAI 키용 SSM/Secret/CMK는 자동 생성하지 않았으므로 자동 삭제도 하지 않습니다. 보관/삭제와 잔여 비용을 직접 결정하고 OpenAI key revoke/usage, AWS Bills/Cost Explorer를 확인합니다. 실제 AWS cleanup/이메일 수신/과금은 이번 로컬 작업의 미검증 항목입니다.
