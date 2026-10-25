# 배포 오류 대응

AWS 계정 작업은 이번에 실행하지 않았습니다. 아래는 미래 사용자 점검 기준이며 원인을 확정한 실제 장애 보고가 아닙니다. Secret/JWT/cookie 원문을 로그나 이슈에 올리지 마세요.

| 증상 | 확인/대응 |
|---|---|
| 인증 만료/다른 계정 | SSO 재로그인, sts Account/region 확인. provider allowed_account_ids 차단을 제거하지 않기 |
| OIDC AccessDenied | 정확한 repo subject/aud=sts.amazonaws.com, Environment frontend/backend/main 제한/role ARN 확인. State/관리 권한을 CI에 추가하지 않기 |
| backend deploy에 ECS 없음 | Main 1차만 끝난 상태일 수 있음. 수동 최초 ECR push 후 enable_backend=true로 Main 2차를 사용자 적용. CI는 자동 생성하지 않음 |
| Terraform init bucket 없음 | Bootstrap 먼저/실제 bucket/key/region 확인. init -backend=false는 원격 저장소 존재 검증이 아님 |
| State lock | 실제 실행 중인 작업과 lock 소유자 확인. 무조건 force-unlock/State 삭제 금지 |
| 이전 platform/live 상태와 충돌 | TERRAFORM_STRUCTURE의 백업/주소 매핑 검토. 새 Main을 바로 적용하지 않기 |
| ECR pull 실패 | 실제 digest 존재, amd64 image, execution role ECR 권한, App NAT route/IGW/EIP/443 DNS 확인 |
| Secret 주입 실패 | 같은 계정/리전 ARN, SSM SecureString/SM 단일문자열, 실행 Role 허용 목록/CMK key policy, NAT HTTPS 확인. task role과 혼동하지 않기 |
| ECS 즉시 종료 | ECS stoppedReason/컨테이너 exit/CloudWatch log 확인. DB TLS/필수 env/JWT 길이/메모리/Secret 여부 확인. 비밀 응답을 출력하지 않기 |
| ALB health 실패 | 8080/ALB→ECS SG, /actuator/health/readiness HTTP200, DB 연결/Flyway, startup grace 확인. 외부 API 오류로 liveness를 실패시키지 않기 |
| RDS 연결 실패 | DB available/서브넷/ECSSG→5432, DB 이름/username/managed secret, verify-full CA/hostname 확인. sslmode=disable로 우회하지 않기 |
| Flyway 실패 | 같은 V1~V8 사용 여부/오류 migration/기존 checksum 확인. 적용 완료 migration 수정 금지. 동시 task 잠금/DBDDL 권한/구버전 호환 확인 |
| NAT 통신 실패 | NAT available/EIP/공용 route→IGW/App route→NAT/443 확인. DB subnet에는 Internet default route 추가하지 않기 |
| API 외부 401/403/timeout | API 발급처/권한/쿼터/endpoint/Decoding키, requestId 로그 확인. 프로바이더 오류를 샘플 성공으로 바꾸지 않기 |
| 로그인/CORS/CSRF 실패 | HTTPS/CF API behavior cache disabled + Cookie/Auth/CSRF 전달, 정확한 frontend origin, Secure/HttpOnly/Lax, CSRF header 확인. ALB 직접 호출은 CF prefix SG에 막히는 것이 정상 |
| LIVE UI가 unavailable | CF→API DNS/서울ACM/ALB→ECS readiness 경로 확인. 정적 샘플 버튼으로 체험 가능. config 실패/라이브 장애는 성공으로 위장하지 않음 |
| 지도 SDK 실패 | 공개 JS key와 REST key 구분, Kakao SDK domain을 실제 CF/custom origin으로 등록, 사용 설정 확인 |
| SPA 새로고침403/404 | spa-router.js의 실제 경로 whitelist/CF function association/객체 업로드 확인. 모든403/404를 index200으로 바꾸지 않기 |
| 설정 변경 후 이전 task 유지 | service task_definition은 CI 소유로 ignore. Terraform template 변경 후 backend-deploy로 최신 family 설정 반영 |
| waiter 성공인데 구버전 | circuit breaker rollback 가능. script는 신규 revision과 runningCount/deployments를 비교해 실패 처리. 로그/event로 실제 원인 확인 |
| destroy DB 보호 실패 | protect→snapshot/discard를 일반 plan/apply로 선반영, 테스트 DB ack/고유 snapshot 이름 확인. 보호 기능을 코드에서 삭제하지 않기 |
| destroy S3/ECR 실패 | versioned 객체/삭제 마커와 image가 남았는지 확인. 백업 후 수동 정리 또는 명시적 cleanup=true 정책 반영. 기본 강제삭제 아님 |
| destroy CF/ENI/SG/IAM 실패 | CF propagation/삭제 상태, ECS task/ALB/RDS ENI 의존, inline/attached policy/공유Role 권한 확인. 새 plan에서 잔여 목록 재검토 |
| 삭제 후 과금 | NAT deleted + EIP 해제 각각 확인, RDS snapshot/backup/사용자 Secret/State/로그 저장소/HostedZone 확인. Billing 반영 지연 고려 |

실제 AWS IAM simulator/Access Analyzer/배포 후 Cookie/GPS/Secret rotation/snapshot 복구 검증은 별도 필요합니다. 로컬 안전장치 테스트를 AWS 보안 인증으로 해석하지 마세요.

## CloudFront NoSuchCachePolicy — 2026-10-25 수정

사용자 apply 로그에서 CloudFront 생성이 NoSuchCachePolicy로 실패했습니다. CachingDisabled ID 오타를 공식 ID `4135ea2d-6df8-44a3-9df3-4b5a84be39ad`로 수정했습니다. HTML/default 및 /api behavior 두 곳에 적용했습니다. Assets의 CachingOptimized는 기존 공식 ID를 유지합니다. [AWS 공식 목록](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html).

사용자가 제공한 로그에는32개 자원의 생성 완료가 있습니다. 실제 계정 조회를 별도로 수행한 결과는 아닙니다. Terraform apply는 중간 실패했다고 앞서 생성한 자원을 자동으로 모두 되돌리지 않습니다. State/버킷/기존 자원을 삭제하거나 import/state rm부터 하지 마세요.

코드 수정은 기존 base.tfplan을 바꾸지 않습니다. 부분 적용으로 State도 달라졌으므로 이전 계획을 재사용하지 않습니다. 오래된 base.tfplan은 로컬에서 삭제하고 같은 이름으로 새 계획을 생성해 파일을 하나만 유지합니다. 사용자가 infra 폴더에서 `terraform plan -out=base.tfplan`을 실행해 현재 State와 AWS를 다시 대조하고 결과를 확인해야 합니다. 로그만 기준으로 남은 CloudFront distribution/S3 bucket policy/GitHub 역할 inline policy2개 등4개 생성이 예상되지만 실제 새 plan이 기준입니다. 예상 밖 destroy/replacement가 있으면 적용하지 않습니다. 검토 후 실제 적용도 사용자가 직접 수행합니다. 이번 오류 수정에서는 AWS 조회/plan/apply/destroy를 실행하지 않았습니다.
