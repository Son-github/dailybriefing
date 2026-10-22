# LOCAL과 AWS — 같은 소스, 다른 설정

| 항목 | LOCAL | AWS |
|---|---|---|
| Frontend | Vite 또는 compose nginx | 같은 Vite dist → S3/CloudFront |
| Backend | IDE/Gradle 또는 같은 Dockerfile | prod profile ECS Fargate |
| Database | Docker PostgreSQL17 | RDS PostgreSQL17 / verify-full TLS |
| Environment | 루트 .env / local profile | Terraform nonsecret env / prod profile |
| Secret | .env, Git 제외 | SSM SecureString/Secrets Manager ARN 주입 |
| Logging | 콘솔, docker compose logs | 동일 콘솔 → awslogs/CloudWatch |
| 실행 방법 | docker compose up -d --build | 사용자 수동 Main 생성 후 앱 배포 |

## 기존 로컬 사용

처음 설치할 때만 `.env.example`을 `.env`로 복사하고 DB/JWT/필요한 API 키를 입력합니다. **기존 .env를 덮어쓰지 마세요.**

```bash
docker compose up -d --build
docker compose ps
# http://localhost:5173
curl -fsS http://localhost:5173/api/v1/health
docker compose logs --tail=100 backend
```

기본 compose는 backend와 PostgreSQL 포트를 호스트에 공개하지 않습니다. IDE 개발은 다음과 같습니다.

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres
# 터미널/IDE에 .env 변수를 안전하게 주입한 뒤
./backend/gradlew -p backend bootRun
npm --prefix frontend run dev
```

.env는 Spring Boot/Gradle이 자동으로 읽는 파일이 아닙니다. IDE env-file 설정 또는 환경변수 주입이 필요합니다. 프런트엔드 Vite도 루트 .env를 자동 읽지 않으므로 필요하면 frontend/.env.example을 frontend/.env.local로 복사하세요. compose는 기존 root .env를 빌드/컨테이너에 전달합니다.

`FRONTEND_URLS`는 정확한 origin 목록, local 쿠키는 기존 false/prod는 Secure true입니다. AWS 배포용으로 local 인증을 약화하거나 소스를 복제하지 않습니다.

## 서로 다른 두 DEMO 개념

- Backend DATA_MODE=DEMO: DB/인증/개인 설정은 정상 사용하며 정보 API가 샘플을 반환합니다. 로컬 통합/E2E용입니다.
- Frontend STATIC_DEMO: Spring Boot 없이 브라우저 sample adapter가 동작합니다. 샘플 표시, 게스트 dashboard만 저장하며 가입/로그인/개인 서버 저장은 사용할 수 없다고 안내합니다. GPS/외부 지도 SDK를 요청하지 않습니다.
- Frontend LOCAL: 기존 Backend 경로 사용. Backend DATA_MODE는 독립적으로 DEMO/LIVE를 선택합니다.
- Frontend LIVE: 같은 출처 `/api/v1/health`를 제한된 시간에 검사합니다. 실패하면 원인 안내와 명시적 샘플 체험 버튼을 보여주며 실제 데이터 성공으로 위장하지 않습니다.

AWS S3 초기 runtime-config는 STATIC_DEMO입니다. 프런트엔드 deploy는 이를 덮어쓰지 않습니다. Backend Health 검증 후 사용자 또는 backend-deploy만 LIVE로 갱신합니다. 값은 공개 JavaScript 지도키와 mode/API path뿐이며 서버 키는 금지합니다. VITE_*는 빌드에 포함되지만 runtime-config는 같은 dist를 재빌드하지 않고 실행 모드를 바꿉니다.

AWS Main을 전부 삭제하면 DEMO 사이트도 사라집니다. 별도 상시 platform이나 LIVE Root가 없습니다.

## 테스트

[검증 기록](INFRA_VERIFICATION.md)의 명령을 사용하세요. Testcontainers는 자체 임시 DB를 만들며 기존 postgres_data를 사용하지 않습니다. 브라우저 DEMO 테스트는 별도 compose project/5174와 DATA_MODE=DEMO를 사용해 기존 DB와 외부 API 쿼터를 보호합니다. 일반 DB에 `down -v`를 실행하지 마세요.
