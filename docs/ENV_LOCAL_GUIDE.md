# 내 로컬 환경변수와 데이터 조회 로그

확인일: 2026-10-20. 실제 키나 기존 값을 문서·로그에 기록하지 않고 변수 이름만 비교했습니다.

## `.env`와 `.env.example`은 무엇이 다른가요?

- 루트 `.env.example`: 필요한 변수의 목록과 예시입니다. 실제 실행 설정으로 자동 사용되지 않습니다. Git에 포함합니다.
- 루트 `.env`: 내 컴퓨터의 실제 실행 설정입니다. Docker Compose가 치환 값과 backend env_file로 읽습니다. 실제 키는 이 파일에 입력합니다. Git에 포함하지 않습니다.
- Backend `application.yml`: 환경변수 이름을 Spring 설정과 연결하며 URL 등의 기본값을 제공합니다. Java/Spring을 IDE·Gradle로 직접 실행하면 루트 `.env`가 저절로 읽히지 않습니다. IDE 환경변수 설정이나 실행 환경에 값을 주입해야 합니다.
- Frontend: Docker는 루트 `.env`의 VITE_API_BASE와 VITE_KAKAO_MAP_KEY를 build args로 넘깁니다. 현재 `vite.config.ts`는 `envDir: ".."`로 설정되어 `npm run dev`도 루트 `.env`의 공개 VITE_* 설정을 읽습니다. 변경 후 개발 서버를 재시작하세요. VITE_ 접두사가 없는 서버 키를 Frontend 코드에서 사용하거나 별도 공개 변수로 복사하지 마세요.

이번 확인에서는 최신 템플릿에만 있는 변수14개와 예전 `.env`에만 있는 변수12개가 있었습니다. 누락14개를 `.env` 마지막에 기본값/빈칸으로 추가했습니다. 이후 코드 정리 요청에 따라 아래에 기록된 예전 공급자 변수12개는 삭제했습니다. **현재 사용하는 키와 DB·인증 설정은 유지했습니다.** 추가된 빈칸은 API 발급이 완료되었다는 뜻이 아닙니다.

## 직접 값을 넣어야 하는 7개 항목

루트 `.env` 마지막의 `현재 Provider용 설정` 블록에서 해당 줄을 수정하세요. `=` 뒤의 빈칸에 값만 입력하고, 같은 변수를 파일 아래에 다시 추가하지 마세요.

| 기능                | 변수                    | 무엇을 입력하나요?                                                       |
| ------------------- | ----------------------- | ------------------------------------------------------------------------ |
| 날씨                | KMA_API_KEY             | 기상청 단기예보 활용신청 후 일반 인증키(Decoding) 원본. Encoding 키 금지 |
| 공휴일              | KASI_API_KEY            | 한국천문연구원 특일정보 활용신청 후 Decoding 인증키                      |
| 환율                | KOREA_EXIM_API_KEY      | 한국수출입은행 환율 Open API 발급키                                      |
| 장소 검색·주소 변환 | KAKAO_REST_API_KEY      | Kakao 앱의 REST API 키                                                   |
| 지도 화면           | VITE_KAKAO_MAP_KEY      | Kakao 앱의 JavaScript 키. SDK 도메인에 http://localhost:5173 등록        |
| 뉴스                | NAVER_API_CLIENT_ID     | 네이버 클라우드 NAVER API HUB에서 뉴스 검색 권한을 선택한 앱의 Client ID           |
| 뉴스                | NAVER_API_CLIENT_SECRET | 같은 앱의 Client Secret                                                  |

발급 절차/활성화와 NAVER API HUB 이용 조건은 [API_SETUP](API_SETUP.md)에 있습니다. 기존 키의 이름만 바꾼다고 새로운 공급자에서 사용할 수 있는 것은 아닙니다. 기상청/특일정보는 각 서비스 활용신청도 필요합니다. 지도키 외 REST/secret은 VITE_ 변수에 넣지 마세요.

## 보통 수정하지 않는 6개 API 주소

| 변수                   | 추가한 기본값 / 의미                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| KMA_API_URL            | https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0                            |
| KASI_API_URL           | https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService                     |
| KOREA_EXIM_API_URL     | https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON                     |
| KAKAO_PLACE_API_URL    | https://dapi.kakao.com                                                               |
| KAKAO_ROUTE_API_URL    | https://dapi.kakao.com/v2/routing/publictraffic |
| NAVER_API_URL          | https://naverapihub.apigw.ntruss.com                                                            |

이 URL들은 `application.yml`에도 기본값이 있으므로 `.env`에 없다고 모두 오류가 나는 것은 아닙니다. 하지만 API 키의 기본값은 빈칸이므로 LIVE 호출에는 올바른 키가 필요합니다. 대중교통은 해당 앱의 카카오맵 사용 설정을 ON으로 해야 합니다. KAKAO_TRANSIT_APPROVED는 제거했습니다. KASI 키는 캘린더 공휴일에서만 사용합니다.

## 정리한 이전 변수 12개

다음은 현재 `application.yml`에서 읽지 않는 과거 설정으로 코드 정리 때 `.env`에서 제거했습니다. 현재 필요한 값은 새 변수에 입력하세요. 아래 표는 변경 이력을 설명하기 위한 것이며 삭제한 변수에 다시 키를 넣을 필요는 없습니다.

| 예전 변수                                 | 현재 사용하는 변수                                            |
| ----------------------------------------- | ------------------------------------------------------------- |
| WEATHER_API_KEY / WEATHER_API_URL         | KMA_API_KEY / KMA_API_URL                                     |
| HOLIDAY_API_KEY / HOLIDAY_API_URL         | KASI_API_KEY / KASI_API_URL                                   |
| EXCHANGE_API_KEY / EXCHANGE_API_URL       | KOREA_EXIM_API_KEY / KOREA_EXIM_API_URL                       |
| NEWS_API_KEY / NEWS_API_URL               | NAVER_API_CLIENT_ID + NAVER_API_CLIENT_SECRET / NAVER_API_URL |
| TRANSIT_API_KEY / TRANSIT_API_URL         | KAKAO_REST_API_KEY / KAKAO_ROUTE_API_URL 및 카카오맵 활성화         |
| AIR_QUALITY_API_KEY / AIR_QUALITY_API_URL | 대체 없음. 대기질 기능이 제거됨                               |

특히 NEWS_API_KEY 하나는 NAVER Client ID/Secret 두 값으로 자동 변환할 수 없습니다. 예전 Weather/Exchange 키도 공급자가 다르면 그대로 옮기면 안 됩니다.

## 기존 공통 설정은 그대로 사용하세요

DB_HOST/PORT/NAME/USERNAME/PASSWORD, JWT_SECRET, FRONTEND_URL, COOKIE_SECURE, profile, timeout, 일정정리 설정은 새 공급자 키와 별개입니다. 기존 PostgreSQL volume이 있는 상태에서 DB_PASSWORD만 바꾸면 DB 비밀번호는 자동 변경되지 않아 연결이 끊길 수 있습니다. 이번에는 이런 기존 값을 건드리지 않았습니다. BACKEND_URL은 Spring 설정이 아니라 Vite 개발 서버의 Backend proxy 대상입니다. Docker 통합 모드에서는 nginx가 backend 서비스로 전달하고, 브라우저 요청 기준은 VITE_API_BASE=/api/v1입니다.

## 실제 API를 적용하는 순서

현재 로컬 `.env` 확인 시 DATA_MODE=DEMO였습니다. 키를 넣어도 DEMO이면 샘플만 조회합니다.

1. 필요한 키와 승인을 입력합니다.
2. 실제 호출을 검증할 때 DATA_MODE=LIVE로 변경합니다. **현재 모드는 공급자 전체 공통**이므로 키가 준비되지 않은 다른 위젯은 실패할 수 있습니다. 다른 위젯 장애로 전체 대시보드를 막지는 않습니다.
3. 서버 환경 변경 적용:

```bash
docker compose up -d --force-recreate backend
```

4. 지도 JavaScript 키는 빌드 시 포함되므로 별도 재빌드:

```bash
docker compose build frontend
docker compose up -d frontend
```

코드 변경까지 처음 반영할 때는 `docker compose up -d --build`를 실행합니다. `docker compose restart`만으로는 바뀐 env_file이 적용되지 않습니다. `down -v`는 데이터 volume을 삭제하므로 키 변경을 위해 사용하지 마세요.

## 데이터를 가져왔는지 확인하는 방법

### 화면

위젯 하단 출처에 `샘플 데이터 · 실제 API 미호출` 또는 `실제 API 데이터 · 공급자`와 조회 시각이 표시됩니다. 탭 전환은 이미 받은 데이터로 그릴 수 있으며 업데이트 시각이 늘 외부 데이터의 공표 시각을 의미하는 것은 아닙니다.

### 브라우저 개발자도구 Console

새로고침하거나 해당 정보를 조회하면 다음 형식의 로그가 출력됩니다.

```text
[Daily Briefing] 데이터 조회
{endpoint: '/weather', mode: '샘플 데이터 (외부 API 미호출)', result: '데이터 수신 완료', httpStatus: 200, requestId: '...'}
```

LIVE 모드, 결과 없음, 일부 실패, 네트워크 실패도 구분합니다. 검색어/좌표/토큰/응답 본문은 기록하지 않습니다. HTTP200이어도 뉴스 섹션에 일부 실패가 있으면 `일부 실패`로 표시합니다.

### Backend 로그

```bash
docker compose logs -f --tail=100 backend
```

```text
requestId=... data_fetch endpoint=/api/v1/weather category=- mode=DEMO source=SAMPLE result=SUCCESS items=1
requestId=... provider_http provider=NAVER mode=LIVE result=RECEIVED httpStatus=200 code=NONE latencyMs=...
requestId=... data_fetch endpoint=/api/v1/news category=IT mode=LIVE source=EXTERNAL_API result=SUCCESS items=5
requestId=... data_fetch endpoint=/api/v1/weather mode=LIVE result=FAILED code=PROVIDER_NOT_CONFIGURED
```

- `provider_http ... RECEIVED`: 외부 HTTP 응답을 받았다는 뜻입니다. 이후 데이터 정제는 실패할 수도 있습니다.
- `data_fetch ... SUCCESS`: 정제까지 완료하여 응답으로 전달합니다. SAMPLE이면 외부 API를 호출한 것이 아닙니다.
- `EMPTY`: 조회는 성공했지만 결과0개입니다. 공휴일 없는 달 등은 정상일 수 있습니다.
- `FAILED`: 오류 코드를 보고 설정·권한·timeout 등을 확인하세요.
- 뉴스 sections는 category별 로그이므로 일부 성공/실패를 구분할 수 있습니다.
- requestId로 동일 요청의 HTTP/외부 호출/정제 로그를 연결합니다. API 키·기사 내용·정확한 위치는 출력하지 않습니다.

**Console/Backend 로그가 없다고 무조건 실패는 아닙니다.** TanStack Query가 이미 받은 데이터를 재사용하면 새 HTTP 요청과 로그가 없습니다. 뉴스 탭 변경이 대표적입니다. 브라우저 Network와 화면의 기존 조회 시각을 함께 확인하세요. HTTP 요청/정제 성공은 위젯 렌더링이나 공급자 데이터의 최신성까지 보증하는 의미는 아닙니다.

기상청 261019 가이드의 URL Encode 표기와 `.env` Decoding 입력의 차이, API허브 authKey와의 구분은 [KMA_GUIDE_REVIEW](KMA_GUIDE_REVIEW.md)에 정리했습니다. 현재 실제 키 값은 자동 변환/수정하지 않습니다.
