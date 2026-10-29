# 문제 해결

화면의 오류 코드·요청 번호·발생 시각을 먼저 기록합니다. Backend 요청은 같은 requestId의 CloudWatch 로그로 확인합니다. 비밀번호·키·JWT·전체 응답을 공개 문서에 붙이지 않습니다.

## 데이터가 표시되지 않을 때

| 증상 | 확인 순서 |
| --- | --- |
| 샘플 표시 | 화면 모드와 runtime-config 확인. Backend DEMO와 Frontend STATIC_DEMO 구분 |
| PROVIDER_NOT_CONFIGURED | 필요한 키 누락 여부, 설정 변경 후 컨테이너 재생성 여부 |
| PROVIDER_AUTH / FORBIDDEN | 발급처·키 종류·상품 권한·사용 설정 확인 |
| PROVIDER_LIMIT | 공급자 쿼터 확인. 반복 재시도 중단 |
| timeout / NETWORK | 브라우저와 Backend 중 실패 지점, DNS·NAT·제한 시간 확인 |
| RECEIVED만 있고 완료 없음 | HTTP 수신 후 변환 오류 여부. data_fetch SUCCESS/PARTIAL/FAILED 확인 |

기상청은 공공데이터포털 Decoding 키를 사용합니다. NAVER는 API HUB 키와 HUB 주소를 사용하며 기존 Developers 검색 키와 혼용하지 않습니다. 자세한 설정은 [로컬/API 안내](SETUP.md)를 참고하세요.

## 지도

SDK는 브라우저에서 직접 내려받으므로 요청 번호가 없을 수 있습니다. Network의 sdk.js 응답과 Console의 CSP 오류를 확인합니다.

- 401/domain mismatched: JavaScript 키가 속한 앱의 SDK 허용 도메인에 실제 https://www.dailybriefing-son.site를 등록합니다. 카카오맵 사용 설정 ON과 키 종류도 확인합니다.
- sdk.js는 200인데 준비 중: 지도 엔진 CDN t1.kakaocdn.net이 script-src에 허용돼 있는지 확인합니다. 전체 스크립트 허용으로 우회하지 않습니다.
- MAP_SDK_BLOCKED: CSP 정책과 차단 주소 확인. MAP_SDK_TIMEOUT: 엔진 초기화와 네트워크 확인.
- 키를 바꿨다면 GitHub PUBLIC_KAKAO_MAP_KEY와 runtime-config를 갱신합니다. 도메인만 바꿨다면 페이지를 새로고침해 확인합니다.

## LIVE가 갑자기 샘플로 바뀔 때

API health와 공개 runtime-config의 mode를 따로 확인합니다. API가 정상이고 STATIC_DEMO라면 실행 설정 문제입니다. Terraform runtime 객체는 초기 생성 후 ignore_changes=all, 이후 내용·메타데이터는 Actions가 관리합니다. 예전에는 메타데이터 차이로 초기 샘플 내용이 다시 업로드됐습니다.

현재 Backend가 정상이라면 runtime-config workflow의 LIVE로 전환합니다. API smoke 후 설정만 갱신하므로 서버 재배포가 필요하지 않습니다. 브라우저에 남은 샘플 선택은 LIVE 다시 연결로 해제합니다.

## 로그아웃 403

변경 요청의 최신 CSRF 토큰과 Cookie/헤더 전달을 확인합니다. 이전에는 오래된 토큰을 메모리에 재사용하는 조건이 있었습니다. 현재는 변경 직전에 확인하고 동시에 시작한 조회만 공유합니다. Frontend 반영 후 새로고침하여 로그인 → 로그아웃 → 새로고침 → 재로그인을 확인합니다. CSRF 검사를 끄거나 실패를 성공으로 숨기지 않습니다.

## Terraform·배포

| 오류/증상 | 확인할 사항 |
| --- | --- |
| Duplicate resource / variable | 같은 폴더의 main 2.tf 같은 중복 파일. Terraform은 모든 .tf 파일을 읽음 |
| backend bucket 입력 요청 | infra/backend.hcl의 실제 버킷/key와 init -backend-config 설정 |
| ACM PENDING_VALIDATION / 10분 타임아웃 | 가비아 검증 CNAME의 호스트 중복·값·네임서버·전파. 인증서/State부터 삭제하지 않음 |
| EC2 endpoint no such host | 로컬 DNS·VPN·네트워크. 인증서 검증 실패와 별개 |
| workflow Skipped | Repository AWS_DEPLOY_ENABLED와 workflow branch/path 조건 |
| ECR 이미지 없음 | backend Environment·OIDC·ECR_URL, 이미지 업로드 job 실행 결과 |
| ECS 즉시 종료 / readiness 실패 | stoppedReason, DB/Secret/Flyway, 8080과 ALB→ECS SG |
| RDS 연결 오류 | private endpoint, ECS SG→5432, 관리 Secret, TLS CA/hostname. TLS를 끄지 않음 |
| waiter 성공인데 이전 코드 | circuit breaker rollback 및 실제 서비스 revision |
| Terraform 설정 변경이 서비스에 안 보임 | 최신 task template을 backend-deploy로 서비스에 반영했는지 |
| apply 부분 실패 | 기존 자원을 유지하고 base.tfplan을 새로 생성. State rm/전체 삭제로 우회하지 않음 |

중단·재개는 [전용 절차](INTERVIEW_OPERATIONS.md)를 따릅니다. 재개 후에는 새 ALB 주소로 api CNAME을 갱신하고 SNS를 재승인합니다. [AIOps의 429·알림 점검](AIOPS.md)도 확인하세요.
