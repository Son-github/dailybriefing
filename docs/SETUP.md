# 로컬 실행과 API 설정

## 먼저 실행하기

Docker Engine과 Compose가 필요합니다. 개별 개발은 Node.js 22.13 이상, Java 21을 사용합니다. 아래 명령은 프로젝트 최상위에서 실행합니다.

```bash
cp .env.example .env
# .env의 DB_PASSWORD와 JWT_SECRET을 로컬 전용 값으로 변경
# 외부 키 없이 화면과 회원 기능을 확인하려면 DATA_MODE=DEMO 유지
docker compose up --build -d --wait
```

화면은 http://localhost:5173 입니다. 계정·일정·설정은 PostgreSQL에 저장하고 Flyway가 스키마를 생성합니다. 종료는 `docker compose down`을 사용합니다. `down -v`는 DB 데이터까지 삭제합니다.

## .env와 .env.example의 차이

`.env.example`은 필요한 변수의 설명과 기본값을 공유하는 파일입니다. `.env`는 내 PC에서 실제로 읽는 설정이며 Git에서 제외됩니다. 두 파일은 자동으로 동기화되지 않습니다. 기존 `.env`를 예제로 덮어쓰지 말고 빠진 항목만 추가하세요.

| 항목 | 넣을 값 |
| --- | --- |
| DB_NAME / DB_USERNAME / DB_PASSWORD | 로컬 PostgreSQL 초기 설정. 기존 volume의 비밀번호는 환경변수만 바꿔도 변경되지 않음 |
| JWT_SECRET | 최소 32 UTF-8 바이트의 난수. 로컬과 운영 값을 별도로 사용 |
| DATA_MODE | DEMO는 외부 정보 샘플, LIVE는 실제 공급자 호출 |
| FRONTEND_URL | 로컬은 http://localhost:5173. CORS에 사용하는 정확한 origin |
| COOKIE_SECURE | 로컬 HTTP는 false, 운영 HTTPS는 true |
| KMA_API_KEY / KASI_API_KEY | 공공데이터포털의 Decoding 키 |
| KOREA_EXIM_API_KEY | 한국수출입은행 환율 키 |
| NAVER_API_CLIENT_ID / NAVER_API_CLIENT_SECRET | NAVER API HUB 앱의 인증 값 |
| KAKAO_REST_API_KEY | 서버의 장소·주소·경로 조회용 REST 키 |
| VITE_KAKAO_MAP_KEY | 브라우저 지도용 공개 JavaScript 키. REST 키와 다름 |

API 주소는 예제의 기본값을 유지하고 발급받은 인증 값부터 입력합니다. JWT 난수는 `openssl rand -base64 48`로 생성할 수 있습니다. 출력은 비밀값이므로 문서나 Git에 붙이지 않습니다.

Backend 설정 변경은 `docker compose up -d --force-recreate backend`로 반영합니다. 코드까지 변경했다면 `--build`를 추가합니다. Vite 설정은 개발 서버를 재시작하고, 컨테이너 화면 설정은 frontend를 다시 빌드합니다. 운영 공개 지도 키와 LIVE 전환은 [배포 문서](DEPLOYMENT.md)의 runtime-config로 관리합니다.

## 개별 개발

```bash
# PostgreSQL만 컨테이너로 실행하고 로컬 포트 공개
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres

# Backend: .env 값을 IDE 실행 환경에 주입한 뒤 실행
./backend/gradlew -p backend bootRun

# 별도 터미널
npm --prefix frontend ci
npm --prefix frontend run dev
```

Spring Boot를 IDE나 Gradle로 직접 실행하면 루트 `.env`가 자동으로 로드되지는 않습니다. 실행 환경에 DB·JWT·프로필·API 변수를 지정하세요. PostgreSQL은 localhost:5432, Backend는 localhost:8080을 사용합니다. Compose 내부에서는 DB_HOST가 postgres이며 localhost가 아닙니다. 브라우저는 `/api/v1`을 호출하고 Vite 또는 Nginx가 Backend로 전달합니다. BACKEND_URL은 Vite 개발 프록시 대상이며 기본값은 http://localhost:8080입니다. 실제 프록시 설정은 `frontend/vite.config.ts`와 `frontend/nginx.conf`를 기준으로 확인합니다.

## 샘플과 실제 데이터 구분

- Backend DEMO: 외부 정보만 샘플. 회원·개인 데이터는 실제 로컬 DB를 사용합니다.
- Frontend STATIC_DEMO: 서버 없이 화면 체험. 회원가입·로그인·개인 서버 저장은 제공하지 않습니다.
- LIVE: 실제 공급자를 호출합니다. 실패를 샘플 성공으로 바꾸지 않습니다.

화면 출처와 브라우저 Console, Backend 로그를 함께 확인하세요. `provider_http ... RECEIVED`는 HTTP 응답 수신, `data_fetch ... SUCCESS`는 내부 데이터 변환 완료입니다. EMPTY는 정상 응답에 결과 없음, PARTIAL은 일부 실패, FAILED는 조회 실패입니다. TanStack Query 캐시를 사용하면 화면을 다시 열어도 외부 요청이 새로 나가지 않을 수 있습니다.

## Kakao 장소 검색

- [Kakao Developers](https://developers.kakao.com/)에서 개발자 계정 및 앱을 생성합니다.
- 앱의 플랫폼 키에서 REST API 키를 확인하고 `KAKAO_REST_API_KEY`에 입력합니다. 현재 Local API 이용 권한/활성화 조건도 앱 설정에서 확인하세요.
- [공식 Local 규격](https://developers.kakao.com/docs/ko/local/dev-guide): `https://dapi.kakao.com/v2/local/search/keyword.json?query=코엑스&size=15`, 헤더 `Authorization: KakaoAK {REST_API_KEY}`.
- x는 경도, y는 위도이며 문자열을 서버에서 숫자로 변환합니다. 도로명 주소 우선, 없으면 지번 주소를 사용합니다.
- Backend를 통해 `GET /api/v1/mobility/places?query=코엑스`를 확인합니다. 키를 URL로 직접 전달하지 마세요.
- 좌표 역지오코딩: `/v2/local/geo/coord2address.json?x={longitude}&y={latitude}`. 내부 `/mobility/location` API로 주소를 확인합니다.

## 카카오맵 대중교통

[공식 REST API](https://developers.kakao.com/docs/ko/kakaomap/rest-api)의 `GET https://dapi.kakao.com/v2/routing/publictraffic`를 사용합니다. 기존 카카오 모빌리티 제휴 endpoint는 사용하지 않습니다.

1. Kakao Developers에서 앱을 선택하고 **카카오맵 → 사용 설정을 ON**으로 변경합니다.
2. `.env`의 `KAKAO_REST_API_KEY`에 해당 앱의 **REST API 키**를 입력합니다. 지도용 JavaScript 키와 다릅니다.
3. `KAKAO_ROUTE_API_URL=https://dapi.kakao.com/v2/routing/publictraffic`가 기본값입니다. `KAKAO_TRANSIT_APPROVED`는 삭제되었으며 입력할 필요가 없습니다.
4. `DATA_MODE=LIVE` 후 backend를 재생성합니다. 이 모드는 다른 정보 API에도 적용되므로 각 API 키도 준비해야 합니다. `docker compose up -d --build`로 현재 코드와 환경변수를 반영합니다.
5. `/transit`에서 출발지·도착지를 선택하고 조회합니다. `provider_http provider=KakaoMapTransit` 및 `data_fetch` 로그로 응답/변환 성공 여부를 확인합니다. 키나 좌표를 로그에 출력하지 마세요.

요청은 `start_x/start_y/end_x/end_y`와 WGS84 좌표계만 전달합니다. 내부 `POST /api/v1/mobility/routes` body는 `{start: Place, end: Place}`입니다. CSRF 보호는 유지하며 브라우저 화면 또는 Swagger에서 CSRF cookie/header를 준비합니다. `routes[].properties.totalTime`(초) 최솟값을 선택하고 동률이면 환승 수, 거리 순으로 비교하여 **경로 하나만** 반환합니다. 소요시간은 올림한 분, 요금은 `fare.value`의 원 단위입니다. 확정 요금 없이 min/max만 있으면 `요금 미제공`으로 표시합니다.

API가 제공하지 않는 날짜/시각 지정과 정확한 출발·도착 시각은 제거했습니다. 운행·대기 상황에 따라 실제 이동시간이 달라질 수 있습니다. 길찾기에 KASI 키는 필요하지 않으며 캘린더 공휴일 기능에서만 사용합니다.

무료 제공량과 추가 앱/초과 사용의 유료 조건은 [카카오맵 이용 안내](https://developers.kakao.com/docs/ko/kakaomap/common)와 [쿼터](https://developers.kakao.com/docs/ko/getting-started/quota)를 확인하세요. 모든 사용이 무조건 무료인 것은 아닙니다. 실제 키 인증 성공은 fixture/DEMO 테스트와 별도로 검증해야 합니다.

## Kakao 지도와 GPS

- [지도 Web 준비 가이드](https://apis.map.kakao.com/web/guide/)에 따라 JavaScript 키와 SDK 도메인을 등록합니다. REST 키를 지도키로 사용하지 마세요.
- `VITE_KAKAO_MAP_KEY`에 **JavaScript 키**를 넣고 frontend를 빌드합니다. 이 값은 공개 build artifact에 포함됩니다.
- 로컬 SDK domain은 `http://localhost:5173`. 필요 시 별도 검증 포트와 실제 운영 HTTPS 도메인도 등록합니다.
- Mobility에서 지도 선택 → 클릭/이동 → 중앙 핀 → 주소 preview → 확정으로 확인합니다. 키가 없으면 오류 안내와 장소 검색 대안을 제공합니다.
- GPS는 현재 위치 버튼을 눌렀을 때만 권한을 요청합니다. 위치 데이터는 client/request에서만 일시 사용하며 사용자가 명시적으로 즐겨찾기 저장을 선택하면 좌표 쌍이 DB에 저장됩니다.
- 휴대폰에서 다른 PC의 `http://192.168.x.x`에 접속하면 Geolocation의 secure context 조건을 만족하지 않을 수 있습니다. 실기기 GPS 테스트는 HTTPS 개발 주소에서 진행하고 FRONTEND_URL/CORS/지도 SDK domain을 그 주소로 맞추세요. 기본 Compose는 loopback에만 포트를 공개합니다.

## 기상청 (KMA)

- [공공데이터포털 단기예보 조회서비스](https://www.data.go.kr/data/15084084/openapi.do)의 활용신청을 완료합니다. 기관 승인/트래픽 한도는 해당 신청 화면에서 확인하세요.
- **반드시 공공데이터포털 일반 인증키(Decoding) 원본**을 `KMA_API_KEY`에 넣습니다. **Encoding 키는 넣지 마세요.** 코드가 URI builder로 한 번만 인코딩하고, 완성된 URI를 HTTP client의 URI overload에 그대로 전달합니다. Encoding 형태를 입력하면 `KMA_KEY_ENCODING` 안내가 표시됩니다.
- 현재 앱은 `apis.data.go.kr` / `serviceKey` 방식입니다. `apihub.kma.go.kr` URL이나 API허브 발급키를 섞지 마세요. 상세 대조: [KMA_GUIDE_REVIEW](SETUP.md).
- 사용 operation: `getVilageFcst`, base URL `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0`.
- 위경도→5km Lambert grid는 `KmaWeatherMapper.grid`에서 변환합니다. 서울시청: nx60/ny127.
- 첨부 가이드와 대조한 발표 기준은 서울시각 02/05/08/11/14/17/20/23시, 제공 지연 10분을 감안합니다. 02:09에는 전날 23시, 02:10에는 당일 02시를 요청합니다.
- TMP/SKY/PTY/REH/POP를 현재 시간이 속한 시간대 이후 첫 예보시간으로 묶습니다. TMX/TMN이 최신 응답에 없으면 null/미제공입니다. 체감온도는 해당 예보에 없어 생성하지 않습니다. 현재 온도 수치는 관측값이 아니라 단기예보라는 출처를 표시합니다.
- `GET /api/v1/weather?latitude=37.5665&longitude=126.978`와 현재 위치 날씨 버튼으로 확인합니다. 대한민국 범위 밖은 명시적 입력 오류입니다.
- `KMA_API_KEY=... ./gradlew liveTest`는 키가 있을 때만 외부 호출을 합니다. shell history에 키가 남지 않도록 기존 환경에서 export하고 명령은 키 없이 실행하세요.

## 한국천문연구원 (KASI)

- [특일정보 활용신청](https://www.data.go.kr/data/15012690/openapi.do) 후 Decoding 키를 `KASI_API_KEY`에 설정합니다.
- `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`: serviceKey/solYear/solMonth/_type=json/numOfRows=100.
- 내부 `GET /api/v1/calendar/holidays?year=2026&month=10`에서 확인합니다. 단일 item 객체와 item 배열을 모두 정제합니다.
- locdate=20261009→2026-10-09, isHoliday=Y만 채택합니다. 공휴일 실패가 개인 일정 CRUD를 막지 않습니다.

## 한국수출입은행

- [공식 Open API 신청 페이지](https://www.koreaexim.go.kr/ir/HPHKIR020M01)에서 환율 API key를 신청하고 `KOREA_EXIM_API_KEY`에 입력합니다. 포털 로그인/외부 네트워크에 따라 페이지 접근이 제한될 수 있습니다.
- 기본 endpoint: `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON`, params authkey/searchdate(yyyyMMdd)/data=AP01.
- 이전 www 도메인이 아닌 oapi 도메인을 사용하며 필요 시 `KOREA_EXIM_API_URL`로 교체합니다. 운영 전에 공식 신청 화면의 최신 URL/한도를 다시 확인하세요.
- 오전 공표 전/주말은 직전 평일 조회. 공휴일/무공표에는 자동으로 7일씩 재시도하지 않고 미공표 오류와 해결 안내를 제공합니다.
- 쉼표 포함 금액을 BigDecimal로 변환합니다. JPY(100)는 **100엔 기준**이므로 UI에 단위를 표시합니다. 이전값이 없으면 변동값을 생성하지 않습니다.
- 내부 `GET /api/v1/exchange-rates?pairs=USD,JPY,EUR`로 확인합니다. 실제 키/공표일 계약 테스트는 별도 LIVE smoke가 필요합니다.

## NAVER 뉴스

- [NAVER API HUB 뉴스 검색](https://api.ncloud-docs.com/docs/naver-api-hub-search-news)을 사용합니다. 기존 NAVER Developers 검색 API와 키/경로/헤더가 다릅니다. 이전 키를 그대로 사용할 수 있다고 가정하지 마세요.
- 네이버 클라우드 콘솔 → All Services → Application Services → NAVER API HUB → Application → Application 등록에서 **뉴스 검색**을 선택합니다. 앱의 인증 정보에서 Client ID와 Client Secret을 확인합니다. [공식 발급 안내](https://api.ncloud-docs.com/docs/naver-api-hub-overview).
- `.env`의 `NAVER_API_CLIENT_ID` / `NAVER_API_CLIENT_SECRET`에 **해당 HUB 앱**의 값을 넣으세요. 변수 이름은 유지했습니다. 값은 인코딩/디코딩하지 말고 발급받은 원본 그대로 넣습니다. Backend 전용이며 VITE 변수에 넣지 마세요.
- `NAVER_API_URL=https://naverapihub.apigw.ntruss.com` (base URL만 입력). Client가 `/search/v1/news`와 `format=json`을 추가합니다. 기존 `/v1/search/news.json`은 사용하지 않습니다.
- ID/Secret의 발급처를 확인하고 HUB 값을 입력한 다음 `docker compose up -d --build backend`로 반영합니다. `DATA_MODE=LIVE`에서 실제 API를 호출하고 DEMO에서는 샘플만 반환합니다.
- 최초 `GET /api/v1/news/sections`: IT/경제/사회/국제/스포츠 각각 `query=IT/경제/사회/국제/스포츠`, `display=5&start=1&sort=date`. bounded executor의 5 worker로 병렬 호출합니다. 응답은 각 category의 items/hasMore/nextStart/meta/error입니다. 결과는 최대25개이며 제공 순서를 그대로 유지합니다.
- 탭 전환은 추가 호출이 없습니다. 뉴스 페이지 더 보기는 `GET /api/v1/news?category=IT&start=6&display=10`; 그 다음은 nextStart를 사용합니다. 재시도는 실패 category만 start1/display5 요청합니다.
- start1–1000, display1–100만 허용하며 끝 경계에서는1000을 넘지 않도록 크기를 제한합니다. 잘못된 category400. 요청 timeout: connect2초/read4초, sections 전체 대기8초. 자동 provider retry 없음.
- headers `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY`. 초기 화면은 외부 요청 최대 5회, 더보기는 1회를 사용합니다. 앱의 현재 한도·요금은 HUB 콘솔에서 확인하세요.
- 각 카테고리는 검색어이며 기사 자체를 분류하는 모델이 아닙니다. AI 분류/요약/감성/학습/평가/embedding에 연결하지 않습니다. 뉴스 DB/서버 cache 저장 없음. TanStack Query는 화면 탐색 중 결과만 기기 메모리에 잠시 유지하며 localStorage/IndexedDB에 저장하지 않습니다.
- HTML 강조 태그는 text로 정제하고 제목/설명 원문을 재작성하지 않습니다. 원문 링크 우선/제공 링크 fallback, 안전한 http(s)와 `noopener noreferrer`. source는 실제 링크 host이며 언론사명을 생성하지 않습니다. pubDate는 ISO8601으로 유지합니다.
- 화면 출처는 `NAVER API HUB`로 표시하고 뉴스 원문 링크를 유지합니다. 계약/표시 정책과 현재 사용 한도·요금은 사용 중인 HUB 앱과 공식 이용 조건에서 확인하세요. 무료 범위를 넘는 사용이 모두 무료인 것은 아닙니다.
- 401이면 HUB 앱 ID/Secret과 뉴스 검색 권한, 403이면 권한/HTTPS, 429이면 일일 한도를 확인합니다. raw 오류 본문이나 secret은 사용자 화면/로그에 노출하지 않습니다. 실제 계정 인증 성공은 모의 서버 테스트와 별도로 검증해야 합니다.


## 오류 해결 체크 순서

1. 네트워크/시간초과: 서버 인터넷 접근, HTTPS/DNS, connect/read timeout 확인. Private ECS는 NAT outbound 필요.
2. PROVIDER_NOT_CONFIGURED: `.env`의 해당 서버키가 비어 있는지 확인하고 backend recreate.
3. PROVIDER_AUTH/FORBIDDEN: 키 종류, 활용신청/카카오맵 활성화, 만료 확인. 키를 복사한 화면/로그는 공개하지 않음.
4. 지도 오류: JavaScript 키, 정확한 scheme/host/port의 SDK domain 등록, frontend rebuild 확인.
5. PROVIDER_LIMIT: 공급자 dashboard의 쿼터 확인. 무한 retry 금지.
6. UPSTREAM_FORMAT: fixture/mapper 규격 비교. 사용자가 수정할 수 없는 provider 형식은 관리자 조치가 필요함.
7. 요청 번호로 backend 로그를 조회. 비밀번호/JWT/refresh/API key가 없는 로그만 공유.

현재 `.env`의 변수 차이와 실제 입력 위치, 변경 후 재실행 및 데이터 수신 로그 확인은 [ENV_LOCAL_GUIDE](SETUP.md)를 참고하세요.
