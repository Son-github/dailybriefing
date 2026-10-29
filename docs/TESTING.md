# 테스트 방법

명령은 프로젝트 최상위에서 실행합니다. 기본 회귀는 실제 외부 API 키 없이 수행하고 PostgreSQL은 Testcontainers를 사용합니다. Docker가 실행 중이어야 합니다.

## Frontend와 Backend

```bash
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
./backend/gradlew -p backend test integrationTest bootJar
```

Backend 결과는 backend/build/reports/tests 아래에 저장됩니다. 외부 API fixture 통과는 실제 키 인증 성공과 다릅니다. LIVE 확인은 [공급자 설정](SETUP.md)을 마친 뒤 별도로 수행합니다.

## 브라우저와 새 DB

```bash
docker compose build
docker compose up -d --wait
npm --prefix frontend run test:e2e
```

Playwright는 데스크톱·모바일 화면과 주요 사용자 흐름을 검증합니다. 결과는 frontend/playwright-report, 실패 trace는 frontend/test-results입니다. 자동화는 DEMO 데이터로 실행하고 LIVE 운영 API의 쿼터를 쓰지 않도록 실행 환경을 확인하세요.

빈 DB 검증은 기존 개발 volume을 삭제하지 말고 별도 Compose project를 사용합니다. compose.verify.yaml은 화면 포트와 CORS를 5174로 맞춥니다. Compose 2.24.4 이상이 필요합니다.

```bash
docker compose -p dailybriefing-v2-fresh -f compose.yaml -f compose.verify.yaml up --build -d --wait
E2E_BASE_URL=http://localhost:5174 npm --prefix frontend run test:e2e -- --grep signup
# 이 테스트 project 데이터가 더 필요 없을 때만 실행
docker compose -p dailybriefing-v2-fresh -f compose.yaml -f compose.verify.yaml down -v
```

## 변경별 확인 항목

| 변경 | 필요한 검증 |
| --- | --- |
| 인증·회원 | 가입/로그인/refresh rotation/재사용 거절/로그아웃/탈퇴 후 기존 토큰 차단 |
| 개인 데이터 | A/B 사용자 조회·수정·삭제 격리, 401/404, 실패 시 기존 입력 보존 |
| 위젯 | 선택·삭제·순서·버전 충돌, loading/error/empty, 모바일 이동 버튼 |
| 일정 | 서울 날짜·월 경계·정리 기준일, 다가오는 일정 최대 3개, 수정 후 화면 동기화 |
| 장소·경로 | 키보드 검색·GPS 거절·주소 확인, 최단 소요시간 1개, 즐겨찾기 저장 |
| 지도 | 이전 주소 응답 무시, 확인 전 선택 차단, 핀 상태와 reduced-motion |
| 뉴스 | 초기 5분야×5건, 더보기 10건·offset, 탭 전환 추가 요청 없음, 분야별 실패 격리 |
| 외부 API | 인증/잘못된 응답/시간 초과, 키 단일 인코딩, 단위·시각 변환 |
| DB | 빈 PG의 V1–V8, 기존 데이터 업그레이드, FK·UNIQUE·소유권 |

기존 Flyway 파일을 고쳐 통과시키지 않습니다. 기상청 키 인코딩 테스트는 + / =가 포함된 가짜 키로 수행하며 실제 키를 fixture에 넣지 않습니다. 뉴스는 로컬 HTTP 서버에서 HUB 경로와 인증 헤더를 확인합니다.

## 운영 도구와 AIOps

```bash
python3 scripts/test-interview.py
python3 scripts/test-deploy-backend.py
python3 scripts/test-check-deploy-env.py
python3 scripts/test-set-runtime.py
```

AIOps의 Python 환경·pytest·ruff·ZIP 빌드는 [AIOps 문서](AIOPS.md)를 따릅니다. 기본 테스트는 AWS·OpenAI 요청을 하지 않습니다. 실연동은 한도와 비용을 확인한 후 별도로 실행합니다.

최근 기록은 2026-10-29 AIOps pytest 117개, 중단·재개 검사 21개 통과입니다. 이전 Frontend 42개 통과 기록은 2026-10-26 기준입니다. 문서 정리 과정에서 전체 앱·Docker·실제 AWS 시험을 다시 실행한 결과는 아닙니다.

[6종 실연동 시험 보고서](AIOPS_OPERATIONAL_TEST_REPORT.md)는 합성 로그 입력, AI 처리 성공, SNS 게시와 실제 수신 확인을 구분해 기록합니다. 이메일 사진은 보고서의 사례별 자리에 추가합니다.

## 배포 후 수동 확인

320/390/768/1440px에서 홈·이동·일정·뉴스·My·Settings를 확인합니다. 터치·키보드·포커스 복귀·네이비 테마·긴 제목·가로 넘침을 함께 봅니다. 실제 모바일 HTTPS GPS와 카카오 지도는 mock SDK 테스트로 대체할 수 없습니다.

운영에서는 CloudFront API 캐시·Cookie/CSRF 전달, ALB readiness, ECS 신규 revision, RDS TLS/Flyway, NAT 외부 통신, 로그 requestId를 확인합니다. 면접 전에는 [스냅샷 복원 절차](INTERVIEW_OPERATIONS.md)까지 별도로 점검합니다. 아직 확인하지 않은 복구·롤백을 완료로 적지 않습니다.
