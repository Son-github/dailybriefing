# 코드 읽기 가이드

먼저 README의 제품 흐름과 `V2_MOBILITY_UPGRADE.md`의 wireframe을 읽고, 아래 순서로 기능을 따라가세요.

## 1. 화면 진입과 상태

`frontend/src/main.tsx`는 URL→Page 연결과 최초 refresh를 담당합니다. `components/layout/Layout.tsx`는 desktop navigation/mobile bottom navigation 및 theme 적용입니다.

`lib/api.ts`는 baseURL, CSRF, memory access token, refresh single-flight, 일관된 API 오류를 처리합니다. 여러 요청이 동시에401을 받아도 같은 refreshPromise를 공유합니다. `lib/store.ts`에는 화면에 필요한 session/theme만 둡니다. 개인 일정/경로를 Zustand에 복사하지 않습니다.

`AuthPage`의 가입/로그인 성공→query clear→session 설정과 `MyPage`의 탈퇴 성공→clearSession 흐름을 확인하세요. 새 기능에서도 logout 뒤 별도 개인 state를 남기지 마세요.

## 2. 대시보드와 새 위젯

`features/dashboard/registry.ts`가 공통 제목/설명/icon/component/기본size의 등록부입니다. `DashboardPage`는 저장된 순서대로 등록부의 component를 렌더링하고 `DashboardEditor`는 구성 draft를 편집합니다. 저장하기 전에는 원본 설정을 바꾸지 않습니다.

Backend `DashboardService`는 widget type/순서/중복을 검증하고 optimistic version을 비교합니다. child만 수정할 때도 parent updatedAt을 변경해 version을 증가시킵니다.

새 위젯: Frontend WidgetType→registry→독립 component/query→Backend TYPES와 data API를 추가하세요. widget별 settings는 작은 JSONB, 핵심 enabled/order/size는 관계형 컬럼입니다. SQL schema를 무조건 바꿀 필요는 없습니다.

## 3. 이동

`TransitPage`는 PlaceInput/GPS/MapPicker의 공통 Place를 받아 검색합니다. `RouteCard`는 소요시간/환승/요금/단계를 보여줍니다. `FavoriteList`는 이름/순서/삭제를 관리하고 Dashboard는 상위3개 경로를 한 번의 tap으로 다시 조회합니다.

```text
MobilityController → MobilityService → KakaoMapRouteClient → KakaoMapRouteMapper
                                    ↳ DEMO 명시적 샘플 / LIVE 카카오맵 API
PlaceInput / GPS / MapPicker → Place → coordinates
FavoriteRouteController → FavoriteRouteService → FavoriteRouteRepository
```

즐겨찾기는 장소쌍만 저장하며 결과는 저장하지 않습니다. userId는 JWT principal에서 결정합니다. Kakao Provider DTO를 수정할 때 fixture와 mapper를 함께 검증하세요. LIVE에서는 REST API 키를 입력하고 해당 앱의 카카오맵 사용 설정을 ON으로 해야 합니다.

## 4. 개인 일정

`CalendarPage`는 공휴일 query와 개인 일정 query를 분리합니다. 공휴일 API 실패가 내 일정까지 숨기지 않도록 합니다. `EventEditor`는 입력 실패 시 form을 유지하고 수정/삭제 성공 후 calendar/upcoming 둘 다 invalidate합니다.

`dates.ts`는 서울 오늘, 날짜문자열, 월 경계, D-Day 표시입니다. DATE 값을 `toISOString()`으로 만들면 서울 자정이 전날 UTC가 될 수 있으므로 사용하지 않습니다.

```text
CalendarController → CalendarService → CalendarEventRepository → PostgreSQL
```

`findByIdAndUserId`가 수정/삭제 소유권 조건입니다. `range`는 501개를 받아500개 초과 시 기간을 줄이도록 안내합니다. `upcoming`은 SQL에서 order/limit3을 적용합니다. 현재 정책은 오늘 날짜의 시간 지난 일정도 오늘 일정으로 포함합니다(날짜 기준 요구사항). 시간 기준으로 변경하려면 null time 정책부터 정하고 query/test를 함께 수정하세요.

`CalendarCleanupScheduler`는 매일03:00, `CalendarCleanupService`는 cutoff와 transaction, Repository는 bulk delete를 담당합니다. **cutoff 당일 유지** 정책을 변경한다면 SQL의 `<`와 경계 테스트를 함께 변경해야 합니다.

## 5. 회원관리와 삭제

`AuthService`의 가입 transaction은 user/preferences/dashboard/session을 만듭니다. 비밀번호 BCrypt와 refresh SHA256은 목적이 다릅니다. refresh raw 값은 cookie만, DB에는 hash만 있습니다.

`UserService.delete`는 password 확인 후 user를 삭제하고 flush합니다. DB FK cascade가 모든 자식을 지웁니다. JPA cascade를 추가해 같은 일을 반복하지 마세요. `UserController`는 성공 응답에서 refresh cookie를 만료시킵니다. `SecurityConfig`의 session family 검증으로 기존 access도 실패합니다.

Frontend는 탈퇴 성공 후 추가 logout HTTP 요청에 의존하지 않고 인증/query를 즉시 지웁니다. 삭제된 session으로 logout/refresh를 다시 요청해 cleanup이 실패하는 흐름을 피합니다.

## 6. 기존 정보 서비스

- WeatherClient → KmaWeatherClient/Mapper: grid/발표시각/TMP·SKY·PTY 정제. 최고최저/체감 미제공은 null.
- ExchangeClient → KoreaEximClient/ExchangeRateMapper: 쉼표 금액 BigDecimal, 100엔 단위 보존.
- NewsClient → NaverNewsClient/Mapper: NewsCategory 단일 검색어/초기5개×5 병렬/분야별 더보기, HTML→text, 원문 안전 링크와 시간 변환. AI pipeline에 연결하지 마세요.
- BriefingService: 날씨 실패 격리와 rule 문구. AI 확장은 별도 라이선스 데이터로 구현하세요.
- ProviderHttp: connect/read timeout, provider metrics, 민감한 URL/query/key를 로그에 기록하지 않는 공통 통신 경계.

## 7. DB 변경

기존 Flyway 이력은 수정하지 마세요. V5는 종료된 기능의 데이터/위젯을 이전하고 V6는 일정과 경로를 추가합니다. 이후 변경은 V7 이상 새 migration으로 작성합니다.

FK 삭제 책임은 PostgreSQL입니다. index의 목적은 user range/upcoming/favorite order/전역cleanup이며 새 index는 실제 query 계획을 보고 추가하세요.

## 8. 실제로 바꿔야 할 설정

`docs/CONFIGURATION.md` 및 `.env.example`의 주석을 따라 key/secret/origin을 설정합니다. source code에 실제 key를 붙여 넣지 마세요. provider host가 바뀌면 환경값을, response 형식이 바뀌면 해당 adapter와 fixture test를 변경합니다.

설정을 바꾼 뒤 backend container 재생성, Frontend 환경값을 바꾼 뒤 build 재실행이 필요합니다. Vite는 root `.env`를 읽고 Compose는 VITE_API_BASE만 public Docker build argument로 전달합니다. runtime server env가 이미 빌드된 browser JavaScript 값을 자동 변경하지 않습니다.

## 최신 장소 이동/오류 안내

- `features/transit/location.ts`: GPS는 사용자 버튼 이후에만 요청합니다. Place로 반환하고 저장 전에는 DB 쓰기가 없습니다.
- `PlaceInput`: 350ms debounce, keyboard combobox. `MapPicker`: 공개 JS키 lazy load, 중앙 핀/클릭/역지오코딩.
- `MobilityController/Service`: POST body 좌표, 동일 장소 검증. `KakaoMapRouteClient`는 REST 키로 카카오맵 publictraffic endpoint 호출.
- `KakaoPlaceMapper/KakaoMapRouteMapper`: Provider 규격을 사용자 화면과 분리합니다. 변경 시 fixtures 테스트도 수정하세요.
- `FavoriteRouteService`: 이름 필수/좌표쌍/소유권/순서. `V8`은 기존 경로 이름을 보존하고 needsLocation을 표시합니다.
- `lib/errors.ts`: 오류 코드 → 검토된 원인/해결 안내. 새로운 실패 원인은 이 표에 추가하세요. raw provider 오류/stack/키를 표시하지 않습니다.
- `lib/api.ts`: QueryCache/MutationCache가 마지막 실패를 공통 오류창으로 전달합니다. 초기 guest refresh는 별도 함수에서 처리되어 정상401이 팝업으로 나오지 않습니다.
- `ErrorDialog`: 한 번에 하나의 Sheet, 요청번호 복사, 조회 재시도. 저장 mutation을 자동 재실행하지 않습니다.
- `DateTimePicker`: 일정/이동 공통 날짜 달력 및 시간 selector. 날짜는 UTC 변환 없이 서울 날짜 문자열로 유지합니다.

직접 입력할 값은 `.env.example`의 주석과 [API_SETUP](API_SETUP.md)를 참고하세요. 설정 값 변경 후 backend recreate, VITE값 변경 후 frontend rebuild가 필요합니다.

## 뉴스 카테고리·더 보기

`news/NewsCategory`가 검색어를 결정하고 `NaverNewsClient`가 start/display/sort를 전달합니다. `NewsService.sections`는 bounded5 worker와8초 deadline으로5개 섹션을 조회하며 각 실패를 error DTO로 격리합니다. raw envelope의 total/start/items를 내부 nextStart로 바꿉니다. 제공된 순서를 변경하지 마세요.

Frontend `features/news/queries.ts`는 공통 sections를 공유하고 `NewsPage`의 CategoryFeed는 이를 initialData로 사용합니다. 탭은 UI 선택만 변경하고 fetchNextPage는 사용자 버튼에서만 실행합니다. 실패 재시도는 그 category만 갱신합니다. 기존 preference alias는 model.ts에서 읽으며 DB는 변경하지 않습니다. 공통 카드에 AI 필드나 생성 이미지·언론사를 추가하지 마세요.

## 지도 위치 선택 UI

`MapPicker`는 지도 안에 공통 `PlaceInput`을 재사용해 출발지/도착지를 검색합니다. 검색 결과를 선택하면 지도 중심과 주소를 함께 바꾸며, 지도를 직접 이동하면 idle 시점에 주소를 조회합니다. 화면과 확정 버튼에는 주소가 확인된 Place만 사용하고 위도/경도는 화면에 표시하지 않습니다. 주소를 찾지 못한 위치는 선택을 막고 검색 또는 다른 위치를 안내합니다.

이동 시작 시 이전 주소 요청을 abort하고 revision을 증가시켜 늦게 도착한 주소가 새 좌표에 붙지 않도록 합니다. 검색 결과의 주소가 있고 좌표가 같으면 역지오코딩을 재호출하지 않습니다. SDK 이벤트와 타이머/요청은 닫힐 때 정리합니다. 핀의 moving/settled 상태는 CSS 들어올리기/정착 애니메이션으로 표시하고 prefers-reduced-motion에서는 애니메이션을 끕니다.

검증: `map-picker.test.tsx`에서 주소 확인 전 선택 차단, 오래된 응답 무시, 지도 안 검색을 확인합니다. `e2e/map-picker.spec.ts`는 Desktop/Mobile의 주소·검색·핀 상태·reduced-motion을 모의 SDK로 검증합니다. 실제 SDK와 지도 타일의 외부 네트워크 성공을 이 자동화 결과로 간주하지 않습니다.
