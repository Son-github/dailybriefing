# AIOps 구현 전 분석 — 2026-10-22

AWS 계정/리소스 조회·쓰기, Terraform plan/apply/destroy, 실제 OpenAI/SNS 호출을 하지 않습니다.

현재 Spring은 plain text `timestamp level requestId=... logger - message`를 출력합니다. RequestLogFilter는 MDC/응답 헤더 requestId를 관리합니다. Errors의 예기치 않은 오류만 ERROR이며 외부 API 실패는 ProviderHttp INFO/DataFetchLogAdvice WARN이므로 현재 ERROR 구독만으로 외부 API 장애를 잡을 수 없습니다. 원문/키/응답 본문을 기록하지 않는 원칙을 유지하면서 HTTP5xx ApiException에 고정 코드/상태/Exception명 ERROR 한 줄을 추가합니다. 전체 Stack Trace를 새로 기록하지 않습니다.

ECS 모듈의 awslogs가 backend 로그 그룹으로 전달하며 Execution Role과 Task Role은 이미 분리되어 있습니다. 이것은 코드 정의이고 실제 AWS 연결은 미검증입니다. 기존 eight modules/단일 Main State를 유지하고 선택적 aiops 모듈만 추가합니다. ECS cluster/service ARN과 log group ARN을 output으로 연결합니다. 기본 enable_aiops=false/AI_ENABLED=false입니다.

새 Lambda는 두 이벤트를 공통 Incident로 변환→허용 필드만 수집/마스킹→분류→DynamoDB 조건부 lease/TTL 중복 방지→원자적 UTC 일일 quota→Responses Structured Outputs→재검증/재마스킹→SNS 게시 순서입니다. SNS 실패 시 정제된 알림을 DynamoDB에 캐시해 재시도에서 GPT를 다시 호출하지 않습니다. SDK/키 조회는 runtime에만 lazy 생성하며 테스트는 외부 네트워크를 차단하고 Fake/Mock만 사용합니다.

원인 확정/계정 리소스 자동 조회·수정은 없습니다. 전체 이벤트/원문/비밀값을 처리 로그에 출력하지 않습니다. 정규식 마스킹은 완전한 DLP가 아니므로 원문 field allowlist/크기 제한/명시적 사용자 승인/비활성 기본값을 함께 사용합니다.
