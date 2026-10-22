> 2026-10-21: 이 문서는 과거 애플리케이션 readiness 기록입니다. 현재 인프라 구조/실행 절차는 [TERRAFORM_STRUCTURE](TERRAFORM_STRUCTURE.md), [DEPLOYMENT](DEPLOYMENT.md)를 우선하세요. AWS 실제 검증은 하지 않았습니다.

> 2026-10-20 업데이트: 실제 Terraform 준비 코드는 infra/에 추가했습니다. 현재 설계는 [ARCHITECTURE](ARCHITECTURE.md), 절차는 [AWS_SETUP](AWS_SETUP.md)를 기준으로 보세요. 아래 내용은 이전 readiness 기록이며 실제 AWS 배포/검증은 여전히 미실행입니다.

# AWS 전환 준비 점검

이 문서는 애플리케이션의 전환 가능성을 평가한다. AWS 리소스 생성/배포/Terraform은 수행하지 않았다.

| 질문                | 현재 근거                                    | AWS에서 확인할 설정                                                                 |
| ------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| React build → S3    | `frontend/dist` 정적 artifact                | S3 private bucket/OAC, SPA rewrite, cache invalidation                              |
| CloudFront frontend | API 주소가 상대 `/api/v1`                    | TLS/DNS, index fallback, assets immutable                                           |
| `/api/*` → ALB      | Nginx에서 동일 경로 proxy 검증               | CloudFront API cache off; Authorization/Cookie/X-XSRF-TOKEN/X-Request-ID forwarding |
| ECS Fargate 이미지  | Java21 multi-stage non-root Dockerfile       | ECR tag/digest, CPU/memory, platform architecture                                   |
| Public IP 없이 실행 | inbound는 8080만, AWS SDK/resource 의존 없음 | private subnet + ALB SG만 inbound                                                   |
| NAT 외부 API        | 환경별 RestClient endpoint + bounded timeout | NAT route/DNS/egress/요금/쿼터                                                      |
| RDS endpoint 교체   | DB_HOST/PORT/NAME/USERNAME/PASSWORD          | RDS SG/TLS parameter/backup/migrations                                              |
| ALB health          | `/actuator/health/readiness` DB 포함         | port8080, health grace, 200 matcher                                                 |
| secrets 주입        | env placeholders, fail-fast JWT 길이         | Secrets Manager/SSM → ECS env; rotate signing keys 운영 정책                        |
| 코드 변경 없이 전환 | 동일 image, prod profile + env               | `SPRING_PROFILES_ACTIVE=prod`, FRONTEND_URL=https://도메인, Secure cookie           |

Prod 기본은 Swagger 비활성, Secure refresh cookie 강제. CORS 허용 origin은 환경변수로 1개 제한. Backend `/actuator/metrics`는 공개하지 않는다. 인프라 layer에서 신뢰할 프록시를 한정하고 origin 직접 접근을 막는다.

현재 인증 access validator는 refresh family 유효성을 DB에서 조회하여 logout 즉시 무효화한다. 단순성과 즉시 revoke를 택했지만 요청마다 DB 조회 비용이 생긴다. 트래픽이 커지면 짧은 session cache + 명시적 revoke invalidation을 고려한다.

Refresh rotation 동시성은 같은 token row lock으로 보호한다. 여러 탭이 같은 refresh cookie로 동시에 요청하면 보수적으로 family를 폐기할 수 있다. 단일 탭 single-flight를 제공하며, 다중 탭 Web Locks/BroadcastChannel 조정은 다음 개선 단계다.

인증 rate limit는 단일 instance의 bounded map이다. 서버 provider 응답 cache는 사용하지 않는다. 현재 Redis/ElastiCache는 도입하지 않는다. 다중 ECS 환경에서는 API Gateway/WAF 등 입구의 rate limit 정책과 외부 API 호출 비용을 검토한다. 개인 데이터는 계속 PostgreSQL에 저장한다. 만료된 refresh row 정리, 이메일 인증/비밀번호 찾기, 보안 감사와 부하 테스트는 공개 운영 전 작업이다.

Calendar cleanup은 기본 매일03:00 Asia/Seoul이다. 여러 replica에서는 `CALENDAR_CLEANUP_ENABLED`를 한 작업 인스턴스에서만 true로 주입하거나 EventBridge 기반 단일 작업으로 분리한다. 현재 AWS 리소스는 생성하지 않는다. Bulk delete의 재실행은 idempotent지만 중복 실행 비용과 실패 모니터링은 운영 책임이다.

RDS 이전 시 FK ON DELETE CASCADE/index를 Flyway로 동일 적용하고 개인 데이터 탈퇴/보관 정책을 확인한다. 실제 DB의 삭제와 backup의 보존·만료 정책은 별개이므로 백업 접근과 보관기간도 운영 시 문서화해야 한다.
