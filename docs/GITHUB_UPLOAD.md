# 기존 GitHub 저장소 업로드와 Actions 배포

대상: https://github.com/Son-github/dailybriefing

이 폴더에 독립 Git 저장소를 만들고 기존 `origin/main` 이력을 연결했습니다. 작업 브랜치는 `codex/github-actions-ready`입니다. 커밋·push·원격 설정 변경·AWS 배포는 아직 실행하지 않았습니다. 홈 폴더의 별도 Git 저장소와 혼동하지 않도록 아래 절대 경로에서 시작하세요.

## 1. 올릴 내용 확인

```bash
cd /Users/jonginson/Desktop/new_dailybriefing
git rev-parse --show-toplevel
git remote -v
git branch --show-current
python3 scripts/scan-secrets.py
git status --short
```

첫 출력은 `/Users/jonginson/Desktop/new_dailybriefing`이어야 합니다. `.env`, 실제 `*.tfvars`, `backend.hcl`, State/plan, 개인 키, 캐시와 빌드 결과는 제외됩니다. 예제 파일, Terraform lock 파일, Gradle wrapper JAR와 공개 RDS CA 인증서는 포함합니다. 프런트엔드 Docker 빌드에서도 로컬 `.env*`를 제외합니다.

기존 원격은 여러 Spring 서비스와 이전 React/`terraform/` 구조이고, 현재 로컬은 단일 Spring 앱과 Vite/`infra/` 구조입니다. 이번 업로드에는 이전 서비스·설정·워크플로 삭제가 포함됩니다. 기존 `.idea`, `.vscode`, `frontend/.env.prodoction`, `terraform/dev/terraform.tfvars`도 새 버전에서 제거됩니다. 삭제 내용을 PR에서 확인하세요. 기존 AWS 리소스/State는 코드 교체만으로 이전되지 않습니다. 기존 인프라를 쓰고 있다면 [State 이전 검토](TERRAFORM_STRUCTURE.md)를 먼저 확인하고 새 Main을 바로 적용하지 마세요.

제외 규칙은 과거 Git 이력을 지우지 않습니다. 과거에 올라간 tfvars나 환경 파일에 실제 비밀번호/API 키가 있었다면 해당 키 교체가 필요합니다. 이번 검사는 현재 올릴 파일의 알려진 패턴과 로컬 `.env` 비밀값 대조이며, 과거 이력 전체의 안전성을 보증하지 않습니다.

## 2. GitHub 로그인

이미 인증되어 있으면 생략합니다. GitHub CLI를 사용하는 경우:

```bash
gh auth login
gh auth setup-git
```

`gh`가 없으면 먼저 설치하거나 Git credential manager/SSH 인증을 사용합니다. 토큰을 remote URL이나 파일에 적지 마세요.

## 3. 커밋하고 작업 브랜치 업로드

```bash
git add -A
python3 scripts/scan-secrets.py --staged
git diff --cached --stat
git diff --cached --name-status
git diff --cached --check
git commit -m "Prepare daily briefing app and AWS Actions deployment"
git push -u origin codex/github-actions-ready
```

사용자 이름/메일 설정이 없다면 `git config user.name "이름"`, `git config user.email "GitHub에 등록한 메일 또는 noreply 메일"`로 이 저장소에 설정한 뒤 커밋합니다.

`git add -A`는 이전 파일 삭제도 반영합니다. 비밀값 검사가 실패하면 해당 파일을 먼저 정리하고 다시 add/검사하세요. `--force`와 `--allow-unrelated-histories`는 필요 없습니다. 기존 main 이력이 이미 연결되어 있습니다.

## 4. PR과 CI 확인

push 출력의 PR 링크를 열거나 다음 명령을 실행합니다.

```bash
gh pr create --base main --head codex/github-actions-ready \
  --title "Prepare daily briefing app and AWS deployment" \
  --body "Replace the legacy app with the current local project; add upload safety checks and AWS deployment configuration."
```

PR의 Files changed에서 이전 구조 삭제와 현재 구조 추가를 확인합니다. Actions의 `verify`, `terraform-check`가 성공한 뒤 main에 병합하세요. 저장소에 기존 branch protection 규칙이 있으면 새 검사 이름에 맞춥니다. `verify`는 프런트 lint/typecheck/test/build, 백엔드 단위·DB 통합 테스트, Docker/Playwright, AIOps 검사를 수행합니다. Terraform 검사는 AWS 자격증명 없이 fmt/init/validate만 수행합니다.

배포는 `main`에서만 가능하며 `AWS_DEPLOY_ENABLED=true`일 때 활성화됩니다. 처음에는 Settings → Secrets and variables → Actions → Variables에서 이 값을 `false`로 설정해 두세요. 변수의 값은 따옴표 없이 입력합니다.

## 5. AWS 인프라와 OIDC 준비

Actions는 앱을 기존 인프라에 배포합니다. 인프라 최초 생성은 [AWS_SETUP](AWS_SETUP.md), [DEPLOYMENT](DEPLOYMENT.md)의 순서로 수행합니다. 현재 AWS가 준비됐다고 가정하지 않습니다.

1. 계정/SSO와 Terraform State 저장소 Bootstrap 준비.
2. 실제 `infra/terraform.tfvars`의 `github_repository_subject`를 `repo:Son-github/dailybriefing`으로 설정. 예제만 수정해도 실제 tfvars에는 자동 반영되지 않습니다.
3. GitHub OIDC provider를 새로 생성하거나 기존 provider ARN 재사용.
4. Main 1차: `enable_backend=false`로 S3/CloudFront/ECR/GitHub 배포 역할 생성. Terraform이 `STATIC_DEMO` runtime 설정을 업로드합니다.
5. LIVE가 필요하면 서버 비밀값 7개를 SSM SecureString/Secrets Manager에 등록하고 ARN만 tfvars에 입력. 최초 백엔드 이미지를 수동 ECR push하고 digest를 기록.
6. Main 2차: API 도메인/인증서와 `enable_backend=true`, 이미지 digest를 설정해 ECS/RDS/ALB 생성.

LIVE는 HTTPS API 도메인과 서울 ACM 인증서가 필요합니다. 도메인 없이 CloudFront 기본 주소의 정적 DEMO까지만 먼저 배포할 수 있습니다. AWS 리소스 생성 시 비용이 발생합니다. 선택적 AIOps Lambda는 이 두 앱 배포 workflow의 대상이 아니며 [별도 절차](AIOPS_AWS_DEPLOYMENT.md)를 따릅니다.

GitHub Settings → Environments에서 `frontend`, `backend`를 만들고 배포 브랜치를 `main`으로 제한합니다. 요금제에서 지원하면 Required reviewers도 설정할 수 있습니다. OIDC는 각각 `repo:Son-github/dailybriefing:environment:frontend`, `repo:Son-github/dailybriefing:environment:backend`를 신뢰합니다. AWS Access Key/Secret Key를 GitHub에 등록하지 않습니다.

## 6. GitHub Variables 등록

Settings → Secrets and variables → Actions → Variables → New repository variable에 입력합니다. Environment variable을 쓰면 해당 environment에 각각 입력해야 하며, 같은 이름의 오래된 environment 값이 repository 값을 덮어쓰지 않도록 확인하세요.

| 변수 | 값 출처 | 사용 배포 |
|---|---|---|
| `AWS_DEPLOY_ENABLED` | 준비 중 `false`, 배포 준비 완료 후 `true` | 공통 |
| `AWS_ACCOUNT_ID` | 대상 AWS 계정 ID | 공통 |
| `FRONTEND_BUCKET` | `terraform -chdir=infra output -raw frontend_bucket` | 공통 |
| `CF_DISTRIBUTION_ID` | `terraform -chdir=infra output -raw cloudfront_id` | 공통 |
| `FRONTEND_URL` | `terraform -chdir=infra output -raw frontend_url` | 공통 |
| `FRONTEND_ROLE_ARN` | `terraform -chdir=infra output -json github_roles`의 frontend | frontend |
| `BACKEND_ROLE_ARN` | 같은 출력의 backend | backend |
| `ECR_URL` | `terraform -chdir=infra output -raw ecr_url` | backend |
| `ECS_CLUSTER` | `terraform -chdir=infra output -raw cluster_name` | backend |
| `ECS_SERVICE` | `terraform -chdir=infra output -raw service_name` | backend |
| `TASK_FAMILY` | ECS Task definitions의 family, 기본 `dailybriefing-live` (project 변경 시 함께 변경) | backend |
| `PUBLIC_KAKAO_MAP_KEY` | Kakao **JavaScript 공개 키**, 지도 사용 시 SDK 도메인 등록 | backend/LIVE runtime |

리전은 workflow에서 `ap-northeast-2`로 지정합니다. JWT·서버 REST API 키·DB 비밀번호를 Variables나 `VITE_*`에 넣지 마세요. 서버 비밀값은 AWS Secret Store에서 ECS에 주입됩니다.

## 7. Actions로 배포

main 병합과 CI 성공, AWS 인프라/Variables 준비를 확인한 후 `AWS_DEPLOY_ENABLED=true`로 바꿉니다.

1. GitHub → Actions → `frontend-deploy` → Run workflow → branch `main`. 정적 사이트를 먼저 배포합니다.
2. 프런트 주소에서 정적 DEMO를 확인합니다.
3. ECS/RDS/ALB와 실제 API가 준비됐으면 `backend-deploy` → Run workflow → branch `main`. 이미지 빌드/ECR push/ECS revision 교체/API smoke 성공 후 runtime을 LIVE로 전환합니다.
4. Actions가 녹색인지 확인한 뒤 실제 주소에서 로그인·데이터 조회를 확인합니다.

CLI로 실행한다면:

```bash
gh workflow run frontend-deploy.yml --repo Son-github/dailybriefing --ref main
gh run list --repo Son-github/dailybriefing --workflow frontend-deploy.yml --limit 5
# 프런트 배포 성공 및 LIVE 인프라 준비 확인 후 실행
gh workflow run backend-deploy.yml --repo Son-github/dailybriefing --ref main
gh run list --repo Son-github/dailybriefing --workflow backend-deploy.yml --limit 5
```

이후 프런트는 main에 `frontend/**` 또는 해당 배포 workflow 변경이 push되면 자동 배포됩니다. 백엔드는 수동 실행입니다. 배포 workflow는 자체 검사를 수행하지만 전체 `verify` 완료를 자동으로 기다리지는 않으므로 main 보호 규칙에서 CI 성공 후 병합하도록 설정하세요. 두 배포는 같은 concurrency 그룹으로 직렬 실행합니다. `Skipped`면 main 선택과 `AWS_DEPLOY_ENABLED` 값을, OIDC 실패면 실제 tfvars의 저장소 subject/역할 ARN/Environment 이름을 확인합니다.

## 참고

- [GitHub: 기존 로컬 코드 업로드](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [GitHub: AWS OIDC 연결](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
