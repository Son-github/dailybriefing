# Daily Briefing 검증 기록

> 과거 설계/검증 기록입니다. 2026-10-20 카카오맵 REST publictraffic으로 전환했으며 출발 시각 지정/모빌리티 제휴 플래그를 제거했습니다. 현재 설정은 [API_SETUP.md](API_SETUP.md)를 따르세요.

검증일: **2026-10-06 (Asia/Seoul)**. 현재 장소 기반 이동·오류 안내 구현을 대상으로 실제 실행했습니다. 이전 역 기반 구현과 교체된 Provider의 과거 테스트 결과는 현재 LIVE 검증에 포함하지 않습니다.

## 실행 결과

| 영역                                                         | 실제 결과                                    |
| ------------------------------------------------------------ | -------------------------------------------- |
| Frontend lint / TypeScript typecheck / Vite production build | 모두 통과                                    |
| Vitest                                                       | **16개 통과**                                |
| Backend Java21 compile / JUnit                               | **12개 통과**, 실패·skip 없음                |
| PostgreSQL Testcontainers integration                        | **10개 통과**, 실패·skip 없음                |
| Desktop / Mobile Playwright                                  | **16개 통과**, 각 8개                        |
| Docker frontend / backend image build                        | 통과                                         |
| Docker Compose 실행                                          | Frontend / Backend / PostgreSQL 모두 healthy |
| HTTP `/actuator/health`                                      | UP, liveness / readiness 제공                |
| 기존 Compose PostgreSQL Flyway                               | **V1–V8 모두 success=true**                  |

Backend 최종 명령은 `./backend/gradlew -p backend clean test integrationTest --console=plain`입니다. 중복된 클래스 빌드 산출물로 최초 검증이 실패하여 생성물만 clean한 뒤 전체 테스트를 다시 실행했습니다. 최종 실행은 성공했습니다. 기존 개발 DB와 volume은 유지했습니다.

보고서는 `backend/build/reports/tests`와 `frontend/playwright-report`에 생성됩니다. GitHub Actions workflow의 원격 실행은 이번 결과에 포함하지 않습니다.

## 검증한 동작

- 회원가입 / 로그인 / me / refresh rotation·replay / 로그아웃 / 비밀번호 변경 / CSRF / 권한 없는 접근.
- 대시보드 위젯 추가·삭제·순서·저장·version 충돌, Guest 설정 유지, 키보드 Drag & Drop.
- GPS / 검색 / 지도 선택이 같은 Place 모델로 경로를 요청하는 흐름, 좌표 기준 검색, 출발·도착 Swap.
- Kakao 공식 형식 fixture의 초→분, 경로 단계·누적시각 변환, 가장 빠른 도착 후보 **1개** 선택.
- 필수 경로 이름·공백 거부·중복·순서·수정·삭제, 재로그인 유지, 타 사용자 favorite 수정·삭제 거부.
- 지도 선택 후 다음 입력의 포커스 유지, Date / Time Picker, Sheet Escape와 포커스 복원.
- 일정 CRUD / 날짜 범위 / 가까운 미래 3개 / 서울 날짜 기준 2년 경계 bulk cleanup.
- 계정 A/B 일정·경로 격리, 탈퇴 후 모든 개인 테이블 row 0, 기존 token 무효, 같은 이메일 재가입.
- 뉴스 최대 50개, 날씨, 외부 API 권한 오류와 timeout, 6개 Provider Mapper의 규격 기반 synthetic JSON fixtures.
- 로그인 실패 시 입력 유지와 오류 안내, 위젯 실패 시 원인·해결 단계·요청 번호·재시도 및 다른 위젯 정상 표시.
- Desktop / Mobile 가입→온보딩→경로 저장→일정 수정→reload·재로그인→탈퇴.
- 320px 화면의 가로 overflow 없음, Light / Dark 설정 유지, token localStorage 저장 없음.

## 데이터베이스 변경

V7은 대기질 위젯만 제거하고 순서를 정리합니다. V8은 기존 즐겨찾기 이름을 유지하면서 장소 좌표 필드를 추가합니다. 기존 역 정보로 좌표를 추정하지 않으며, 좌표 없는 과거 즐겨찾기는 UI에서 장소 재선택을 안내합니다.

별도 PostgreSQL Testcontainers에서 **V6 데이터 생성→V8 업그레이드**를 검증했습니다. 새 PostgreSQL 컨테이너의 스키마 생성과 사용자별 FK / 제약도 통합 테스트에서 확인했습니다. 이번 변경에서 기존 Compose volume을 삭제해 초기화하지 않았습니다. 새 Compose 실행 재현 방법은 [TESTING](TESTING.md)을 참고하세요.

## 실제 외부 API와 실기기 검증 범위

- 기본 **DATA_MODE=DEMO**: 사용자 데이터는 실제 PostgreSQL에 저장하고 외부정보는 샘플 출처를 표시합니다.
- KMA / KASI / 한국수출입은행 / NAVER / Kakao는 실제 승인 키로 LIVE 성공 호출을 검증하지 않았습니다. fixture 통과는 공급자 인증·계약·공표 데이터 검증을 의미하지 않습니다.
- Kakao 대중교통은 제휴 계약·승인이 필요합니다. 공식 응답에 요금이 없으므로 LIVE 요금을 추정하지 않습니다.
- 지도 E2E는 SDK mock입니다. 실제 Kakao 지도 키·도메인 등록·네트워크 성공은 별도로 확인해야 합니다.
- 브라우저 GPS permission 허용·거부는 자동화로 검증했습니다. 실제 iOS Safari / Android / VoiceOver 및 HTTPS 실기기 검증은 별도입니다.
- KMA는 단기예보이며 관측·체감온도가 아닙니다. 최고·최저와 환율 이전 값은 공급자 미제공 시 값 없음으로 표시합니다.
- NAVER 뉴스는 AI 입력이나 학습용으로 연결하지 않습니다.
- AWS / Terraform / AI service는 구축하지 않았습니다. 운영 multi-tab refresh, 이메일 인증·비밀번호 재설정, 세션 정리와 분산 rate limit은 후속 과제입니다.

실제 화면은 `docs/assets/error-guide-desktop.png`, `error-guide-mobile.png` 및 갱신된 dashboard / transit / calendar 스크린샷에 기록했습니다. API 준비 절차는 [API_SETUP](API_SETUP.md), 후속 테스트는 [TESTING](TESTING.md)에 정리했습니다.

## 뉴스 고도화 최종 검증 (2026-10-06)

이번 뉴스 변경의 최신 결과입니다. 위의 이동·오류 변경 시점보다 이 표가 우선합니다.

| 항목                                              | 결과                                         |
| ------------------------------------------------- | -------------------------------------------- |
| Frontend lint / typecheck / production build      | 통과                                         |
| Vitest                                            | **21개 통과**                                |
| Backend unit / client / mapper                    | **18개 통과**, 실패·skip 없음                |
| PostgreSQL integration                            | **10개 통과**, 실패·skip 없음                |
| 전체 Desktop / Mobile E2E                         | **20개 통과** (각10개)                       |
| 최종 화면 높이·캡처 확인을 추가한 뉴스 E2E 재실행 | **4개 통과**                                 |
| Docker image build / compose up                   | Frontend / Backend / PostgreSQL 모두 healthy |

초기5카테고리×5개, 선택분야5개 표시, 탭 전환 추가요청0, 더보기 start6/display10, 분야복귀 페이지유지, 한분야실패의 다른분야유지 및 실패분야만 재조회, 기존목록 유지, 키보드탭, empty/skeleton, reduced-motion, mobile overflow와 카테고리 복귀 후 목록 높이를 확인했습니다. 로컬 HTTP fixture에서 검색어 단일 인코딩과 두 인증 header, 원본순서 보존을 확인했습니다. 정상 DB 변경 없이 기존 사용자/일정/이동/대시보드/탈퇴 회귀도 통과했습니다.

처음에는 Docker daemon이 꺼져 통합 검증을 실행하지 못했습니다. 설치된 Docker Desktop을 시작한 뒤 PostgreSQL 통합과 Compose/E2E를 모두 재실행하여 통과했습니다. 기존 DB volume은 삭제하지 않았습니다.

실제 NAVER 승인 키의 LIVE 성공은 검증하지 않았습니다. 뉴스는 DB/서버 cache에 저장하지 않으며, AI나 자체 ranking을 사용하지 않습니다. NAVER 공식 약관·BI·기존 Search API 제공기간 확인은 [API_SETUP](API_SETUP.md)에 기록했습니다. 새 이미지: `docs/assets/news-desktop.png`, `news-mobile.png`.

## 데이터 수신 로그와 환경변수 정리 (2026-10-20)

- Frontend lint/typecheck/production build 통과, Vitest **23개 통과**.
- Backend JUnit **21개**, PostgreSQL integration **10개** 통과. skip/실패 없음.
- Desktop/Mobile E2E **22개 통과**. 신규 검증은 실제 응답의 X-Data-Mode/Result/Request-ID와 Console의 샘플·수신완료 표시를 확인합니다.
- Docker 이미지 build 및 compose up/3개 healthy 확인. Backend 실제 로그에서 weather items1/exchange items3/news 각 category items5와 DEMO/SAMPLE/SUCCESS를 확인했습니다.
- 로그 테스트는 HTTP 수신과 정제 완료 구분, 빈결과, 일부 실패, 설정 누락, query/비밀값·본문 제외를 검증합니다. 실제 LIVE 공급자 호출은 이번 검증에 포함하지 않았습니다.
- 실제 `.env`의 기존 값은 보존했습니다. 템플릿에만 있던14개를 빈키/기본값으로 추가하고 입력 설명을 주석으로 넣었습니다. 예전 변수12개는 삭제하거나 다른 공급자 키로 자동 이전하지 않았습니다. 두 파일의 중복 변수 이름은 없습니다.
- `.env`는 Git 제외 상태이며 실제 값은 검증 로그나 문서에 기록하지 않았습니다. 상세 안내: [ENV_LOCAL_GUIDE](ENV_LOCAL_GUIDE.md).

## 코드 정리·네이비 UI 최종 검증 (2026-10-20)

- Frontend lint / typecheck / production build 성공. Vitest **24개 통과**.
- Backend `clean test integrationTest`: unit/client **21개**, PostgreSQL **10개** 통과. 미사용 중첩 클래스의 오래된 중복 빌드 산출물도 clean으로 제거했습니다.
- Desktop/Mobile Playwright **24개 통과**. 직접5메뉴·제거된 Explore 진입 fallback·네이비 토큰/버튼 배경·카드의 같은 행 높이·320px overflow와 기존 가입/위젯편집/경로/일정/뉴스/로그아웃·탈퇴 흐름을 확인했습니다.
- Docker backend/frontend 이미지 build 및 최종 compose up의3개 서비스 healthy.
- 현재 frontend/src·backend/src/main/java·.env.example에서 대기질/Explore/미사용 sentiment 참조 없음. `.env`와 템플릿의 변수 이름 차이 없음. 기존 키 값은 출력하지 않았습니다.
- Flyway 파일과 기존 DB volume은 수정/삭제하지 않았습니다. 이전 profile keywords의 저장값은 호환성 목적으로 유지하되 현재 검색·입력 UI에는 사용하지 않습니다.
- 최종 라이트 화면은 dashboard-desktop/mobile.png, 네이비 화면은 dashboard-navy-desktop/mobile.png와 news-navy-desktop/mobile.png에 기록했습니다. 네이비 캡처는 reduced-motion을 적용해 전환 중간색을 제외했습니다.

변경 근거·삭제 범위: [UI_REFRESH](UI_REFRESH.md). 외부 API 실제 키 LIVE 검증 범위는 이전과 동일합니다.

## 기상청 261019 가이드 대조 (2026-10-20)

첨부 가이드의 단기예보 명세/격자/발표시각/자료코드/Missing 기준을 코드와 대조했습니다. 단기예보 API와 서비스 키 발급 체계를 구분한 결과는 [KMA_GUIDE_REVIEW](KMA_GUIDE_REVIEW.md)에 기록했습니다.

- 수정 전 가짜 key의 실제 요청에서 `%2B`가 `%252B`로 중복 인코딩되는 실패를 재현했습니다.
- 수정 후 URI overload를 이용해 `%2B/%2F/%3D`가 정확히1번 인코딩됨을 로컬 HTTP 서버에서 검증했습니다.
- Backend unit/client/mapper **24개**, PostgreSQL integration **10개** 통과.
- Frontend lint/typecheck/build 및 Vitest **25개** 통과.
- Docker backend/frontend 이미지 build 및 compose up/3개 healthy.
- `.env`의 실제 key 값은 변경하거나 출력하지 않았습니다. 검토 당시 URL 인코딩 패턴이 확인되어 Decoding 키로 교체하도록 안내했습니다. DATA_MODE=DEMO 유지. 실제 승인 키의 외부 LIVE 인증 성공은 검증하지 않았습니다.
- 변경 후 Desktop/Mobile 전체 E2E **24개 통과**. 기존 위젯/오류/이동/일정/회원 기능 회귀도 확인했습니다.
