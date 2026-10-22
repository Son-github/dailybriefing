# 개발·회귀 테스트 방법

## 자동화 실행

Docker가 켜져 있어야 PostgreSQL Testcontainers와 E2E가 실행됩니다. Node22.13+ / Java21 사용.

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

```bash
cd backend
./gradlew test integrationTest bootJar
```

```bash
# root
docker compose build
docker compose up -d --wait
# frontend
npm run test:e2e
```

로그/결과: `backend/build/reports/tests/{test,integrationTest}/index.html`, `frontend/playwright-report/index.html`, failure trace는 `frontend/test-results`.

## 어떤 테스트를 추가할 것인가

| 변경               | 필요한 검증                                                      |
| ------------------ | ---------------------------------------------------------------- |
| Calendar 날짜 정책 | 날짜 unit + 실제PG Upcoming/cleanup boundary                     |
| 사용자 개인 API    | A/B read/update/delete 격리 +401 +validation                     |
| Favorite 순서/중복 | 같은 user 재정렬/중복409 + DB UNIQUE                             |
| 계정/Session       | signup/login/rotation/replay/logout/delete + old token401        |
| Flyway/schema      | 빈 DB migration + 기존 schema에서 upgrade +FK/index 확인         |
| 새 provider        | local HTTP stub shape/error/timeout/missingkey + 별도 LIVE smoke |
| 새 widget          | registry/editor + loading/error/empty + desktop/mobile E2E       |
| UI/UX              | touch/keyboard/focus/320px overflow + meaningful flow            |

동작을 그대로 복제하는 test 대신 실패 경계/권한/데이터 정합성과 핵심 사용자 flow를 검증합니다.

## 개인 데이터 필수 회귀

1. A/B 각각 가입. A의 일정/즐겨찾기를 B의 token으로 수정·삭제해404 확인. B의 목록에 A의 데이터 없음.
2. 오늘 시간 지정/오늘 종일/내일/지난 일정 등록. Upcoming은 날짜순, 같은 날짜는 시간지정 후 종일, 최대3. 지난 날짜 제외.
3. 수정·삭제 후 Dashboard와 Calendar 모두 갱신.
4. 즐겨찾기 저장/경로 이름/위아래/삭제, logout→login 또는 reload 후 유지.
5. 삭제 비밀번호 오류는 데이터를 유지. 올바른 탈퇴 후 모든 user-owned table와 dashboard widgets row count0.
6. old access/refresh401. 같은 email 재가입은 새 UUID, 빈 일정/즐겨찾기.
7. 서울2028-10-05 기준2026-10-04는 cleanup삭제,2026-10-05는 유지. 테스트Clock을 고정하고 SQL bulk delete로 확인.

## 수동 UX 점검

320/390/768/1440px에서 홈/둘러보기/이동/일정/뉴스/온보딩/My/Settings를 확인합니다.

- 날짜grid에 긴 제목이 모바일에서는 노출되지 않고 agenda에서 읽을 수 있는지.
- 장소명/주소 구분, keyboard ArrowDown/Enter/Escape, swap, 같은 좌표 검색 금지.
- 결과의 소요시간/출발·도착/환승/단계 우선순위.
- empty CTA, slow network skeleton, error retry, 저장실패form유지.
- 계정 삭제와 일정 삭제 confirmation, Escape와 dialog focus 복귀.
- 실제 iOS Safari/Android의 date/time input, softkeyboard, bottomsheet, safearea.
- VoiceOver/NVDA와 키보드 접근, dark/system, contrast/reducedmotion.

자동화 모바일 viewport는 실제 OS/브라우저 실기기 검증을 대신하지 않습니다.

## 외부 API 테스트

필수 CI는 외부 키 없이 synthetic JSON fixtures 및 local HTTP server로 재현합니다. 6개 mapper의 실제 필드/단위/시간과 malformed 응답을 검증합니다. `./gradlew liveTest`는 KMA_API_KEY가 있을 때 기상청 실호출을 하고, 없으면 skip합니다. fixture 통과를 LIVE API 검증으로 기록하지 마세요.

LIVE smoke는 [API_SETUP](API_SETUP.md)의 발급/승인 절차 이후 각 서비스에서 수행합니다. GPS 실기기는 HTTPS/권한 조건을 확인하고 지도는 JavaScript 키와 SDK domain을 등록하세요. 카카오 대중교통은 승인된 계약/키가 필요합니다.

## Fresh DB 검증

개발 volume을 지우지 말고 별도 Compose project/테스트volume을 사용하세요. 제공된 `compose.verify.yaml`은 frontend5174와 FRONTEND_URL을 함께 변경합니다. 포트만 바꾸고 CORS origin을 유지하면 인증 요청이 거부됩니다. `!override`를 지원하는 Compose2.24.4+가 필요합니다.

```bash
# root: 기존 project의 volume과 분리
docker compose -p dailybriefing-v2-fresh -f compose.yaml -f compose.verify.yaml up --build -d --wait
# frontend
E2E_BASE_URL=http://localhost:5174 npm run test:e2e -- --grep signup
# root: 테스트 project에 데이터 보관이 필요 없는 경우에만 종료/volume 정리
docker compose -p dailybriefing-v2-fresh -f compose.yaml -f compose.verify.yaml down -v
```

빈PG에서 V1–V8 적용/health/account/signup/calendar/favorites를 확인하고 해당 테스트 project만 정리합니다. 일반 개발 project에서 이 정리 명령을 실행하지 마세요.

## AWS 이전 후 테스트

S3SPA routes, CloudFront /api behavior(cacheoff/header+cookieforward), Securecookie, ALBhealth, privateECS→NATprovider, RDS/Flywaybackup/restore, secretrotation, multi-replica scheduler 책임, latency/DBqueryplans, rollback을 실제환경에서 점검합니다. 현재 로컬 성공만으로 AWS운영 검증 완료라고 표시하지 않습니다.

## 오류·위치·Picker 회귀

- `npm test`: 원인별 안내/요청번호/secret 미노출/중복창/조회 retry/GPS거부/윤년 date 선택.
- Playwright Desktop/Mobile: 현재 GPS→장소→단일경로, permission denied→검색대안, 캘린더 날짜/시간 선택, 길찾기 시각 선택 제거, 필수 경로이름, 저장/reload/login.
- API fixture 검증: Kakao 장소 x/y, 카카오맵 routes/초/요금/좌표/단일최단소요시간, KMA 격자/02:09→전날23:00, KASI singleton, Exim100엔/쉼표BigDecimal, NAVER plainHTML/RFC1123.
- Testcontainers: V6 실데이터→V8 migration 보존, 신규8migration, 즐겨찾기 blankname/A-B격리, calendarCRUD/cleanup, account harddelete.
- 지도 SDK 실제 호출은 등록 키 없이 확인할 수 없습니다. 지도 테스트는 SDK/역지오코딩 mock 계약과 live 수동 테스트를 구분하세요.

## 뉴스 탐색 고도화 회귀

- `NewsCategoryQueryResolverTest`: 다섯 enum 검색어와 잘못된 category 차단.
- `NewsServiceTest`: 5개 요청 동시 실행(barrier로 순차 실행 감지), 한 category 실패 격리, start/display 전달, executor 포화 대응.
- `NaverNewsClientTest`: 로컬 HTTP server로 검색어 UTF-8 단일 인코딩/header/page/sort 전달과 제공 순서(날짜순 재정렬 없음)를 확인합니다. DEMO 끝 페이지도 확인합니다.
- `PlatformIntegrationTest`: sections의 5×5, start6/display10, enum/start/display400 및 기존 로그인/DB 소유권/탈퇴 회귀.
- `news.test.tsx`: 선택분야5개, 탭 추가호출0, 더보기·복귀, 부분실패 재시도, 더보기실패 기존목록 유지, Skeleton/empty/키보드.
- `e2e/news.spec.ts`: Desktop/Mobile 실제 Compose에서 탭 요청수/더보기 offset/목록복귀/오류창 요청번호/분야별 재시도/overflow/reduced-motion 확인.

실제 NAVER smoke는 기존 승인 키가 있는 별도 환경에서 수행합니다. `/api/v1/news/sections`의각 error와 items/hasMore/nextStart, `/api/v1/news?category=IT&start=6&display=10` 및 dashboard tab 전환의 네트워크 요청 수를 확인하세요. 키나 뉴스 원본을 테스트 보고서에 저장하지 마세요. 일반 CI는 외부 NAVER에 의존하지 않습니다.

## 데이터 조회 로그 회귀

`DataFetchLogAdviceTest`는 SAMPLE/EXTERNAL_API·EMPTY·부분 실패·설정 오류와 응답 불변/민감값 제외를 검증합니다. `dataFetchLog.test.tsx`는 브라우저의 상태 구분과 query/인증 요청 제외를 검증합니다. `e2e/data-fetch.spec.ts`는 Compose DEMO 응답 헤더와 화면 출처/Console 수신완료를 Desktop·Mobile에서 확인합니다. LIVE 수신은 승인 키가 있는 별도 환경에서 같은 requestId의 provider_http RECEIVED → data_fetch SUCCESS를 연결해 확인하세요.

## 레이아웃·정리 회귀

`dashboard-layout.test.tsx`는 넓은 위젯 앞/끝의 홀수 카드 배치가 순서를 바꾸지 않고 빈 열을 채우는지 검증합니다. `e2e/layout.spec.ts`는 Desktop/Mobile의 직접 메뉴5개, 네이비 변수/버튼색, 같은 행 카드의 y/height,320px overflow와 제거된 Explore 경로의 홈 fallback을 확인합니다. 테마 스크린샷은 reduced-motion으로 실제 최종색을 기록합니다. Flyway의 과거 대기질 삭제 fixture는 유지해야 업그레이드 회귀를 검증할 수 있습니다.

## 기상청 가이드 대조와 키 인코딩

`KmaWeatherClientTest`는 실제 키 대신 + / =가 포함된 가짜 Decoding key를 로컬 HTTP 서버로 전송합니다. 한 번 디코딩한 값이 원본과 같은지, 전송 URL에 %252B 등의 중복 인코딩이 없는지, 기준시각/격자/JSON 파라미터를 확인합니다. Encoding 형태와 API허브 URL 혼용이 네트워크 전에 명시적으로 차단되는지도 확인합니다.

`KmaWeatherMapperTest`는 기존 격자/발표시각 외 ±900 이상 Missing, NaN, 필수 SKY 누락을 실제 숫자/맑음으로 표시하지 않는지 확인합니다. PTY4=소나기, TMX Missing=null도 검증합니다. 오류창 가이드는 Decoding 입력과 API허브 authKey 구분을 확인합니다. 실제 사용자 키 인증 성공 여부는 이 테스트의 검증 범위에 포함하지 않습니다.

## 카카오맵 전환 검증 (2026-10-20)

- `KakaoMapRouteTest`: 실제 로컬 HTTP 경계에서 REST 인증 헤더, start_x/start_y/end_x/end_y와 WGS84 전달, 이전 날짜/공휴일 파라미터 미전송을 확인합니다. 외부 카카오 서버 호출은 하지 않습니다.
- 원본 초의 최솟값 우선(1199초 vs 1200초), 동률 환승 수, 요금·경로점 단위 변환, 미제공 요금, 정상적인 경로 없음, 잘못된 응답 거부를 검증합니다.
- PostgreSQL API 통합 테스트는 GPS/SEARCH/MAP 입력과 응답의 출발·도착 시각 필드 제거를 검증합니다.
- 브라우저 자동화는 DEMO 환경에서 수행합니다. `.env`가 LIVE이면 테스트용 Compose override에만 `backend.environment.DATA_MODE: DEMO`를 지정하고, 종료 후 원래 Compose로 backend를 재생성하세요. 실제 키를 사용하는 자동화로 전환하지 마세요.
- 실제 연결 확인은 [API_SETUP](API_SETUP.md)의 카카오맵 활성화/REST 키 설정 후 `/transit`에서 서로 다른 장소를 조회합니다. `provider_http` 수신과 `data_fetch` 변환 성공, 화면 LIVE 출처를 함께 확인합니다. 401/403이면 키와 카카오맵 활성화, 429이면 앱 쿼터를 확인하세요. API 응답이 없으면 샘플로 바꾸지 않습니다.

이번 전환 확인 결과: frontend lint/typecheck/build 통과, Vitest 27개 통과, backend 단위 테스트 26개 및 PostgreSQL 통합 테스트 10개 통과, Desktop/Mobile Playwright 24개 통과, Docker image build 및 3개 서비스 health check 통과. 브라우저 검증은 DEMO에서 수행했으며 카카오 실제 인증/운행 데이터 성공을 의미하지 않습니다. 검증 후 기존 `.env` 실행 모드로 복원합니다.

## NAVER API HUB 전환 검증

`NaverNewsClientTest`는 모의 HTTP 서버의 `/search/v1/news`에서 HUB 인증 헤더 두 개와 기존 헤더 미전송, 한글 UTF-8 단일 인코딩, format=json, start/display/sort, 제공 순서 보존, 다음 페이지 offset을 확인합니다. HUB의 gateway 오류 형태를 사용하여 401/403/429가 인증/권한/한도 안내로 변환되고 응답 본문·키가 사용자 오류에 노출되지 않는지도 검증합니다.

```bash
./backend/gradlew -p backend test --tests '*NaverNews*' --tests '*NewsServiceTest'
cd frontend
npm test -- src/test/news.test.tsx
# DEMO 환경의 실행 중인 서비스에서 PC/모바일 뉴스 회귀
npm run test:e2e -- e2e/news.spec.ts
```

실제 연결은 HUB 앱의 뉴스 검색 권한과 `.env`의 HUB Client ID/Secret 설정 후 LIVE 모드 `/news`에서 확인합니다. 초기 조회는 외부 요청 최대 5회이며 API 일일 한도를 사용합니다. provider_http의 RECEIVED뿐 아니라 data_fetch의 SUCCESS/PARTIAL/FAILED와 화면 출처도 확인하세요. 모의 서버 테스트는 실제 키 인증 성공을 의미하지 않습니다.
