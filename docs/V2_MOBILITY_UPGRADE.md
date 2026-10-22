# Daily Briefing v2 — 장소 이동 및 사용성 개선 설계

> 과거 설계/검증 기록입니다. 2026-10-20 카카오맵 REST publictraffic으로 전환했으며 출발 시각 지정/모빌리티 제휴 플래그를 제거했습니다. 현재 설정은 [API_SETUP.md](API_SETUP.md)를 따르세요.

기존 인증, 사용자 Dashboard, 일정 CRUD, 2년 정리, 회원탈퇴 트랜잭션을 유지한다. 이 문서는 구현 전에 현재 코드를 분석한 변경 계획이다.

## 1. 제거 범위

AirQualityClient/Widget, Air DTO/API, registry/default widget/환경 설정을 제거한다. 적용된 V1–V6는 수정하지 않고 새 Flyway migration에서 기존 대기질 widget을 삭제한다. Caffeine dependency, Spring Cache 설정/annotation도 제거한다. Redis를 추가하지 않는다. TanStack Query의 UI 서버 상태 관리는 유지한다.

## 2. 현재 이동 구조

현재는 StationInput → /transit/routes → SeoulTransitProvider, 역 ID 쌍을 저장한다. 이 흐름을 Place → /mobility/routes → KakaoRouteClient로 교체한다. 기존 최소 도착시간 경로 **한 개** 정책을 유지한다. DEMO는 허구 데이터임을 표시하고 LIVE 오류를 DEMO로 바꾸지 않는다.

## 3. GPS / 검색 / 지도

Place {id?,name,address,latitude,longitude,source,category?}로 통일한다. GPS는 버튼 클릭 후만 요청하며 메모리에서 사용한다. 검색은 350ms debounce, 키보드 combobox를 제공한다. 지도는 Kakao JS SDK를 필요한 순간에만 로드하고 중앙 핀/클릭 → 좌표 → 역지오코딩 → 확정한다. 실패 시 검색으로 계속할 수 있다. 위치를 사용자가 즐겨찾기로 명시 저장한 경우에만 DB에 저장한다.

## 4. 즐겨찾기 Schema

routeName(필수 1–30자), 출발/도착 place id/name/address/lat/lon, 순서/시각을 저장한다. 이동 단계는 저장하지 않는다. 기존 역 즐겨찾기는 삭제하지 않고 이름을 보존하며 좌표 재선택이 필요한 legacy 상태로 변환한다. 사용자별 접근과 삭제 cascade를 유지한다.

## 5. 외부 DTO 및 mapper

Kakao 장소/제휴 대중교통, KMA 단기예보, KASI 공휴일, KoreaExim 환율, NAVER 뉴스의 raw DTO와 내부 모델을 분리한다. Provider의 실제 공식 규격을 기준으로 mapper를 작성한다. KMA 발표 시각/격자, 환율 BigDecimal/100엔 단위, NAVER HTML 제거 및 시간대 변환을 mapper에서 처리한다. NAVER 데이터는 AI 모델에 전달하지 않는다.

**제약:** Kakao 대중교통은 사전 제휴 계약이 필요하다. 공개 자동차 API를 대중교통으로 대체하지 않는다. 제휴 미승인 시 원인과 조치 안내를 제공한다. 실 API 키가 없는 환경의 실시간 검증은 완료로 기록하지 않는다.

## 6. 문서

API_SETUP.md에 발급/승인/플랫폼 등록/서버 환경변수/공개 지도키/로컬 확인을 작성한다. EXTERNAL_APIS.md에 규격/단위/오류/쿼터/출처를 표로 작성한다. README와 설정/테스트 가이드를 업데이트한다.

## 7. Mobile wireframe

[어디로 가시나요?]
[출발 · 현재 위치 / 장소 검색 / 지도 선택]
[⇅ 바꾸기]
[도착 · 장소 검색 / 지도 선택]
[출발 시간 선택] [경로 찾기]
[추천 경로 1개 · 소요시간 / 환승 / 요금 / 단계]
[경로 저장 → 이름 지정 Sheet]
[자주 가는 경로 · 한 번 탭하여 최신 경로 조회]
지도/날짜/시간/오류 안내는 버튼으로 닫을 수 있는 Sheet로 제공한다.

## 8. Desktop wireframe

좌측 검색/즐겨찾기, 우측 경로 결과 및 지도 선택으로 공간을 활용한다. Dashboard에는 요약만 표시한다. 지도 Picker는 넓은 modal, 날짜/시간은 작은 선택 패널로 제공한다. 기능은 Mobile과 동일하다.

## 9. Picker

공통 날짜 달력과 시간 selector를 만들어 일정/이동에서 재사용한다. 한글 요일, 이전/다음 월, 오늘, 시간 없음, 명시적 선택/취소를 제공한다. 입력 keyboard/focus/ARIA와 작은 화면을 지원한다.

## 10. Motion

CSS opacity/짧은 translate/press scale로 page, sheet, 결과, swap에 절제된 반응을 제공한다. reduced-motion에서는 이동/scale을 제거한다. 무거운 animation dependency는 추가하지 않는다.

## 11. 테스트

Provider JSON fixture mapper, KMA 격자/발표시각, GPS/SEARCH/MAP 공통 입력, 가장 빠른 경로 1개, 필수 이름, 사용자 간 접근 거부, legacy 보존, 개인 일정/탈퇴/cleanup 회귀를 검증한다. Frontend 오류 분류/창/재시도/권한대안, combobox/picker 테스트와 Desktop/Mobile E2E, PostgreSQL migration, Docker build/up/health를 확인한다.

## 12. 오류 UX (추가 요청)

공통 오류창은 원인/해결 단계/재시도/닫기/요청번호 복사를 제공한다. 네트워크, 시간초과, 로그인 만료, 입력, 충돌, 공급자 키/승인, 호출 제한, 데이터 형식을 구분한다. 사용자에게 stack trace/raw provider message/secret을 보여주지 않는다. 오류창은 한 번에 하나만 표시하고 중복 오류를 합친다. 초기 guest refresh의 정상적인 401, 취소된 query는 안내하지 않는다. 실패 widget과 form은 독립적인 inline 오류/다시 열기 버튼도 유지한다. mutation 자동 재실행은 중복 저장 위험 때문에 하지 않는다.
