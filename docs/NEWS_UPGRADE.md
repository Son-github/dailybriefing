# 뉴스 탐색 고도화 설계

기존 인증·일정·이동·날씨·환율·DB·Docker 구조를 유지하고 뉴스만 변경합니다.

## 현재 구현과 변경 지점

1. `NaverNewsClient.get`에서 display=50/start=1을 요청하며, `NewsService.get`이 여러 카테고리를 중복 제거·시간순으로 합쳐 최대50개를 반환합니다. 이 결합·재정렬을 제거합니다.
2. NAVER API HUB Client → 별도 raw DTO → Mapper → 내부 Article 흐름과 HTML text 정제·안전한 URL·ISO 시간 변환은 재사용합니다.
3. 기존 `NewsWidget`은 전체 articles를 렌더링하고 `NewsPage`는 카테고리·키워드 변경마다 새 조회합니다. 공통 5개 탭과 간결한 카드로 교체합니다.
4. Backend는 NewsCategory의 단일 검색어 매핑, 페이지 응답, 초기 sections, 명시적으로 제한된 병렬 executor와 부분 실패 응답을 추가합니다. 뉴스 기록이나 응답을 DB에 저장하지 않습니다.
5. Frontend는 공통 sections Query를 공유합니다. 탭 변경은 UI 상태만 변경합니다. 뉴스 페이지의 더 보기는 해당 카테고리만 start=6/display=10 이후 조회하며 TanStack Query에 유지합니다. 기존 목록은 로딩·오류 중에도 보존합니다.
6. API 호출은 최초 5개×display5, 탭 변경0회, 더 보기1회입니다. 최대 start1000/display100을 검증하며 검색어를 임의로 결합하거나 AI/자체 ranking을 사용하지 않습니다.
7. 기존 news preference 값(technology/business/general/world/sports)을 탭의 초기 선택으로 해석하되 DB 스키마와 기존 설정은 유지합니다. '전체'/키워드는 이번 카테고리 탐색 요청에 적용하지 않습니다.
8. 테스트는 카테고리 매핑/병렬 5개·순서/부분 실패/pagination/입력 검증·실제 HTTP fixture 전달, UI5개·탭무호출·더보기·오류·접근성·Desktop/Mobile을 추가합니다. 기존 핵심 회귀도 실행합니다.

## UI와 오류

Dashboard: 제목 → 가로 5탭 → 선택 카테고리5개(제목2줄/설명2줄) → 전체뉴스보기. 뉴스페이지: 같은 탭/첫5개 → 명시적 더보기. 이미지나 언론사를 생성하지 않습니다. 원문/제공링크를 유지하고 게시시간은 time 태그와 상대시간으로 표시합니다.

실패한 section에만 오류·재시도·문제해결 버튼을 제공합니다. 성공 section을 재요청하지 않고 실패 category만 다시 조회해 sections Query를 갱신합니다. 원인은 기존 공통 오류창과 요청번호로 안내합니다. 모션은 짧은 fade, reduced-motion에서는 제거합니다.

## Provider 확인

공식 뉴스 API: https://api.ncloud-docs.com/docs/naver-api-hub-search-news

공식 이용약관/브랜딩 확인 결과와 출처 적용은 `API_SETUP.md`에 기록합니다. key는 backend 전용이고 뉴스는 DB/Redis/Caffeine/AI에 저장·전달하지 않습니다.

## 보관과 종료

서버 응답은 Cache-Control:no-store이며 DB나 서버 cache에 저장하지 않습니다. 기기 Query 데이터는 미사용5분 후 제거하고 켜 둔 화면도24시간 후 만료·재조회합니다. 더 보기 데이터도 함께 지웁니다. 실제 NAVER 승인 호출은 별도 smoke이며 HUB 키 설정은 API_SETUP에 기록했습니다.
