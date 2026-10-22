# 2026-10-21 로컬 검증 기록

**AWS 계정 인증·리소스 조회·생성·수정·삭제, Terraform plan/apply/destroy, GitHub 원격 배포는 전부 미실행입니다.** 공개 공식 문서 조회 및 provider의 local schema 검사만 수행했습니다. 이 결과는 AWS 배포 성공이나 비용0원 보장이 아닙니다.

## 결과

| 검사 | 상태 | 실행 범위 |
|---|---|---|
| Frontend lint/typecheck/build | 성공 | 기존 같은 React production build |
| Vitest | 성공 | 36개 / 9 files |
| Backend compile/test/bootJar | 성공 | 단위33개, rerun-tasks로 재실행 |
| PostgreSQL 통합 테스트 | 성공 | Testcontainers10개, 회원/인증/refresh/권한/설정/마이그레이션 등 |
| Docker build/compose up | 성공 | 별도 dailybriefing-unified-check project, 3서비스 healthy, Flyway1~8 모두 success |
| 로컬 API smoke | 성공 | readiness200/UP, CSRF token, 미인증401 |
| Playwright Desktop/Mobile | 성공 | 32개, 가입→설정→경로·일정→refresh→탈퇴, 오류/편집/정적 DEMO 등 |
| Backend 없는 정적 build | 성공 | localhost5175, 모든 /api 차단, smoke-demo PASS |
| Terraform fmt | 성공 | infra 전체 |
| Terraform init -backend=false | 성공 | Main + Bootstrap/provider lock 유지, remote State 미접근 |
| Terraform validate | 성공 | Main + Bootstrap, AWS credentials/metadata 접근 차단 |
| deploy-backend script 단위 검사 | 성공 | 5개: payload 보존/잘못된 container/승인 없으면 AWS 미호출/서비스 없음/rollback 성공 오인 방지 |
| 구조 안전장치 | 성공 | Main State/사설망/비밀 원문/Actions 인프라 변경 금지 |
| Secret 노출 검사 | 성공 | credential 패턴+실제 .env 비밀값의 소스/문서 노출 여부, 원문 미출력 |
| actionlint | 성공 | 4개 workflow, shellcheck 제외 |
| SPA function 단위 검사 | 성공 | 알려진 UI path만 rewrite, API/asset 오류 보존 |
| 실제 AWS plan/apply/destroy/배포 | 미실행 | 사용자의 비용 금지 요청 준수 |
| AWS IAM/OIDC/DNS/ACM/ECR/ECS/RDS/NAT/Secret | 미실행 | 계정 접근 없음 |
| 실제 AWS browser Cookie/GPS/실제 외부 API | 미실행 | local DEMO/모의 SDK와 실제 서비스 검증을 구분 |
| Checkov/tfsec/IAM simulator/Access Analyzer | 미실행 | 프로젝트 assertion은 보안 감사 대체 아님 |

Backend build/test-results의 ` 2.xml` 같은 과거 복제 산출물은 새 실행 결과와 중복 집계하지 않았습니다. 최신 canonical XML의 단위33/통합10개 기준입니다. 기존 사용자 소스/DB/실제 .env를 삭제하거나 변경하지 않았습니다.

정적 서버 첫 시도는 프로젝트 루트에서 Vite preview를 실행해 dist 경로를 못 찾았습니다. frontend root를 명시하고 서버 기동을 기다리도록 로컬 실행 명령을 바로잡은 뒤 재검증에 통과했습니다. 이 실패를 AWS나 앱 기능 오류로 분류하지 않습니다.

## 비용 없는 재검증

```bash
terraform fmt -check -recursive infra
for root in infra infra/bootstrap; do
  env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN \
    AWS_EC2_METADATA_DISABLED=true AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null \
    terraform -chdir="$root" init -backend=false -input=false -lockfile=readonly
  env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN \
    AWS_EC2_METADATA_DISABLED=true AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null \
    terraform -chdir="$root" validate
 done
python3 scripts/check-infra.py
python3 scripts/scan-secrets.py
python3 scripts/test-deploy-backend.py
node scripts/test-spa-router.mjs
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
./backend/gradlew -p backend test integrationTest bootJar
# actionlint 설치 시
actionlint -shellcheck= .github/workflows/*.yml
```

위 명령에 plan/apply/destroy를 추가하지 않습니다. init -backend=false는 remote S3 접근 없이 공개 provider를 설치/사용하며 validate는 실제 계정의 권한/리소스 용량을 확인하지 않습니다.

## 기존 DB와 분리한 브라우저 검증

```bash
# 이 임시 override는 프로젝트 소스/실제 .env를 수정하지 않음
cat > /tmp/dailybriefing-verify.yaml <<'YAML'
services:
  backend:
    environment:
      DATA_MODE: DEMO
      CALENDAR_CLEANUP_ENABLED: 'false'
YAML
docker compose -p dailybriefing-unified-check -f compose.yaml -f compose.verify.yaml -f /tmp/dailybriefing-verify.yaml up -d --build --wait
E2E_BASE_URL=http://localhost:5174 npm --prefix frontend run test:e2e
# 종료해도 기존 DB/검증 DB volume은 삭제하지 않음
docker compose -p dailybriefing-unified-check -f compose.yaml -f compose.verify.yaml -f /tmp/dailybriefing-verify.yaml down
```

DEMO와 Mock SDK는 라이브 프로바이더 응답/계정 승인/쿼터를 검증하지 않습니다. 실제 AWS 배포 검증은 MY_AWS_CHECKLIST에서 나중에 사용자가 수행합니다. 앱 비즈니스 소스/Dockerfile/profile은 이전 검증 구조가 요구를 이미 충족하여 재작성하지 않았습니다.

검증 종료 후 이번 전용 compose project의 컨테이너/네트워크만 down으로 종료했습니다. -v를 사용하지 않아 기존 및 검증 DB volume은 보존했습니다. 작업 시작 시 원래 project가 실행 중이지 않았으므로 임의로 켜지 않았습니다. 임시 정적 서버도 종료하고 dist runtime-config를 LOCAL 원본으로 복원했습니다.

## 후속: 요청한 8개 서비스 모듈로 재정리

vpc/frontend/ecr/iam/alb/ecs/rds/nat로 실제 리소스와 입력·출력을 분리했습니다. 앱 소스/Compose/DB/.env는 변경하지 않았습니다. 이번 후속에서는 앱 전체 테스트를 반복하지 않고 변경된 Terraform의 fmt/init(backend=false)/validate, 8개 모듈 구조 검사, Secret 검사, SPA function 검사, actionlint, 배포 스크립트5개를 검증합니다. AWS 실제 계정/plan/apply/destroy/State 이동/원격 배포는 실행하지 않았습니다. 기존 단일 Main 주소 호환 moved.tf는 선언만 작성했습니다.

## 2026-10-23 AIOps 추가 검증

[AIOPS_REPORT](AIOPS_REPORT.md)에 이번 성공/초기 실패 해결/미실행 범위를 기록했습니다. Python58, 기존 Frontend36, Backend35+PG10, 브라우저32가 통과했습니다. Lambda ZIP 두 번의 SHA256이 일치했고 Main/Bootstrap validate를 계정 차단 상태에서 확인했습니다. 실제 AWS/유료 API/이메일/원격 Workflow는 실행하지 않았습니다.
