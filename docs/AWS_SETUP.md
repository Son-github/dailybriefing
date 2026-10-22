# AWS 최초 준비

**아래 AWS/plan/apply 명령은 향후 사용자가 비용을 확인하고 직접 실행할 절차입니다. 이번 작업에서는 실행하지 않았습니다.** 현재는 로컬만 사용해도 됩니다. 실제 배포 검증 결과로 읽지 마세요.

## 계정과 도메인

AWS CLI v2, Terraform 1.12.2(코드 허용 >=1.11,<2), Docker, Node22.13+, Java21을 준비합니다. IAM Identity Center/SSO 또는 단기 role을 사용하고 root 계정/장기 Access Key를 GitHub에 넣지 않습니다.

```bash
aws configure sso
aws sso login --profile 실제프로필
export AWS_PROFILE=실제프로필
export AWS_REGION=ap-northeast-2
aws sts get-caller-identity
aws ec2 describe-availability-zones --region ap-northeast-2
terraform version
```

계정 ID와 예상 계정이 일치해야 합니다. 위 조회도 이번에는 실행하지 않았습니다. IAM 관리자는 Terraform을 직접 실행하는 사용자에게 network/ALB/ECS/RDS/CF/S3/ECR/IAM/OIDC/로그/알람/해당 DNS/SSM·SM 참조에 필요한 권한과 State lock 권한을 준비해야 합니다. GitHub 앱 배포 role은 인프라 생성 권한을 대신하지 않습니다.

CloudFront 기본 도메인으로 HTTPS 정적 DEMO를 제공할 수 있습니다. LIVE는 실제 사용자 소유 API 도메인/Public Hosted Zone/서울 ACM ISSUED 인증서가 필요합니다. frontend custom domain은 선택이고 us-east-1 ACM과 DNS alias/CNAME이 필요합니다. 도메인이 없으면 `enable_backend=false`, api_hostname=""로 정적 DEMO까지만 준비할 수 있습니다. HTTP 인증 우회는 제공하지 않습니다.

## 사용자가 준비하는 Secret

SSM Parameter Store→Create parameter→SecureString 또는 Secrets Manager→Store a new secret에 아래 이름의 원문을 등록합니다. Terraform이 중복 생성하지 않습니다.

JWT_SECRET, KMA_API_KEY, KASI_API_KEY, KAKAO_REST_API_KEY, KOREA_EXIM_API_KEY, NAVER_API_CLIENT_ID, NAVER_API_CLIENT_SECRET.

`application_secrets`에는 **동일 계정/서울 ARN**만 입력합니다. SSM은 SecureString 값, SM은 이 앱 설정에서 전체 SecretString이 환경값으로 쓰이므로 단일 문자열로 저장하세요(JSON 여러 키는 자동 추출하지 않음). DB username/password는 입력하지 않습니다. RDS managed secret을 ECS가 JSON key로 주입합니다. CMK가 있으면 secret_kms_key_arns와 KMS key policy를 모두 확인합니다. API 신청/Decoding 키 기준은 [API_SETUP](API_SETUP.md), 전체 변수는 [ENVIRONMENT_VARIABLES](ENVIRONMENT_VARIABLES.md)입니다.

IAM→Identity providers에서 GitHub OIDC가 이미 있으면 ARN을 재사용합니다. 없을 때만 create_github_oidc_provider=true를 선택합니다. 공유 OIDC/서비스 연결 Role을 다른 프로젝트와 함께 사용한다면 Main에서 새로 관리하지 않습니다. ECS/RDS service-linked Role이 없으면 관리자 생성 권한을 준비하고 create_service_linked_roles 설정을 검토합니다.

## Bootstrap — State 저장소만

먼저 예제 파일을 복사해 **실제 고유 bucket 이름/계정 ID**를 작성합니다. 예제의 REPLACE 값으로 실행하지 마세요.

```bash
cp infra/bootstrap/terraform.tfvars.example infra/bootstrap/terraform.tfvars
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap validate
terraform -chdir=infra/bootstrap plan -out=bootstrap.tfplan
# 사용자가 생성 자원/비용/계정 확인 후에만
terraform -chdir=infra/bootstrap apply bootstrap.tfplan
terraform -chdir=infra/bootstrap output
```

처음은 local State입니다. 안전한 경로에 local State를 백업한 후 다음을 사용자가 실행합니다.

```bash
cp infra/bootstrap/backend.tf.example infra/bootstrap/backend.tf
cp infra/bootstrap/backend.hcl.example infra/bootstrap/backend.hcl
# backend.hcl의 bucket을 실제 출력값으로 수정
terraform -chdir=infra/bootstrap init -migrate-state -backend-config=backend.hcl
```

S3에서 bootstrap/terraform.tfstate와 versioning을 확인합니다. 실제 State/plan은 민감한 계정 메타데이터이며 Git에 올리지 않습니다. State 버킷은 일반 Main 삭제 대상이 아니고 prevent_destroy/force_destroy=false입니다. [State 복구/이전](TERRAFORM_STRUCTURE.md)을 확인하세요.

## Main 설정과 GitHub

```bash
cp infra/backend.hcl.example infra/backend.hcl
cp infra/terraform.tfvars.example infra/terraform.tfvars
# 파일을 열어 실제 계정/State bucket/frontend bucket/OIDC/Secret ARN 등을 입력
```

Main backend.hcl의 key는 main/terraform.tfstate입니다. Root에는 state_bucket_name tfvar가 없으며 backend 설정에서 지정합니다. State 인증정보를 backend.hcl에 넣지 않습니다.

GitHub Settings→Environments에 frontend/backend를 만들고 Required reviewers/main 제한을 설정합니다. Repository Variables/Environment Variables에는 [환경변수 표](ENVIRONMENT_VARIABLES.md)의 Main output 값을 등록합니다. AWS_DEPLOY_ENABLED는 **기본 false/미설정 유지**입니다. 배포 시점에만 사용자가 true를 설정합니다. Workflow 파일 작성만으로 인프라가 생성되지 않습니다.

AWS Budgets→Create budget에서 사용자 비용 한도와 알림 주소를 설정하고 Cost Allocation Tags에서 Project/Environment를 활성화합니다. 자동 생성했다고 가정하지 않습니다. 실제 요금은 [AWS Pricing](https://aws.amazon.com/pricing/)에서 서울 리전/사용량 기준으로 확인하세요.

준비 후 단계별 생성·이미지 업로드·배포·삭제는 [DEPLOYMENT](DEPLOYMENT.md), 체크박스는 [MY_AWS_CHECKLIST](MY_AWS_CHECKLIST.md)를 따르세요.

## 선택적 AIOps

기존 8개 인프라 모듈과 같은 Main State에 선택적 aiops를 연결했습니다. 기본은 리소스 OFF/AI OFF입니다. 로컬 Python 검사→Linux Lambda ZIP 빌드→사용자 ARN/이메일/설정 준비→명시적 수동 인프라 절차 순서입니다. 실제 리소스 생성/이메일 발송/유료 API는 이번 작업에서 하지 않았습니다. [AIOPS 배포/종료 절차](AIOPS_AWS_DEPLOYMENT.md), [비용/보안](AIOPS_COST_SECURITY.md), [사용자 체크리스트](AIOPS_CHECKLIST.md)를 따르세요. Main 전체 삭제에는 AIOps 상태/구독/함수도 포함되고 사전 등록 Secret은 별도 관리합니다.
