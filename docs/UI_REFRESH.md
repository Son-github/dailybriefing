# 코드 정리와 Consumer UI 개선

2026-10-20 기준. 기존 React/Spring/DB·인증·위젯 편집·위치/경로·일정·뉴스 API 구조는 유지합니다.

## 제거한 항목

- ExplorePage / explore route import 및 전용 스타일. 앱의 fallback route가 과거 /explore 주소를 홈으로 보냅니다.
- 중복된 뉴스 바로가기: 뉴스 위젯 하단의 전체 뉴스 보기 하나로 통일합니다.
- 현재 읽지 않는 예전 Provider 환경변수12개. 대기질 변수도 제거했습니다. 현재 사용하는 키와 DB·JWT 설정은 변경하지 않았습니다.
- 사용하지 않는 뉴스 image/sentiment 응답 필드와 Sentiment record. 공급자가 제공하지 않는 이미지나 AI 데이터를 생성하지 않습니다.
- 실제 뉴스 검색에 반영되지 않던 키워드 입력 UI와 전체 카테고리 선택. 현재5개 분야 중 먼저 볼 분야를 선택합니다.
- 오래된 이동 라벨·Explore CSS 및 환율 전용 홀수배치 예외.
- IDE 생성물 backend/bin. `.gitignore`에 추가해 소스와 혼동하지 않게 합니다. 이 폴더는 IDE 설정에 따라 다시 생성될 수 있습니다.

대기질 런타임 client/widget/API는 이번 작업 전 이미 제거된 상태였으며 재검색으로 확인했습니다. 사용 중인 공통 컴포넌트나 라이브러리를 이름만 보고 삭제하지 않았습니다. 현재 Frontend에서 선언한 패키지는 라우팅·query·상태·접근성 Dialog·DnD·아이콘·Tailwind·검증에 사용합니다.

## 보존한 이력과 호환성

Flyway V1–V8은 이미 적용된 DB 이력이라 변경하거나 삭제하지 않습니다. V7의 air-quality 문구는 과거 위젯 데이터를 삭제하기 위한 마이그레이션이며 서비스 기능이 아닙니다. 업그레이드 테스트의 과거 대기질 fixture도 이를 검증하므로 유지합니다.

이전 사용자 profile의 categories/keywords API·DB 값은 호환성과 기존 데이터 보존을 위해 유지합니다. keywords는 더 이상 입력 UI에 노출하거나 뉴스 검색에 전달하지 않습니다. 예전 all preference는 IT 기본탭으로 해석하며 저장 화면에서는 실제5개 분야를 선택합니다. 기록용 과거 설계/검증 문서는 현재 코드나 메뉴가 아니며, 현재 제품 기준은 DESIGN과 본 문서입니다.

## UI 기준

참고한 공식 서비스: [Toss](https://toss.im/), [컬리](https://www.kurly.com/main), [Apple](https://www.apple.com/kr/). 브랜드·화면을 복제하지 않고 단순한 정보 우선순위, 공통 콘텐츠 폭, 여백과 직접 탐색을 적용했습니다.

- Desktop/Mobile 모두 홈·이동·일정·뉴스·마이. 중간 탐색 페이지 없이 주요 작업으로 이동합니다.
- Header의 중앙 메뉴와 공통1184px 바깥 폭/32px 내부 여백. 모바일은14–20px 여백과5개 하단 메뉴, safe area를 사용합니다.
- 카드24px radius/28px padding/24px gutter를 기본으로 하며 모바일22px/22px/16px로 조정합니다.
- 같은 행 카드 높이와 제목 기준선을 맞추고 하단 데이터 출처를 정렬합니다.
- dashboardSpans는 저장된 순서를 바꾸지 않습니다. 넓은 카드 앞이나 마지막에 홀수 카드가 남으면 그 카드가 전체 너비를 사용합니다. 사용자 위젯 추가/삭제/재정렬에도 빈 열을 남기지 않습니다.
- 뉴스는 Desktop에서 첫 기사+2열, Mobile1열. 제공 순서를 유지하며 숫자·제목을 우선합니다. 뉴스 전용 페이지는 읽기 좋은 최대 폭을 유지합니다.
- 다크모드: 배경 #0b1220, 카드 #111d32, 보조표면 #17263e, 라인 #293c58. 텍스트 #eef3fc, 보조 #a9bad3, 포인트 #a3c4ff. 버튼은 별도 on-accent 토큰으로 대비를 유지합니다.
- 메뉴·Sheet·날짜 Picker·입력·오류창도 같은 토큰을 사용합니다. 날씨의 태양과 오류 색은 의미를 구분할 수 있게 유지합니다.
- 키보드 focus,44px 터치 영역과 reduced-motion 지원은 유지합니다.

## 검증

Frontend lint/typecheck/build/unit, Backend unit/PostgreSQL integration, Docker image/compose와 기존 사용자 흐름을 검증합니다. 신규 layout 테스트는 직접 메뉴, 네이비 색상/버튼 대비, 같은 행 높이,320px overflow와 제거된 경로 fallback을 확인합니다. 이미지 캡처는 reduced-motion으로 전환 애니메이션 중간색이 아닌 최종 테마를 기록합니다.
