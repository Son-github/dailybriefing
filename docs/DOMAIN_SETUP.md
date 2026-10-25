# 가비아 DNS로 도메인 연결 — Route 53 미사용

가비아에서 구매한 `dailybriefing-son.site`의 무료 DNS를 유지합니다. Route 53 Hosted Zone이나 DNS 레코드는 Terraform에서 생성하지 않습니다. AWS 실제 변경, plan/apply/destroy는 사용자가 직접 진행합니다.

## 주소 구성

| 주소 | 역할 |
| --- | --- |
| `https://www.dailybriefing-son.site` | CloudFront → S3 화면 |
| `https://www.dailybriefing-son.site/api/v1/...` | CloudFront → API 원본 → ALB → ECS |
| `api.dailybriefing-son.site` | Backend 준비 후 ALB에 연결하는 원본 주소 |

`www`와 `api`는 별도 구매가 필요 없는 하위 도메인입니다. 루트 `dailybriefing-son.site`에는 일반 CNAME을 사용할 수 없으므로 지금은 `www`를 대표 주소로 사용합니다. 루트 주소의 자동 이동은 별도 기능이며, 가비아 포워딩의 HTTPS 지원까지 확인하기 전에는 제공된다고 가정하지 않습니다. CloudFront IP를 복사하여 A 레코드에 고정하지 않습니다.

## 1. Terraform으로 화면 인증서 요청

가비아 네임서버를 유지합니다. 이미 Route 53으로 네임서버를 변경했다면 기존 MX/TXT 등 필요한 레코드를 가비아로 옮긴 후 가비아 네임서버로 복구해야 합니다. 기존 Hosted Zone이 있다면 이 코드 변경만으로 삭제되거나 과금이 중단되지는 않습니다.

로컬 `infra/terraform.tfvars`는 다음 1차 설정으로 준비되어 있습니다. 기존 계정·버킷·Secret ARN은 유지합니다.

```hcl
frontend_hostname           = "www.dailybriefing-son.site"
manage_frontend_certificate  = true
frontend_certificate_arn     = ""
frontend_domain_enabled      = false

enable_backend = false
enable_aiops   = false
```

`manage_frontend_certificate=true`는 인증서를 Terraform으로 관리한다는 뜻입니다. `frontend_domain_enabled=false`는 아직 화면 도메인을 연결하지 않고 인증서 요청만 한다는 뜻입니다. 인증서 Pending 상태로 첫 적용이 오래 대기하지 않도록 두 단계를 분리했습니다. CloudFront와 ECS가 사용하는 화면 URL은 연결 단계까지 기존 기본 주소를 유지합니다.

사용자가 실행:

```bash
cd /Users/jonginson/Desktop/new_dailybriefing/infra
terraform validate
terraform plan -out=base.tfplan
```

1차 계획에는 `aws_acm_certificate.frontend[0]` 생성이 포함되어야 합니다. 이전에 적용하지 않은 변경이 있으면 추가 변경이 표시될 수 있으므로 전체 계획을 확인합니다. NAT·ALB·ECS·RDS가 생기거나 기존 리소스를 예상치 않게 삭제/교체하려 한다면 먼저 이유를 확인합니다. 확인 후 사용자만 실행:

```bash
terraform apply base.tfplan
terraform output -json frontend_certificate_dns_validation
```

저장된 계획 적용은 추가 확인 질문 없이 실제 변경됩니다. 과거 계획을 사용하지 말고 매 단계 같은 `base.tfplan` 이름으로 새로 생성합니다. 에이전트는 plan/apply/destroy를 실행하지 않습니다.

요청하는 인증서는 `us-east-1`, DNS 검증, 내보내기 불가 Public 인증서입니다. ARN을 직접 입력하거나 Console에서 중복 인증서를 요청할 필요는 없습니다. ACM에 이미 발급한 인증서가 있다면 중복 생성하기 전에 Terraform import 또는 아래 수동 ARN 모드를 선택합니다. 별도 AWS 권한이 부족하면 오류에 표시되는 ACM 권한을 확인하고, Administrator 권한을 무조건 추가하지 않습니다.

## 2. 가비아 검증 CNAME 등록 후 도메인 연결

위 출력의 `type`, `name`, `value`를 가비아 DNS 관리툴에 등록합니다. 이는 DNS에 쓰는 공개 검증 정보이며 API 비밀키가 아닙니다. 가비아 호스트 칸에 도메인이 자동으로 붙는지 확인하여 `dailybriefing-son.site`를 중복 입력하지 마세요. 값에는 `https://`를 붙이지 않습니다.

자동 갱신을 위해 이 검증 CNAME을 유지합니다. 검증 완료 전에는 인증서 상태가 Pending validation일 수 있습니다. 가비아에 DNS를 등록한 후 로컬 설정의 다음 값만 변경합니다.

```hcl
frontend_domain_enabled = true
```

사용자가 다시 실행:

```bash
terraform validate
terraform plan -out=base.tfplan
# 계획 검토 후 사용자만 적용
terraform apply base.tfplan
```

2차 적용은 `aws_acm_certificate_validation`으로 발급 완료를 최대 10분 기다린 뒤, 검증된 인증서 ARN을 CloudFront에 전달합니다. DNS 전파 지연이나 잘못된 CNAME으로 시간이 초과되면, 가비아 레코드와 권한 있는 네임서버를 확인하고 기존 인증서를 유지한 채 다시 plan/apply합니다. 인증서나 State를 삭제하여 재시도하지 않습니다.

수동으로 발급한 인증서를 계속 쓰는 기존 프로젝트도 지원합니다. 이 경우 `manage_frontend_certificate=false`, 실제 `frontend_certificate_arn`, `frontend_domain_enabled=true`를 사용합니다. 이미 Terraform이 관리하는 인증서가 있다면 단순히 manage 플래그를 끄는 것은 삭제 계획을 만들 수 있으므로 마이그레이션 검토가 필요합니다.

CloudFront가 Deployed가 되면 `terraform output -raw cloudfront_domain_name`으로 기본 주소를 확인하고 가비아 DNS에 등록합니다.

| 종류 | 호스트 | 값 |
| --- | --- | --- |
| CNAME | `www` | 실제 `d....cloudfront.net` 주소 |

DNS 값에는 `https://`나 경로를 넣지 않습니다. ACM 검증 CNAME과 화면용 www CNAME은 서로 다른 레코드입니다. 가비아의 값 형식 안내에 따라 마지막 점을 처리합니다.

`https://www.dailybriefing-son.site`와 `/news`, `/transit` 직접 접속을 확인합니다. GitHub frontend/backend Environment의 `FRONTEND_URL`도 이 주소로 맞춥니다. Bucket/Distribution ID/Role ARN은 유지합니다. 화면 도메인 연결만으로 정적 DEMO가 LIVE로 전환되지는 않습니다.

## 3. API 서울 인증서도 Terraform으로 요청

API 인증서는 기본 Backend 리전(`ap-northeast-2`)에 Terraform이 요청합니다. 버지니아 화면 인증서를 재사용하지 않습니다. 가비아의 검증 CNAME 등록만 수동입니다. Backend를 켜기 전에 인증서 요청과 검증을 마칠 수 있습니다.

로컬 `infra/terraform.tfvars`는 다음 요청 단계로 준비되어 있습니다. 기존 image_digest, frontend 설정, Secret ARN은 유지합니다.

```hcl
api_hostname                       = "api.dailybriefing-son.site"
manage_api_certificate             = true
alb_certificate_arn                = ""
api_certificate_validation_enabled = false
enable_backend                     = false
enable_aiops                       = false
```

### A. 인증서 요청만 적용

사용자가 실행:

```bash
terraform -chdir=infra validate
terraform -chdir=infra plan -out=base.tfplan
# 계획 검토 후 사용자만 적용
terraform -chdir=infra apply base.tfplan
terraform -chdir=infra output -json api_certificate_dns_validation
```

요청 단계에는 `aws_acm_certificate.api[0]` 생성이 포함되어야 합니다. 기존 미적용 변경에 따라 다른 변경도 있을 수 있으므로 전체 계획을 확인합니다. `enable_backend=false`이므로 NAT/ALB/ECS/RDS 생성이 없어야 합니다. 인증서만 요청하는 동안에는 CloudFront에 아직 없는 API 원본도 추가하지 않습니다. 예전 base.tfplan을 재사용하지 않습니다.

### B. 가비아 등록 후 발급 완료 확인

출력의 name/value/type으로 검증 CNAME을 가비아 DNS에 등록하고 자동 갱신을 위해 유지합니다. 화면 인증서 검증 레코드도 그대로 둡니다. 호스트 이름에 도메인을 중복 입력하지 않습니다.

등록 후 `api_certificate_validation_enabled=true`로 바꾸고 **enable_backend=false는 유지**합니다. 같은 명령으로 새 계획을 생성·검토·적용하면 ACM 발급 완료를 최대 10분 기다립니다. 전파 지연으로 시간이 초과되면 DNS를 확인하고 재시도합니다. 인증서나 State를 삭제하지 않습니다. 검증된 ARN은 코드가 내부에서 전달하므로 수동 복사할 필요가 없습니다.

### C. 비용 검토 후 Backend 활성화

이미지 digest/7개 Secret ARN/검증된 API 인증서 준비가 끝난 뒤에만 `enable_backend=true`로 새 계획을 만듭니다. 자동 인증서 모드에서 검증 스위치가 false이면 계획 오류를 표시합니다. NAT/ALB/ECS/RDS 비용은 이 단계의 실제 적용부터 발생할 수 있습니다. Backend가 꺼져 있어도 manage_api_certificate=true는 인증서를 계속 관리하므로, Backend 종료 때 인증서가 불필요하게 삭제되지 않습니다.

Backend 생성 후 `terraform -chdir=infra output -raw alb_dns_name`으로 ALB 주소를 확인하고 가비아에 **호스트 api, 종류 CNAME, 값 실제 ALB DNS 주소**를 추가합니다. 이는 인증서 검증 CNAME과 별개의 연결 레코드입니다. API DNS 확인 전에는 Actions의 AWS_BACKEND_DEPLOY_ENABLED를 true로 바꾸거나 LIVE로 전환하지 않습니다.

수동 인증서 사용도 지원합니다. 이 경우 manage_api_certificate=false와 실제 서울 alb_certificate_arn을 입력합니다. 이미 Terraform이 관리하는 인증서를 단순히 manage=false로 바꾸면 삭제 계획이 생길 수 있으므로 소유권 전환을 먼저 검토해야 합니다. Console에서 이미 인증서를 요청했다면 새로 중복 요청하기 전에 import 또는 수동 모드를 선택합니다.

브라우저 API 주소는 계속 `/api/v1`입니다. ECS CORS 설정은 frontend 모듈 출력에서 새 화면 주소를 전달받습니다. API ALB 보안 그룹은 CloudFront 원본 접근 제한을 유지하므로 직접 브라우저 접속이 차단될 수 있습니다. Cookie Domain을 임의로 확장할 필요는 없습니다.

Kakao Developers 웹 사이트 허용 목록에 `https://www.dailybriefing-son.site`를 추가하고 로컬 주소도 유지합니다. 이후 휴대폰 위치 권한, 지도, 주소 검색, 로그인/Refresh/Cookie/CSRF를 검증합니다.

## 비용과 변경 상태

가비아 도메인의 DNS 설정은 무료입니다. S3/CloudFront/ECR 등 기존 서비스 사용량과 가비아 도메인 갱신비는 별도입니다. AWS 통합용 내보내기 불가 ACM Public 인증서 자체는 무료입니다. Route 53을 사용하지 않아도 기능은 유지됩니다.

화면과 API 인증서는 각각 별도 관리/검증 스위치를 사용합니다. 화면 연결이 완료됐다면 기존 값을 유지하고, API 요청 단계만 추가합니다. 실제 AWS 인증서 요청 및 도메인 연결은 실행하지 않았습니다. 이 문서는 연결 완료 보고가 아닙니다. State와 버킷은 그대로 유지하며 AWS 조회·생성·삭제·배포는 실행하지 않았습니다.

공식 안내: [가비아 DNS 제공](https://company.gabia.com/business/domain), [가비아 DNS 레코드 설정](https://customer.gabia.com/manual/domain/287/1201), [CloudFront 사용자 도메인](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html), [ACM 요금](https://aws.amazon.com/certificate-manager/pricing/), [Terraform 인증서 검증](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation.html).

### API 인증서 검증이 10분 후 실패한 경우

API 검증 대기는 10분으로 유지합니다. Terraform이 시간 초과로 끝나도 ACM 인증서가 삭제되거나 검증 요청이 취소되지는 않습니다. 가비아 권한 DNS와 공개 DNS에서 기대 CNAME이 조회된다면 기존 인증서와 DNS 레코드를 유지하고 서울 ACM Console에서 Issued 상태를 확인한 후 새 계획을 생성하여 적용합니다. Pending 상태에서는 반복 apply보다 DNS와 ACM 상태 확인을 먼저 진행합니다. 장시간 지속되면 실제 도메인/검증 CNAME/실패 사유를 대조합니다. 이전 저장 계획에 다른 대기 시간이 들어 있을 수 있으므로 base.tfplan은 다시 생성합니다.
