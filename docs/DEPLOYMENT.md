# AWS 배포와 설정 변경

현재 서비스는 가비아 DNS, CloudFront/S3, ALB, Private ECS, Private RDS를 사용합니다. Route 53은 사용하지 않습니다. 이미 배포한 환경은 아래 운영 절차부터 확인하고, 새 환경을 만들 때만 마지막의 최초 구축 절차를 사용하세요.

Terraform 계획과 적용은 운영자가 직접 실행합니다. GitHub Actions는 앱을 배포하며 인프라를 생성하거나 삭제하지 않습니다. 시연 사이에 자원을 내릴 때는 [중단·복원 절차](INTERVIEW_OPERATIONS.md)를 사용합니다.

## 평소 변경 순서

| 변경 | 반영 방법 |
| --- | --- |
| React 코드 | frontend-deploy |
| Spring Boot 코드 | backend-deploy |
| LIVE / 샘플, 공개 지도 키 | runtime-config |
| CPU·메모리·서브넷·Secret ARN·인증서 | Terraform 검토·적용. ECS 설정 변경 후 backend-deploy |
| AIOps Python / 설정 | 로컬 검사 → ZIP 빌드 → Terraform 검토·적용 |

저장 계획은 매번 `infra/base.tfplan`을 새로 만듭니다. 이전 코드나 부분 적용 전의 계획을 다시 사용하지 않습니다.

```bash
terraform -chdir=infra validate
terraform -chdir=infra plan -out=base.tfplan
# 전체 변경 목록과 비용을 검토한 뒤 운영자가 직접 실행
terraform -chdir=infra apply base.tfplan
```

기존 자원의 예상 밖 삭제·교체가 있으면 적용 전에 원인을 확인합니다. 실패한 apply는 이미 생성한 자원을 자동으로 모두 되돌리지 않습니다. State나 리소스를 지우기보다 새 계획에서 남은 변경을 확인하세요.

## GitHub 설정

Settings → Environments에 `frontend`, `backend`를 만듭니다. OIDC 신뢰 조건과 이름이 일치해야 하며, main 배포 제한을 권장합니다. 장기 AWS Access Key 대신 Environment별 IAM Role을 사용합니다.

Repository Variables:

| 이름 | 역할 |
| --- | --- |
| AWS_DEPLOY_ENABLED | true일 때 앱 배포 job 실행. Environment에만 넣으면 job이 Skipped될 수 있음 |
| AWS_BACKEND_DEPLOY_ENABLED | true일 때 이미지 업로드 이후 ECS 배포까지 수행. false면 이미지 업로드만 수행 |

Environment Variables:

| Environment | 필요한 값 |
| --- | --- |
| frontend | AWS_ACCOUNT_ID, FRONTEND_ROLE_ARN, FRONTEND_BUCKET, CF_DISTRIBUTION_ID, FRONTEND_URL |
| backend — 최초 이미지 업로드 | AWS_ACCOUNT_ID, BACKEND_ROLE_ARN, ECR_URL |
| backend — ECS/LIVE까지 | 위 값 + ECS_CLUSTER, ECS_SERVICE, TASK_FAMILY, FRONTEND_URL, FRONTEND_BUCKET, CF_DISTRIBUTION_ID, PUBLIC_KAKAO_MAP_KEY |

버킷·역할·클러스터 값은 Terraform output을 사용합니다. PUBLIC_KAKAO_MAP_KEY에는 공개 JavaScript 키를 넣습니다. 서버 REST 키나 OpenAI 키를 넣지 않습니다. Repository 스위치와 같은 이름을 Environment에 중복 등록하지 마세요.

## Frontend와 Backend 배포

Actions → 해당 workflow → Run workflow → main으로 실행할 수 있습니다. main에 관련 파일을 push해도 배포 스위치가 켜져 있으면 실행됩니다.

Frontend는 검증·빌드 후 assets를 먼저, HTML을 나중에 업로드합니다. 기존 해시 assets를 즉시 지우지 않고 runtime-config도 덮어쓰지 않습니다. `/news`, `/transit`, `/calendar`, `/my`, `/settings` 직접 접속과 새로고침을 확인합니다.

Backend는 테스트 후 amd64 이미지를 ECR에 올립니다. 태그는 실행마다 고유하며 Summary의 image digest를 `terraform.tfvars`의 image_digest에도 기록합니다. ECS 배포가 켜져 있으면 새 revision 등록 → 서비스 변경 → 신규 revision 확인 → API smoke → LIVE 전환 순서로 진행합니다. waiter가 성공해도 구버전으로 rollback됐으면 배포 실패로 처리합니다.

Terraform은 Task 설정을 관리하고 실제 서비스 revision은 CI가 관리합니다. Terraform으로 환경값·CPU·Secret을 바꾼 뒤에는 backend-deploy를 이어 실행해야 서비스에 최신 설정이 반영됩니다. 기존 Flyway migration은 수정하지 않고 새 파일을 추가합니다. 구버전과 호환되지 않는 DB 변경은 이미지 rollback만으로 복구되지 않습니다.

## LIVE 또는 샘플만 전환

Actions → runtime-config → main → LIVE 또는 STATIC_DEMO를 선택합니다. backend Environment와 AWS_DEPLOY_ENABLED=true가 필요합니다. LIVE는 API smoke와 공개 지도 키 확인을 통과해야 반영됩니다. ECR 빌드나 ECS 재배포는 하지 않습니다.

Terraform은 runtime-config.json을 처음 생성한 뒤 `ignore_changes=all`로 CI에 관리를 맡깁니다. 이를 제거하면 초기 샘플 설정이 다시 업로드될 수 있습니다. 브라우저에 샘플 선택이 남아 있다면 LIVE 다시 연결로 해제하세요.

## 도메인과 인증서

| 가비아 CNAME | 연결 대상 |
| --- | --- |
| www | CloudFront 기본 도메인 |
| api | ALB DNS 주소 |
| ACM이 출력한 검증 이름 | ACM 검증 값. 갱신을 위해 계속 유지 |

호스트 칸에 도메인이 자동으로 붙는지 확인하고, 값에 https://나 경로를 넣지 않습니다. www를 대표 주소로 사용하며 루트 도메인의 자동 이동은 별도 구성입니다.

화면 ACM은 us-east-1, API ACM은 ap-northeast-2입니다. Terraform이 인증서를 요청하고 가비아 CNAME 등록은 수동으로 합니다.

1. 화면은 manage_frontend_certificate=true, frontend_domain_enabled=false로 요청합니다. API는 manage_api_certificate=true, api_certificate_validation_enabled=false로 요청합니다.
2. output의 frontend_certificate_dns_validation / api_certificate_dns_validation을 가비아에 등록합니다. 검증 레코드는 서비스 연결용 www/api 레코드와 다릅니다.
3. DNS 등록 후 해당 검증/연결 플래그를 true로 변경해 새 계획을 검토·적용합니다. 검증 대기는 10분입니다. 타임아웃이면 기존 인증서를 유지하고 CNAME·네임서버·전파 상태부터 확인합니다.

이미 운영 중인 환경에서 위 요청 단계로 되돌리거나 enable_backend를 false로 바꾸지 않습니다. 기존 인증서가 있다면 중복 요청 대신 현재 소유권부터 확인하세요. 면접 재개로 ALB가 바뀌면 api CNAME만 갱신하고 www와 검증 CNAME은 유지합니다.

카카오 SDK 허용 도메인에는 `https://www.dailybriefing-son.site`를 정확히 등록합니다. 브라우저 API 경로는 계속 `/api/v1`입니다. ALB 직접 접근은 CloudFront 접근 제한 때문에 차단될 수 있습니다.

## 최초 구축할 때만

1. AWS CLI의 계정·서울 리전을 확인합니다. 기존 State가 있다면 같은 backend key를 사용합니다. 다른 Root에서 관리한 리소스를 새 State로 중복 생성하지 않습니다.
2. bootstrap 예제의 고유 버킷명·계정을 설정해 State용 S3를 생성합니다. 처음 local State를 안전하게 백업하고 backend.tf.example/backend.hcl.example을 복사한 뒤 `init -migrate-state`로 이전합니다. Bootstrap은 Main과 별도이며 삭제하지 않습니다.
3. Main backend.hcl의 key는 main/terraform.tfstate입니다. 예제를 복사해 계정·버킷·OIDC를 설정하고 `terraform -chdir=infra init -backend-config=backend.hcl`을 실행합니다. backend.hcl에 인증정보를 넣지 않습니다.
4. 처음에만 enable_backend=false, image_digest=""로 정적 화면·ECR·IAM·네트워크를 준비합니다. Backend 배포 스위치는 false로 두고 최초 이미지를 업로드합니다.
5. SSM SecureString 또는 Secrets Manager에 JWT_SECRET, KMA_API_KEY, KASI_API_KEY, KAKAO_REST_API_KEY, KOREA_EXIM_API_KEY, NAVER_API_CLIENT_ID, NAVER_API_CLIENT_SECRET을 등록합니다. application_secrets에는 동일 계정·서울 ARN만 넣습니다. 이 앱은 각 SecretString 전체를 읽으므로 단일 문자열을 사용합니다. DB 자격증명은 RDS 관리 Secret을 사용합니다.
6. image digest·7개 Secret ARN·검증된 서울 API 인증서를 준비한 뒤 enable_backend=true를 검토·적용합니다. NAT·ALB·ECS·RDS 비용이 발생합니다. ALB 주소로 api CNAME을 등록하고 readiness와 DNS를 확인한 뒤 ECS 배포 스위치를 켭니다.

공유 GitHub OIDC가 있으면 기존 ARN을 재사용합니다. Terraform의 init/validate 성공은 배포 완료가 아닙니다. 계정의 비용 알림도 별도로 설정하세요.

## 배포 후 확인

로그인·refresh·로그아웃, 위젯 저장, 개인 일정, 즐겨찾기, 외부 정보, 지도·모바일 GPS를 확인합니다. API 실패 시 요청 번호로 CloudWatch 로그를 찾습니다. 새 배포가 실패하면 ECS events/stoppedReason과 로그를 확인하고 정상 서비스나 State부터 삭제하지 않습니다. [문제 해결](TROUBLESHOOTING.md), [테스트](TESTING.md), [AIOps](AIOPS.md)를 참고하세요.
