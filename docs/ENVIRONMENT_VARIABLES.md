# 환경변수와 사용자 입력

실제 값은 `.env`/Secret Store에만 보관합니다. `.env.example`은 빈 값과 공개 placeholder를 가진 설명서이며 자동 동기화되지 않습니다. 기존 `.env`를 예제로 덮어쓰지 마세요. Terraform tfvars에는 Secret **ARN**만 입력합니다.

## 애플리케이션 변수

| 변수명 | 사용 위치 | LOCAL | AWS | Secret 여부 | 설정 방법/발급처 |
|---|---|---|---|---|---|
| DB_HOST | Spring datasource | IDE localhost/compose가 postgres 주입 | RDS address 자동 | 아니요 | Terraform 생성, 수동 endpoint 중복 생성 불필요 |
| DB_PORT | Spring datasource | 5432 | 5432 자동 | 아니요 | PostgreSQL 포트 |
| DB_NAME | Spring datasource | root .env | db_name 자동 | 아니요 | 초기 DB명, snapshot 복구 시 기존 DB명 일치 |
| DB_USERNAME | Spring datasource | root .env | RDS managed secret username 자동 | 민감 | RDS가 관리 |
| DB_PASSWORD | Spring datasource | root .env | RDS managed secret password 자동 | 예 | 사용자가 tfvars에 쓰지 않음 |
| JWT_SECRET | Security | root .env, 최소32 UTF-8 bytes | application_secrets ARN | 예 | 사용자 로컬 암호학적 난수로 생성 후 SSM/SM 등록 |
| SPRING_PROFILES_ACTIVE | Spring | local | prod 자동 | 아니요 | test는 테스트가 선택 |
| PORT | Spring server | 기본8080 | ECS8080 고정 계약 | 아니요 | AWS에서는 변경하지 않음 |
| FRONTEND_URL | CORS | http://localhost:5173 | CF/custom URL 자동 | 아니요 | 실제 origin, path 없음 |
| FRONTEND_URLS | CORS | 필요 시 CSV, 미지정 시 위 값 | CF 기본+custom 자동 | 아니요 | 정확한 HTTPS origin, wildcard 금지 |
| BACKEND_URL | 운영자 안내 | root 예제에만 있는 안내값 | 미사용 | 아니요 | 앱이 실제로 읽지 않음. Browser API는 VITE_API_BASE/runtime 사용 |
| COOKIE_SECURE | Cookie | false | prod true 자동 | 아니요 | HTTPS 우회용 false 금지 |
| DATA_MODE | Provider service | DEMO/LIVE | LIVE 자동 | 아니요 | Backend의 샘플 여부. Frontend STATIC_DEMO와 다름 |
| DB_SSL_MODE | prod datasource | local profile 미사용 | verify-full 자동 | 아니요 | 변경하지 않는 것이 기본 |
| DB_SSL_ROOT_CERT | prod datasource | 미사용 | /app/certs/rds-global-bundle.pem | 아니요 | image에 공식 공개 CA 포함, 인증서 갱신 필요 |
| KMA_API_KEY | 기상청 날씨 | root .env | Secret ARN | 예 | 공공데이터포털 단기예보 활용신청, **Decoding 원본** |
| KASI_API_KEY | 공휴일 | root .env | Secret ARN | 예 | 공공데이터포털 특일정보 활용신청, **Decoding 원본** |
| KAKAO_REST_API_KEY | 장소/교통 서버 | root .env | Secret ARN | 예 | Kakao Developers 앱 REST API 키/카카오맵 ON |
| KOREA_EXIM_API_KEY | 환율 | root .env | Secret ARN | 예 | 한국수출입은행 환율 Open API |
| NAVER_API_CLIENT_ID | 뉴스 | root .env | Secret ARN | 민감 | Naver Cloud API HUB 뉴스 앱 Client ID |
| NAVER_API_CLIENT_SECRET | 뉴스 | root .env | Secret ARN | 예 | 같은 HUB 앱 Client Secret, Developers 키와 구분 |
| KMA_API_URL | Weather client | 기본값 제공 | 동일 기본값 | 아니요 | 기상청 단기예보 endpoint |
| KASI_API_URL | Holiday client | 기본값 제공 | 동일 기본값 | 아니요 | 한국천문연구원 특일정보 endpoint |
| KOREA_EXIM_API_URL | Exchange client | 기본값 제공 | 동일 기본값 | 아니요 | 수출입은행 endpoint |
| NAVER_API_URL | News client | https://naverapihub.apigw.ntruss.com | 동일 기본값 | 아니요 | API HUB endpoint |
| KAKAO_PLACE_API_URL | 장소 client | https://dapi.kakao.com | 동일 기본값 | 아니요 | Kakao Local endpoint |
| KAKAO_ROUTE_API_URL | 교통 client | root 예제의 Kakao endpoint | 동일 기본값 | 아니요 | 실제 계정 API 허용 범위 확인 |
| API_CONNECT_TIMEOUT_MS | ProviderHttp | 기본2000 | 동일 기본값 | 아니요 | timeout, 무제한 대기 금지 |
| API_READ_TIMEOUT_MS | ProviderHttp | 기본4000 | 동일 기본값 | 아니요 | provider 성능에 따라 코드 설정 확장 가능 |
| CALENDAR_CLEANUP_ENABLED | 정리 scheduler | 기본true | task1 true/task2 false 자동 | 아니요 | 여러 replica 중복 실행 방지 |
| CALENDAR_CLEANUP_CRON | scheduler | 기본 0 0 3 * * * | 동일 기본값 | 아니요 | 오래된 일정 정리 정책과 함께 변경 |
| VITE_API_BASE | frontend 빌드 | /api/v1 | AWS 빌드에서 미설정, same-origin runtime | 공개 | Vite env는 build 시 JS에 포함됨 |
| VITE_KAKAO_MAP_KEY | 지도 빌드 | root→compose 또는 frontend/.env.local | 비우고 공개 runtime 사용 | 공개 JS 키 | Kakao Developers JavaScript 키, 허용 SDK domain 등록 |
| PUBLIC_KAKAO_MAP_KEY | runtime 변경 스크립트/CI | 미사용 | GitHub Variable/사용자 export | 공개 JS 키 | REST 키를 넣으면 안 됨 |
| E2E_BASE_URL | Playwright | 기본5173, 별도 검증5174 | 배포 UI 검증 시 URL | 공개 | 테스트 전용 |

서버 URL의 전체 기본값은 root `.env.example`/application.yml이 단일 기준입니다. AWS에서 timeout/provider URL/cron을 변경하려면 infra/modules/ecs/main.tf의 nonsecret environment 항목에 추가하고 같은 profile 설정을 사용하세요. 실제 비밀값을 Terraform environment에 추가하지 않습니다.

## Terraform 입력 — AWS 전용, 실제 값은 사용자 입력

`infra/terraform.tfvars.example`에서 다음을 작성합니다.

| 입력 | 어디에서 확인/설정 | 자동 처리 |
|---|---|---|
| aws_account_id/region | AWS 콘솔 우상단 계정/서울 | provider 계정 제한 |
| project/environment | 사용자 고유 접두사/공통 비용 태그 | 자원 이름/태그 |
| availability_zones | EC2 콘솔 AZ, 계정 가용 여부 | Main plan에서 가용성 검사 |
| state_bucket_name | Bootstrap 예제에 사용자 고유 이름, Main backend.hcl의 bucket | Bootstrap가 bucket 생성 |
| frontend_bucket_name | 전역 고유 이름 | Main이 private bucket/OAC/CF 생성 |
| github_repository_subject | 실제 repo OIDC sub prefix, repo:OWNER/REPO 또는 ID 기반 형태 | frontend/backend Environment 신뢰만 허용 |
| create_github_oidc_provider/existing_github_oidc_provider_arn | IAM→Identity providers 확인 | 기존 있으면 재사용, 없을 때만 생성 |
| create_service_linked_roles | IAM에 ECS/RDS service-linked Role 존재 여부 | 기본false; 공유 계정 Role 임의 삭제 금지 |
| api_hostname/api_hosted_zone_id | 사용자 도메인, Route53 Public Hosted Zone ID | Main이 API A alias 생성 |
| alb_certificate_arn | **서울** ACM, ISSUED/실제 API FQDN 포함 | ALB HTTPS listener |
| frontend_hostname/frontend_certificate_arn | 선택, frontend custom domain/**us-east-1** ACM | CF alias; DNS는 사용자 연결 |
| application_secrets | SSM Parameter Store SecureString/Secrets Manager 상세 ARN | 7개 JWT/API 이름→ECS secret 주입 |
| secret_kms_key_arns | 사용자 CMK 사용 시 KMS ARN | Execution Role decrypt 허용 |
| enable_backend/image_digest | 1차false/빈 digest, push 후true/sha256 digest | 같은 State에 Backend 추가 |
| database_disposal/ephemeral_database_ack/final_snapshot_identifier | protect 기본; 테스트 DB만 snapshot/discard 명시 | 삭제 보호/최종 snapshot 제어 |
| restore_snapshot_identifier | RDS snapshots, 복구 시 선택 | 실제 복구는 AWS 미검증 |
| allow_storage_cleanup | false 기본, 삭제 전 전체 version/image 검토 후true | S3 force_destroy/ECR force_delete |
| task_cpu/task_memory/task_count/use_both_app_azs | ECS 요구량, 기본512/2048/1/false | private ECS 배치 |
| db_instance_class/db_storage_gb/db_name | 기본 db.t4g.micro/20/사용자 DB명 | 소형 테스트 RDS |
| log_retention_days/alarm_sns_topic_arns | 기본14일/선택적 기존 SNS ARN | 로그/알람만 생성, SNS 자체 생성 안 함 |

## GitHub Variables와 Environment

Settings→Environments에서 **frontend**, **backend**를 만들고 main 제한/Required reviewers를 설정합니다. Repository/Environment Variables에 AWS_ACCOUNT_ID, FRONTEND_BUCKET, CF_DISTRIBUTION_ID, FRONTEND_URL, FRONTEND_ROLE_ARN, BACKEND_ROLE_ARN, ECR_URL, ECS_CLUSTER, ECS_SERVICE, TASK_FAMILY(기본 dailybriefing-live), PUBLIC_KAKAO_MAP_KEY를 Main output/실제 앱에서 복사합니다. AWS_DEPLOY_ENABLED는 **미설정/false 유지가 기본**이며 나중에 사용자가 배포할 때만 true로 설정합니다.

CI에는 AWS Access Key/Secret Key와 Terraform State 접근 권한이 없습니다. OIDC 단기 권한으로 앱만 배포합니다. backend role의 RegisterTaskDefinition은 리전 조건 Resource:*가 필요하고 PassRole은 두 ECS 역할로 제한합니다. 실제 계정 IAM 검증은 별도 필요합니다.

ALLOW_AWS_MUTATIONS=I_UNDERSTAND_COSTS는 미래 수동 runtime/앱 배포 스크립트의 명시적 게이트입니다. 로컬 검증 시 설정하지 않습니다. AWS_PROFILE/AWS_REGION/SSO 자격증명은 사용자의 AWS CLI가 관리하며 소스/env 예제에 비밀값을 넣지 않습니다. TF_PLUGIN_CACHE_DIR, AWS_EC2_METADATA_DISABLED 등은 정적 도구 설정이며 앱 변수와 다릅니다.

## 선택적 AIOps 설정

LOCAL 서비스의 .env에는 OpenAI 키를 추가할 필요가 없습니다. AIOps Lambda는 별도 Python 환경변수를 Terraform의 aiops_settings에서 매핑합니다. enable_aiops=false/ai_enabled=false가 기본입니다. 전체 이름/기본값/범위는 [AIOPS_COST_SECURITY](AIOPS_COST_SECURITY.md), 사용자가 입력할 ARN·이메일·ZIP 경로는 [AIOPS_CHECKLIST](AIOPS_CHECKLIST.md)를 확인하세요. 실제 이메일은 민감한 Terraform State에 저장될 수 있으며 공개 예제에 쓰지 않습니다. OpenAI 키 원문은 Terraform 변수나 VITE 설정에 넣지 않습니다.
