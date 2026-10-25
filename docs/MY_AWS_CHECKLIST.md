# Daily Briefing — 내가 해야 하는 AWS 작업

**지금은 비용을 발생시키는 명령을 실행할 필요가 없습니다. 아래는 나중에 사용자가 직접 승인하고 수행할 체크리스트입니다. 이번 작업에서 AWS 리소스/계정 작업은 하지 않았습니다.**

## 1. 최초 준비 — 사용자

- [ ] CLI v2/Terraform1.12.2/Docker/Node22+/Java21 설치. `terraform version`, `docker version` 확인.
- [ ] AWS Console 우상단 Account ID/서울 리전 확인, Identity Center/SSO 단기 인증. `aws sts get-caller-identity`의 Account가 예상 값과 일치하는지 확인. root/장기 키를 GitHub에 넣지 않기.
- [ ] EC2→Availability Zones에서 2개 AZ를 확인하고 availability_zones 입력. 초기 task/RDS/NAT는 AZ-A, 완전 HA가 아님.
- [ ] 정적 DEMO만 먼저 사용할지 LIVE까지 만들지 결정. 도메인 없이 DEMO는 CF 기본 HTTPS 가능. LIVE는 실제 API 도메인 필요.
- [ ] LIVE 사용 시 Route53→Public Hosted Zone ID, 서울 ACM→실제 API FQDN의 ISSUED ARN 준비. frontend custom domain을 쓰면 us-east-1 ACM과 DNS도 준비. 예시 도메인을 실제 값으로 사용하지 않기.
- [ ] SSM Parameter Store SecureString/Secrets Manager에 JWT 및 6개 외부 API 설정 등록. [전체 표](ENVIRONMENT_VARIABLES.md) 참고. 키 원문 대신 ARN을 기록. KMA/KASI는 Decoding 원본.
- [ ] IAM→Identity providers에서 GitHub OIDC 존재 확인. 기존 ARN 재사용 또는 없을 때만 생성 설정. ECS/RDS service-linked Role 존재/관리 권한 확인.
- [ ] Billing→Budgets에서 개인 한도/알림 설정. Cost Allocation Tags 활성화. NAT/ALB/RDS/Secret/저장소 등은 유료 가능.

## 2. 설정과 Bootstrap — 사용자 입력 / Terraform 자동 생성 구분

- [ ] `infra/bootstrap/terraform.tfvars.example` 복사 후 aws_account_id/state_bucket_name 입력. bucket은 전역 고유 이름. **State bucket을 Console에서 별도로 중복 생성하지 않기.**
- [ ] Bootstrap init/validate/plan 검토. 사용자가 비용 확인 후에만 apply. [정확한 명령](AWS_SETUP.md).
- [ ] S3 Console에서 versioning/encryption/public block 확인. Bootstrap local State 안전하게 백업 후 backend.tf/hcl 복사, init -migrate-state. bootstrap key 확인.
- [ ] Main backend.hcl.example을 복사해 실제 bucket/main key 입력. 실제 파일/State/plan은 Git 제외.
- [ ] Main terraform.tfvars.example을 복사해 계정/이름/OIDC/AZ/Secret ARN 설정. 처음 enable_backend=false/image_digest="". storage cleanup=false/DB protect 유지.
- [ ] 기존 State가 이미 있다면 [이전 검토](TERRAFORM_STRUCTURE.md)부터 진행. 새 Root를 무조건 apply하지 않기.

## 3. 기반·이미지·Backend 생성 — 사용자가 CLI, Terraform이 자원 생성

- [ ] Main init/validate/1차 plan을 검토하고 사용자 수동 apply. VPC/subnet/IGW/S3/OAC/CF/ECR/IAM은 Terraform이 생성하므로 Console에서 따로 만들지 않기.
- [ ] output의 ecr_url/frontend_bucket/cloudfront_id/github_roles 기록. backend_enabled=false면 아직 LIVE 성공이 아님.
- [ ] [최초 이미지 명령](DEPLOYMENT.md)으로 amd64 image build/ECR login/push. immutable sha256 digest 확인.
- [ ] tfvars에 digest/실제 API DNS/서울 ACM/7개 Secret ARN을 입력하고 enable_backend=true. 같은 Main State에서 2차 plan 검토 후 사용자 apply.
- [ ] ECS→Service running≥1/새 deployment 완료, EC2→Target Group healthy, RDS→available/private, CloudWatch→Flyway V1~V8 성공 확인.
- [ ] NAT/EIP/ALB/DB를 수동 생성하지 않기. ECS의 ECR/Secret/외부 API HTTPS 접근은 NAT 경로로 처리됨.

## 4. 애플리케이션 배포 — 사용자 승인 / GitHub Actions 자동

- [ ] GitHub Settings→Environments frontend/backend에 main 제한/Required reviewers 설정. 실제 지원 플랜의 보호 기능 확인.
- [ ] Main output으로 GitHub Variables 작성: 계정/bucket/CF/url/두 role/ECR/cluster/service/family. 공개 Kakao JS key와 실제 SDK domain 등록.
- [ ] 배포할 때만 AWS_DEPLOY_ENABLED=true. 인프라 생성·삭제 Workflow는 없으며 Actions는 앱 배포만 수행함.
- [ ] frontend-deploy 실행/승인. CF URL과 실제 라우트 직접 접근/새로고침, STATIC_DEMO 샘플 표시/API 요청0 확인.
- [ ] same-origin `/api/v1/health` 200/UP, CSRF/unauth smoke 성공 후 runtime LIVE로 전환. 서버 Secret을 runtime 파일에 넣지 않기.
- [ ] 최초 이미지: backend Environment의 계정/Role/ECR만 등록, Repository AWS_DEPLOY_ENABLED=true 및 AWS_BACKEND_DEPLOY_ENABLED=false로 Actions 업로드. Summary digest를 tfvars에 입력.
- [ ] Backend/API DNS 준비 후 AWS_BACKEND_DEPLOY_ENABLED=true. 이후 backend-deploy 실행 시 image push→revision/service→새 revision 확인→API smoke→LIVE 전환 성공 확인. 구 revision rollback은 실패로 처리됨.
- [ ] Terraform으로 env/CPU/Secret을 변경했다면 backend-deploy까지 실행해 새 template 반영. Secret rotation 후에도 재배포 필요.

## 5. 실제 서비스 확인 — 사용자

- [ ] 테스트 전용 계정 가입/onboarding/login/refresh/logout. Cookie HttpOnly/Secure/Lax 및 CSRF403/권한401 확인.
- [ ] 위젯 추가/삭제/순서 저장 및 로그인 후 유지.
- [ ] 날씨/환율/뉴스 5분야 조회, 실제/샘플 상태 구분, 개별 API 오류 메시지/로그 requestId 확인.
- [ ] 카카오 장소 검색/현재 위치 권한/경로1개/즐겨찾기, 개인 캘린더CRUD/공휴일 확인.
- [ ] 모바일 HTTPS/GPS/지도와 Dark theme 확인. 실제 외부 API의 신청/권한/쿼터는 별도 확인.

## 6. 종료 — 사용자 검토가 먼저

- [ ] AWS_DEPLOY_ENABLED=false, 실행 중 배포 중단/완료 확인. 필요한 CloudWatch 로그/테스트 결과/데이터를 안전하게 보존.
- [ ] Backend를 내리기 전 runtime STATIC_DEMO 전환 가능. **Main 전체 삭제 후에는 DEMO 사이트도 사라짐.**
- [ ] DB가 테스트 데이터인지 확인하고 protect→snapshot/discard 정책 결정. snapshot은 고유 이름과 잔여 보관 비용 확인, ephemeral_database_ack=true. 일반 plan/apply로 보호 해제 선반영.
- [ ] S3의 모든 object version/delete marker와 ECR image를 확인/백업. 기본 false 유지 시 수동 비우기, 또는 테스트 저장소 전체 삭제를 명시 승인한 경우에만 allow_storage_cleanup=true 일반 plan/apply.
- [ ] Main `plan -destroy`에서 실제 삭제 목록 확인. Bootstrap/state bucket이 포함되지 않는지 확인. [삭제 명령](DEPLOYMENT.md).
- [ ] 사용자가 검토한 동일 destroy plan만 수동 적용. DB/기존 파일을 임의 삭제하거나 State를 지워 오류를 숨기지 않기.
- [ ] VPC NAT deleted/EIP 해제, ALB 없음, ECS running0, RDS 없음, S3/CF/ECR/로그/알람 삭제를 Console에서 확인.
- [ ] State bucket, 사용자 Secret/인증서/Hosted Zone/공유 OIDC/보존 snapshot/백업/외부 로그의 잔여 비용 확인. Cost Explorer 지연 후 Bills도 다시 확인.

## 7. 재사용

- [ ] 재배포는 false로 기반 생성→새 ECR push→true와 새 digest→Backend→Frontend→smoke 순서 반복. 이전 삭제된 ECR digest 재사용을 가정하지 않기.
- [ ] allow_storage_cleanup=false/DB protect를 다시 기본으로 복원. 필요하면 snapshot 복구를 별도 테스트. 이번 AWS 실제 복구/배포는 미검증.

## 선택적 AIOps (기본 OFF)

- [ ] [AIOPS_CHECKLIST](AIOPS_CHECKLIST.md)에 따라 로컬 Python 검사/ZIP부터 확인.
- [ ] OpenAI 키/이메일/ARN/데이터 정책/한도는 실제 배포 시 사용자 준비.
- [ ] 기존 Main State의 선택적 aiops만 활성화. 별도 Root/State 생성하지 않기.
- [ ] 실제 API/SNS/이메일 검증과 정리는 사용자가 비용을 승인한 후 직접 수행. 이번 작업에서는 미실행.
