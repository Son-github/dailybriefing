# AWS 통합 작업 보고서 — 2026-10-21

## A. 전체 요약

AWS 리소스/계정 접근/원격 배포를 하지 않았습니다. Terraform Main은 `vpc`, `frontend`, `ecr`, `iam`, `alb`, `ecs`, `rds`, `nat` 8개 Child Module을 직접 연결합니다. 이전 foundation/application/network 묶음은 제거했습니다. Bootstrap만 별도 State이고 Main 전체 생성/삭제는 사용자가 수행합니다. 앱 비즈니스 소스/실제 .env/기존 DB는 이번 구조 변경에서 수정하지 않았습니다.

## B. Terraform 최종 구조

```text
infra/
├── main.tf / variables.tf / outputs.tf / providers.tf / versions.tf / backend.tf
├── moved.tf / backend.hcl.example / terraform.tfvars.example / .terraform.lock.hcl
├── bootstrap/
│   └── main.tf / variables.tf / outputs.tf / providers.tf / versions.tf 및 backend·변수 예제/lock
└── modules/
    ├── vpc/
    ├── frontend/
    ├── ecr/
    ├── iam/
    ├── alb/
    ├── ecs/
    ├── rds/
    └── nat/
```

각 Child는 main.tf/variables.tf/outputs.tf/versions.tf를 가지며 실제 리소스를 소유합니다. [파일별 역할과 모듈 의존성](TERRAFORM_STRUCTURE.md).

## C. 정의한 자원 (실제 생성 아님)

Bootstrap의 State S3는 유지합니다. Main의 8개 모듈은 VPC/6 subnet/IGW/route/SG, private frontend S3/OAC/CloudFront/SPA/runtime, ECR, OIDC·배포 역할·권한 경계, ALB/TG/HTTPS/DNS/3개 alarm, ECS Fargate/Task·Execution Role/backend log/2개 alarm, RDS PostgreSQL17/DB subnet/managed secret/RDS log/2개 alarm, NAT/EIP/App routes를 소유합니다. SNS/ACM/Hosted Zone/API Secret/AI/Redis는 자동 추가하지 않습니다.

## D. LOCAL과 AWS 코드

| 항목 | LOCAL | AWS |
|---|---|---|
| Frontend | Vite/nginx | 같은 dist/S3/CF |
| Backend | Gradle/Compose | 같은 image/ECS prod |
| Database | Docker PG17 | RDS PG17/TLS |
| Environment | root .env/local | Main env/prod/runtime |
| Secret | Git 제외 .env | 사용자 SSM/SM ARN + RDS 관리형 DB Secret |
| Logging | 콘솔/Compose | 같은 콘솔/awslogs |
| 실행 방법 | docker compose up -d --build | 수동 CLI 인프라 + 앱 deploy |

## E. 기존 파일 수정

- infra/main.tf: 8개 모듈 직접 호출/서비스별 입력·출력 연결.
- infra/outputs.tf: 새 module.ecr/ecs/alb/rds 등의 공개 출력으로 연결.
- 기존 foundation/application/network: 서비스별 실제 리소스를 이동하고 디렉터리 제거.
- scripts/check-infra.py: 정확히 8개 모듈/공통 파일/호출/보안/CI 인프라 변경 금지를 검사.
- scripts/test-spa-router.mjs: frontend 모듈의 function 경로 사용.
- README/구조·배포·변수 문서: 같은 8개 모듈 구조로 맞춤.

## F. 추가 파일

modules/{vpc,frontend,ecr,iam,alb,ecs,rds,nat}/{main,variables,outputs,versions}.tf, frontend/spa-router.js. moved.tf는 이전 단일 Main 주소를 호환하기 위한 선언입니다. 실제 State 명령/이동은 실행하지 않았습니다. 기존 provider lock과 Bootstrap, 앱 배포 Workflow를 재사용합니다.

## G. 사용자 직접 설정

계정/AZ/고유 bucket/OIDC/실제 DNS·ACM/API Secret ARN/공개 SDK key/이미지 digest/삭제 정책/GitHub Environment 보호와 Variables. [모든 변수와 발급처](ENVIRONMENT_VARIABLES.md), [체크리스트](MY_AWS_CHECKLIST.md) 참고. VPC/ALB/ECS/RDS/S3/ECR 등 Terraform 관리 자원을 Console에서 중복 생성하지 않습니다.

## H. 로컬 실행

기존 `.env` 유지 후 `docker compose up -d --build`, http://localhost:5173. IDE 방식은 [LOCAL_VS_AWS](LOCAL_VS_AWS.md). 이번 브라우저 검증은 기존 DB 보호를 위해 별도 Compose project/5174에서 실행했습니다. 기존 project가 작업 시작 시 실행 중이지 않아 임의로 복원/기동하지 않았습니다.

## I. AWS 배포 (명령은 문서화만, 미실행)

Bootstrap init→plan→사용자 apply→remote State 이전→Main1차 false→ECR push/digest→Main2차 true→Frontend 앱 배포→API smoke→runtime LIVE. [AWS_SETUP](AWS_SETUP.md)/[DEPLOYMENT](DEPLOYMENT.md)에 실제 사용자 명령과 완료 기준이 있습니다. GitHub Actions에서 인프라를 생성하지 않습니다.

## J. AWS 삭제 (미실행)

사용자 로그/데이터 보존→앱 배포 비활성화→DB 보호 해제 정책 일반 plan/apply→S3/ECR 전체 내용 검토/정리→Main destroy plan 검토→사용자 수동 적용→잔여 자원/비용 확인. Bootstrap은 유지, Frontend도 삭제됩니다. 고정 요금/무료 보장은 없습니다.

## K. 테스트 결과

성공: Frontend lint/type/build/Vitest36, Backend33+PG10, 브라우저32, Docker build/3서비스 health, standalone static DEMO, Main/Bootstrap validate/fmt, script5/안전장치/Secret/actionlint/SPA.
미실행: AWS 계정/plan/apply/destroy/배포/실제 DNS·TLS·IAM·ECS·RDS·NAT·Secret·비용. 별도 Checkov/tfsec/IAM 감사도 미실행. [상세 검증 기록](INFRA_VERIFICATION.md).

## L. 남은 일

사용자 계정/도메인/인증서/Secret/OIDC/승인 설정, 실제 초기 배포·삭제·재배포, AWS IAM 권한/quotas/이미지pull/DBTLS/모바일Cookie·GPS·Kakao 도메인 검증, snapshot 복구/rotation 후 재배포, 잔여 요금 확인입니다. 로컬 validate를 실제 AWS 배포 성공으로 해석하지 않습니다.

## 8개 모듈 재정리 검증 범위

이번 후속 작업은 Terraform/문서/경로 검사만 변경했습니다. fmt, AWS credential/remote backend를 차단한 init·validate, 모듈 구조/Secret/SPA/actionlint/배포 script 검사를 재실행했습니다. 앱 전체 테스트36/43/32는 직전 통합 작업의 결과이며 이번 폴더 재정리에서 다시 실행했다고 주장하지 않습니다. AWS 실제 plan/apply/destroy는 여전히 미실행입니다.
