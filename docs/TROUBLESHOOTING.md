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


## 배포 후 지도 선택: NETWORK / 요청 번호 없음

지도 SDK는 브라우저가 카카오에서 직접 읽으므로 Spring Boot 요청 번호가 없을 수 있습니다. 일반 Backend 연결 실패로 단정하지 마세요. 공개 runtime-config에 지도 키가 있고 API health가 정상이어도 SDK가 도메인 검증을 거절하면 지도는 표시되지 않습니다.

2026-10-26 공개 서비스 점검에서는 카카오 SDK가 HTTP 401과 `domain mismatched`를 반환했습니다. 카카오 Developers에서 배포에 사용한 JavaScript 키가 속한 앱을 선택하고, JavaScript SDK 도메인 허용 목록에 `https://www.dailybriefing-son.site`를 정확히 등록합니다. `www`가 없는 주소나 `http://localhost:5173`만 등록한 상태와 다릅니다. 카카오맵 사용 설정 ON과 키 종류도 확인하세요. 서버 REST API 키를 공개 지도 키로 대체하지 않습니다.

허용 도메인만 수정했다면 코드 재배포 없이 페이지를 새로고침하고 지도 선택을 재확인할 수 있습니다. 키 자체를 변경한 경우에는 GitHub backend Environment의 PUBLIC_KAKAO_MAP_KEY와 실제 runtime 갱신이 별도로 필요합니다. 키 원문을 로그·화면·문서에 출력하지 마세요.

Frontend는 SDK script 로딩 실패를 MAP_SDK_LOAD_FAILED로 구분합니다. 브라우저 script.onerror만으로 실제 HTTP 상태를 확정할 수 없으므로 이 코드만 보고 무조건 도메인 오류라고 단정하지 않습니다. 개발자 도구 Network에서 dapi.kakao.com/v2/maps/sdk.js 응답으로 도메인·키·네트워크 차단을 구분하세요. 이 오류 안내 변경은 실제 frontend 배포 이후 반영됩니다.


## 도메인 승인 후 지도 준비 화면에서 멈추는 경우

카카오 sdk.js가 HTTP 200이어도 추가 지도 엔진은 `https://t1.kakaocdn.net/mapjsapi/js/main/.../kakao.js`에서 로드됩니다. CloudFront의 script-src에 예전 t1.daumcdn.net만 있으면 이 엔진이 CSP로 차단되어 maps.load 콜백이 완료되지 않습니다. frontend 응답 헤더 정책에 t1.kakaocdn.net을 추가했습니다. 전체 스크립트 허용이나 unsafe-eval 추가는 하지 않습니다.

수정된 Terraform 코드는 사용자가 새 계획을 검토한 뒤 적용해야 합니다. 계획에 예상하지 못한 인프라 생성/삭제가 있다면 적용 전에 확인합니다. frontend 코드도 배포한 뒤 페이지를 새로고침합니다. 이미 실패한 SDK의 전역 객체가 남아 있을 수 있으므로 새로고침 없이 지도 창만 다시 열어서는 복구되지 않을 수 있습니다.

Frontend는 SDK 전역 객체가 이미 존재하는 경로에도 초기화 제한 시간을 적용합니다. 지도 CDN의 securitypolicyviolation을 받으면 MAP_SDK_BLOCKED, 초기화 콜백이 10초 안에 완료되지 않으면 MAP_SDK_TIMEOUT으로 로딩을 종료합니다. 초기 sdk.js 다운로드에도 별도 10초 제한이 있습니다. 실제 배포 반영과 지도의 정상 표시 여부는 사용자 적용 후 재확인이 필요합니다.


## Terraform 적용 후 LIVE가 샘플 모드로 바뀐 경우

공개 `/runtime-config.json`의 mode와 API health를 구분해 확인합니다. API가 UP인데 runtime이 STATIC_DEMO이면 서버 장애가 아니라 실행 설정이 바뀐 것입니다. 이전 코드에서는 Terraform의 cache_control이 `no-store, max-age=0`, runtime 배포 스크립트는 `no-store,max-age=0`이어서 metadata drift가 생겼습니다. content만 ignore해도 S3 객체 metadata 변경 시 Terraform State에 남은 초기 DEMO 내용이 다시 업로드될 수 있었습니다.

Terraform runtime 객체는 이제 초기 생성 후 ignore_changes=all로 CI 소유권을 유지하고 cache_control 표기도 통일합니다. 이후 Terraform으로 이 객체의 메타데이터를 고치려면 CI 소유권 정책부터 검토해야 합니다. 이 변경은 자동으로 LIVE를 복원하지 않습니다.

LIVE 복구는 수동 실행 전용 `runtime-config` Actions로 진행합니다. 기존 backend Environment의 AWS_ACCOUNT_ID/BACKEND_ROLE_ARN/FRONTEND_BUCKET/CF_DISTRIBUTION_ID/FRONTEND_URL/PUBLIC_KAKAO_MAP_KEY를 사용하고 AWS_DEPLOY_ENABLED=true가 필요합니다. LIVE 선택 시 기존 API smoke를 통과해야 S3 실행 설정을 갱신하고 CloudFront의 해당 파일만 무효화합니다. ECR 업로드/ECS 재배포/Terraform 호출은 없습니다. LIVE 지도 키가 비어 있으면 파일을 변경하지 않습니다.

복구 workflow 코드를 push하는 과정에서 기존 main 자동 배포가 실행될 수 있습니다. 서버 재배포를 원치 않으면 사용자가 Repository AWS_DEPLOY_ENABLED=false로 잠시 두고 코드 반영 후 자동 배포가 Skipped인지 확인합니다. 이후 true로 되돌리고 Actions → runtime-config → Run workflow → main/LIVE를 직접 실행합니다. 기존 서버는 이 스위치 변경으로 중지되지 않습니다.

공개 config에서 LIVE/liveEnabled=true가 확인되면 페이지의 LIVE 다시 연결 버튼으로 브라우저에 남은 샘플 체험 선택도 해제합니다. 실제 AWS 변경은 사용자가 Actions를 실행할 때 발생하며, 코드 수정만으로 복구 완료를 주장하지 않습니다.


## 로그아웃 FORBIDDEN (403)

로그아웃 API는 로그인 권한 검사를 요구하지 않지만 CSRF 검사는 유지합니다. 이전 frontend는 CSRF 응답 토큰을 메모리에 계속 캐시하여, 다른 탭/요청에서 공유 Cookie가 변경된 뒤 오래된 헤더 토큰으로 로그아웃을 요청할 수 있었습니다. 이 조건에서 403이 나는 상황을 Mock HTTP 테스트로 재현했습니다. 실제 요청의 최종 원인 확정에는 요청 번호에 대응하는 서버 로그 확인이 필요합니다.

변경 요청 직전에 /auth/csrf를 cache:no-store/credentials:include로 확인하고, 동시에 시작한 조회만 Promise 하나를 공유하도록 수정했습니다. 세션 내내 토큰을 재사용하지 않습니다. CSRF 검사는 끄지 않고, 서버 실패 시 가짜 로그아웃 성공으로 처리하지 않습니다. 성공 응답 후에만 메모리 인증과 개인 Query 캐시를 비웁니다. My Page 버튼에는 진행 중 표시와 중복 클릭 방지를 적용합니다.

frontend-deploy 반영 후 페이지를 새로고침하여 기존 메모리 캐시를 제거하고 로그인 → 로그아웃 → 새로고침 → 비로그인 유지 → 재로그인을 확인합니다. 이 수정에는 Backend 재배포나 Terraform apply가 필요하지 않습니다. 여전히 실패하면 새 요청 번호와 서버 로그의 403 원인을 확인합니다. 테스트는 토큰 변경 후 로그아웃 성공과 실제 서버 거절 시 오류 유지 두 흐름을 포함합니다.
