# 2026-10-21 기존 구조 분석 및 변경 계획

AWS 계정 인증/조회, Terraform plan/apply/destroy, 원격 배포는 실행하지 않습니다. 로컬 DB volume과 실제 .env를 유지합니다.

## 분석 결과

- React 19/TypeScript/Vite 7, src/features 중심. api.ts의 LOCAL API와 runtime.ts의 STATIC_DEMO/LIVE adapter를 재사용합니다. 실제 경로는 /transit, /my 등이며 예시 /move,/mypage를 새로 만들지 않습니다.
- Spring Boot 3.5/Java21, domain별 패키지, local/test/prod YAML이 이미 있습니다. JWT 메모리/HttpOnly refresh rotation/CSRF, explicit CORS, RequestLogFilter, 오류 requestId, 외부 ProviderHttp timeout 및 키 주입, PostgreSQL17/Flyway를 그대로 유지합니다.
- compose.yaml은 postgres/backend/frontend nginx 3서비스이며 postgres_data volume을 사용합니다. compose.dev.yaml은 IDE 개발용 포트, compose.verify.yaml은 별도 project 검증용입니다. 기본 실행은 docker compose up -d --build입니다.
- backend Docker image는 nonroot Java21 + RDS 공개 CA, frontend는 static dist/nginx. prod는 verify-full TLS, Secure cookie, Actuator health/info 최소 노출. ECS liveness와 ALB readiness(DB 포함)를 이미 분리했으므로 변경하지 않습니다.
- 기존 infra/bootstrap, platform, live의 3 State 설계와 live-up/down 자동 apply 워크플로가 이번 지시와 충돌합니다. AWS에 적용한 적 없는 소스만 변경합니다. 실제 계정/State 존재 여부는 조회하지 않습니다.
- 기존 Testcontainers PostgreSQL, Vitest, Desktop/Mobile Playwright와 CI를 재사용합니다. 정적 DEMO는 /api 호출 없이 샘플을 표시합니다.

## 변경 대상

infra/를 단일 Main Root로 유지하고 vpc/frontend/ecr/iam/alb/ecs/rds/nat 8개 Child Module을 Root에서 직접 호출합니다. 기존 foundation/application/network 묶음은 제거합니다. 각 모듈은 main.tf/variables.tf/outputs.tf/versions.tf로 구성하며 Child에는 backend/provider 인증 설정이 없습니다. 서비스별 명확한 입력/출력으로 연결하고 State는 Main 하나입니다.

기존 단일 Main의 주소 호환을 위한 moved.tf를 작성하지만 State 명령은 실행하지 않습니다. 이전 platform/live 두 State의 자동 합치기는 하지 않습니다.

기존 인프라 자동 생성/종료 워크플로와 전용 입력/잔존 스크립트를 제거합니다. GitHub Actions는 Terraform 계정/State 권한 없이 fmt/init(backend=false)/validate만 수행하고, 수동 승인된 앱 배포 역할만 제공합니다. docs/환경변수/체크리스트/검증 보고를 실제 새 구조로 교체합니다.

이미 실제 platform/live State를 가지고 있는 사용자는 새 Root를 바로 적용하지 말고 TERRAFORM_STRUCTURE의 수동 이전 검토부터 수행해야 합니다. State/리소스를 자동 이동하거나 삭제하지 않습니다.
