# 사용자 수동 인프라 관리와 앱 배포

**이 문서의 AWS 쓰기/배포/삭제 명령은 이번 작업에서 실행하지 않았습니다. 사용자가 나중에 비용/계정/데이터 정책을 확인한 뒤 직접 실행할 예시입니다.** AWS 리소스를 만들지 않고 쓰려면 LOCAL만 사용하세요.

## 1. Bootstrap 및 Main 1차

[AWS_SETUP](AWS_SETUP.md)의 Bootstrap/SSO/도메인/Secret 준비가 선행됩니다. 기존 platform/live State가 있다면 먼저 [State 이전 검토](TERRAFORM_STRUCTURE.md)를 수행하고 새 Root를 바로 적용하지 마세요.

infra/terraform.tfvars에서 enable_backend=false/image_digest=""를 설정합니다. Main은 vpc/frontend/ecr/iam을 먼저 연결하고 이후 nat/alb/rds/ecs를 같은 State에 추가합니다. 이 단계도 VPC/S3/CloudFront/ECR/IAM 비용이 발생할 수 있습니다.

```bash
terraform -chdir=infra init -backend-config=backend.hcl
terraform -chdir=infra validate
terraform -chdir=infra plan -out=base.tfplan
# 사용자가 plan/비용/계정 확인 후에만
terraform -chdir=infra apply base.tfplan
terraform -chdir=infra output
```

출력된 ecr_url/frontend_bucket/cloudfront_id/github_roles를 기록합니다. ECS/RDS가 아직 없는 것은 정상이며 **LIVE 배포 성공이 아닙니다.** 정적 DEMO를 배포해 테스트할 수 있습니다.

## 2. 최초 Backend 이미지 — 사용자가 수동 업로드

ECR을 Main 1차에서 먼저 생성했기 때문에 다음 push가 가능합니다. 변경 가능한 latest 태그를 사용하지 않습니다.

```bash
ECR_URL=$(terraform -chdir=infra output -raw ecr_url)
REGISTRY=${ECR_URL%%/*}
REPOSITORY=${ECR_URL#*/}
TAG="manual-$(date +%Y%m%d%H%M%S)"
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin "$REGISTRY"
docker build --platform linux/amd64 -t "$ECR_URL:$TAG" backend
docker push "$ECR_URL:$TAG"
aws ecr describe-images --repository-name "$REPOSITORY" --image-ids imageTag="$TAG" --query 'imageDetails[0].imageDigest' --output text
```

출력 sha256 digest를 tfvars image_digest에 입력합니다. Apple Silicon도 Fargate의 X86_64에 맞춰 amd64로 빌드합니다. 자격증명/secret을 build arg에 넣지 않습니다.

## 3. Main 2차 — Backend 추가

실제 API DNS/Hosted Zone/서울 ACM, 7개 Secret ARN을 채우고 enable_backend=true로 바꿉니다. 같은 Main State이며 별도 LIVE Root/-target이 없습니다.

```bash
terraform -chdir=infra plan -out=backend.tfplan
# NAT/EIP/ALB/ECS/RDS 비용과 DB 정책을 사용자 검토 후
terraform -chdir=infra apply backend.tfplan
terraform -chdir=infra output
```

ECS desired/running≥1, 단일 deployment 완료, ALB target healthy, RDS available/private, 로그 Flyway migration 성공을 확인합니다. ECS 서비스는 steady state를 기다리지만 이 결과만으로 전체 앱 성공을 주장하지 마세요. 첫 기동은 동일 V1~V8 migration이 빈 RDS에 적용됩니다.

Flyway의 PostgreSQL 잠금은 동시 migration 실행을 조정합니다. 여러 task 배포 시 기존/새 코드가 잠시 공존하므로 additive migration→코드 전환→후속 제거 방식으로 호환성을 유지하세요. 배포 중 table/column 즉시 삭제와 migration checksum 수정을 피하고, 기존 버전 호환이 없으면 별도 점검 시간/전용 migration job을 계획하세요. 이번 작업에서 운영 migration job을 추가하지 않았습니다.

## 4. Frontend 배포

GitHub Environment/Variables를 채운 뒤 사용자가 앱 배포를 승인할 때만 AWS_DEPLOY_ENABLED=true로 설정합니다. frontend-deploy는 main push 또는 수동 실행, backend-deploy는 수동 실행입니다. 두 배포는 concurrency로 직렬화합니다. **GitHub Actions는 Terraform을 실행해 인프라를 생성·삭제하지 않습니다.**

```bash
# 인프라가 준비된 이후에만 사용자가 실행
gh workflow run frontend-deploy.yml --ref main
```

빌드/검사→OIDC→기존 bucket/CF 확인→assets 먼저/HTML 나중 업로드→index invalidation→정적 DEMO smoke를 수행합니다. runtime-config를 덮어쓰지 않고 old hash assets도 즉시 삭제하지 않습니다. 직접 배포하려면 같은 절차를 사용합니다.

```bash
npm --prefix frontend ci
npm --prefix frontend run build
FRONTEND_BUCKET=$(terraform -chdir=infra output -raw frontend_bucket)
CF_ID=$(terraform -chdir=infra output -raw cloudfront_id)
aws s3 sync frontend/dist/assets "s3://$FRONTEND_BUCKET/assets" --cache-control 'public,max-age=31536000,immutable'
aws s3 sync frontend/dist "s3://$FRONTEND_BUCKET" --exclude 'assets/*' --exclude runtime-config.json --cache-control 'no-cache,max-age=0'
aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths /index.html
```

CloudFront 기본 HTTPS 도메인 `/`, `/news`, `/calendar`, `/transit`, `/my`, `/settings` 직접 진입/새로고침을 확인합니다(실제 router를 기준으로 사용). 없는 JS/CSS는 index200이 아닌 오류여야 합니다. `/move`,`/mypage`는 요청 예시이며 현 프로젝트 실제 주소가 아닙니다. STATIC_DEMO에서는 `/api` 요청 없이 샘플을 표시합니다.

## 5. API smoke와 LIVE 활성화

```bash
FRONTEND_URL=$(terraform -chdir=infra output -raw frontend_url)
node scripts/smoke-api.mjs "$FRONTEND_URL"
# 위 smoke 성공 후에만 사용자가 공개 runtime 갱신
export PUBLIC_KAKAO_MAP_KEY=실제_공개_JavaScript_키
ALLOW_AWS_MUTATIONS=I_UNDERSTAND_COSTS python3 scripts/set-runtime.py --mode LIVE --bucket "$FRONTEND_BUCKET" --distribution "$CF_ID"
```

Kakao SDK의 HTTPS 서비스 도메인에 실제 CF/custom frontend origin을 등록합니다. REST 키를 PUBLIC_KAKAO_MAP_KEY에 쓰지 마세요.

LIVE에서 테스트 계정 가입→onboarding→로그인/refresh/logout→위젯 저장→날씨/환율/뉴스→장소/길찾기/즐겨찾기→일정CRUD→사용자별 저장→모바일 HTTPS/GPS를 확인합니다. Cookie HttpOnly/Secure/Lax와 CSRF 실패403, unauth401, 로그 requestId/한글 성공 로그를 함께 확인합니다. 실제 외부 API quota/승인이 필요하며 이번에는 AWS에서 수행하지 않았습니다.

## 6. 이후 Backend 앱 배포와 rollback

```bash
gh workflow run backend-deploy.yml --ref main
```

기존 ECR/ECS가 없으면 원인을 표시하고 중단합니다. 새 digest push→최신 task family 설정의 image만 교체→revision 등록→service update→wait→**현재 service revision이 신규 revision인지 확인**→same-origin API smoke→runtime LIVE 순서입니다. Circuit breaker가 구버전으로 rollback되어 waiter가 성공해도 신규 revision 검사가 이를 실패로 처리합니다.

Terraform은 환경/역할/Secret/네트워크와 task template을 관리하고, service의 task_definition은 ignore_changes로 CI의 최신 revision을 되돌리지 않습니다. Terraform으로 CPU/env/Secret을 변경하면 새 revision이 등록되지만 서비스는 자동 전환되지 않습니다. 반드시 backend-deploy를 이어 실행해 최신 family 설정을 반영하세요. image_digest tfvar도 현재 성공 digest로 갱신하면 재생성 시 구버전 이미지 혼동을 줄일 수 있습니다.

배포 실패 시 기존 정상 서비스를 임의 삭제하지 않습니다. ECS circuit breaker/events/CloudWatch 로그를 확인하고 필요하면 사용자가 직전 정상 task revision으로 update-service합니다. DB migration이 비호환이면 image rollback만으로 복구되지 않을 수 있습니다. 실제 AWS rollback 검증은 남아 있습니다.

## 7. 종료 — Main 전체 삭제, Bootstrap 유지

1. GitHub AWS_DEPLOY_ENABLED=false, 실행 중 앱 배포가 없는지 확인합니다. 사용자 데이터/필요한 로그/ALB·ECS 오류 근거를 안전한 저장소에 보존합니다. CloudWatch 로그도 Main 삭제 대상입니다.
2. live 사용 중이면 공개 runtime을 STATIC_DEMO로 바꾸고 invalidation을 기다려 개인정보 요청을 중단합니다. Main 전체 삭제 후에는 DEMO 사이트도 사라집니다.
3. DB protect는 그대로 destroy할 수 없습니다. 테스트 데이터만임을 확인한 뒤 tfvars에 database_disposal="snapshot" 또는 "discard", ephemeral_database_ack=true를 설정합니다. snapshot이면 매번 고유 final_snapshot_identifier가 필요합니다. snapshot은 삭제 후에도 과금됩니다. 보호 해제는 일반 plan/apply로 먼저 반영합니다.
4. S3 버전/삭제 마커 전체와 ECR 이미지를 검토/필요한 파일을 백업합니다. 기본 allow_storage_cleanup=false는 비어 있지 않은 저장소의 삭제를 막습니다. 수동으로 비우거나, **모든 버전/이미지 삭제에 동의한 테스트 저장소에 한해** allow_storage_cleanup=true를 설정하고 일반 plan/apply로 반영합니다.

```bash
# 아래 명령은 사용자가 데이터/로그/DB/S3/ECR 검토 후에만 직접 실행
terraform -chdir=infra plan -out=cleanup-policy.tfplan
terraform -chdir=infra apply cleanup-policy.tfplan
terraform -chdir=infra plan -destroy -out=destroy.tfplan
terraform -chdir=infra show destroy.tfplan
# 삭제 대상을 최종 확인한 경우 저장된 동일 plan만 적용
terraform -chdir=infra apply destroy.tfplan
# terraform destroy는 같은 목적의 대안이며 두 번 실행할 필요가 없습니다.
```

Main에 있는 VPC/서브넷/CF/S3/ECR/로그/IAM/ALB/ECS/RDS/NAT/EIP가 전부 삭제 대상인지 검토합니다. Bootstrap 디렉터리에서 destroy하지 마세요. force cleanup은 기본 true가 아니며 실제 사용자 데이터를 임의로 지우지 않습니다.

## 8. 잔여 비용 확인과 재배포

삭제 후 Console에서 VPC→NAT Gateways(deleted)/Elastic IPs(해제), EC2→Load Balancers(없음), ECS services/tasks(실행0), RDS databases(없음)/snapshots(보존 의도 확인), S3/ECR/CloudFront/CloudWatch logs·alarms/IAM 역할을 각각 확인합니다. NAT 삭제와 EIP 해제는 별개입니다. 공유 VPC ENI/SG 의존, RDS deletion protection, snapshot 이름 충돌, S3 object versions, ECR images, CloudFront 배포 중 상태, IAM 연결/권한 때문에 삭제가 실패할 수 있습니다. State를 지우지 말고 실패 자원을 해결한 뒤 새 destroy plan을 검토합니다.

State bucket, 사용자 선행 Secret/ACM/DNS/공유 OIDC, 수동 snapshot/backup, 내보낸 로그 저장소, Budgets/SNS 등의 잔존 비용은 별도입니다. Cost Explorer/Bills는 반영 지연이 있으므로 다음 집계도 확인합니다. 무료라고 가정하지 않습니다.

재배포는 같은 Main에서 enable_backend=false/image_digest=""/allow_storage_cleanup=false로 기반을 다시 만들고, 이미지 업로드→true/digest→Backend→정적 배포→smoke→runtime LIVE를 반복합니다. test DB는 새로 생성되며 snapshot 복구를 원하면 restore_snapshot_identifier/db_name/Secret/rotation 동작을 별도 검증하세요. ECR도 Main과 함께 삭제되므로 이전 digest가 남아 있다고 가정하지 않습니다.

## 선택적 AIOps

기존 8개 인프라 모듈과 같은 Main State에 선택적 aiops를 연결했습니다. 기본은 리소스 OFF/AI OFF입니다. 로컬 Python 검사→Linux Lambda ZIP 빌드→사용자 ARN/이메일/설정 준비→명시적 수동 인프라 절차 순서입니다. 실제 리소스 생성/이메일 발송/유료 API는 이번 작업에서 하지 않았습니다. [AIOPS 배포/종료 절차](AIOPS_AWS_DEPLOYMENT.md), [비용/보안](AIOPS_COST_SECURITY.md), [사용자 체크리스트](AIOPS_CHECKLIST.md)를 따르세요. Main 전체 삭제에는 AIOps 상태/구독/함수도 포함되고 사전 등록 Secret은 별도 관리합니다.
