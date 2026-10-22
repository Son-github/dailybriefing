# 유료 API 없이 AIOps 로컬 검증

기본 pytest는 socket 연결을 차단하고 OpenAI/SNS/DynamoDB를 Fake/Mock으로 대체합니다. API Key/AWS 계정이 필요 없습니다. 운영 DB나 실제 오류를 유발하지 않습니다.

## Python3.13 환경

```bash
python3.13 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r lambda/aiops/requirements.txt
.venv/bin/python -m pip install -r lambda/aiops/requirements-dev.txt
.venv/bin/python -m ruff check lambda/aiops
.venv/bin/python -m ruff format --check lambda/aiops
.venv/bin/python -m pytest lambda/aiops
```

운영 의존성은 requirements.in의 직접 버전과 requirements.txt의 전이 버전/해시를 잠갔습니다. 이번 확인 SDK는 OpenAI3.36.1이며 실제 SDK의 HTTP transport까지 Mock한 Responses contract 테스트도 포함합니다. 의존성 갱신은 pip-tools를 이용해 해시를 다시 생성하고 테스트/패키지를 재검증하세요. 개발용 pytest/ruff는 별도 requirements-dev.txt입니다.

## 네 가지 합성 장애

```bash
python3 scripts/aiops_mock_event.py rds > /tmp/aiops-rds.json
python3 scripts/aiops_mock_event.py environment > /tmp/aiops-env.json
python3 scripts/aiops_mock_event.py timeout > /tmp/aiops-timeout.json
python3 scripts/aiops_mock_event.py http500 > /tmp/aiops-http500.json
```

이 스크립트는 JSON만 생성하고 네트워크를 호출하지 않습니다. DB SG/비밀번호/운영 endpoint를 고의로 망가뜨리거나 테스트용500 endpoint를 제품에 추가하지 않았습니다. 파서/분류/알림 흐름은 pytest에서 이와 같은 이벤트로 검증합니다. 실제 AWS 연결 테스트는 기본 테스트에 포함하지 않고 [AWS 배포 문서](AIOPS_AWS_DEPLOYMENT.md)의 사용자 명시적 단계로 분리했습니다.

테스트 범위: gzip/batch/CONTROL/잘못된 입력, ECS Task/Deployment/정상 종료 제외, JWT/API키/비밀번호/이메일/전화/연결 문자열 마스킹, stack 길이, schema/refusal/incomplete/401/429/timeout, AI OFF, 원자적 claim/한도 Fake 동시 실행, UTC 일자, TTL 삭제 지연, SNS 실패 캐시 재시도, 중복 알림, prompt injection 데이터 분리와 출력 재마스킹입니다. Fake lock 검증은 실제 AWS DynamoDB의 통합 검증을 대체하지 않습니다.

## Lambda ZIP

```bash
AIOPS_PYTHON=.venv/bin/python bash scripts/build_aiops.sh
# lambda/aiops/build/aiops.zip 및 aiops.zip.sha256
```

소스와 hash-pinned 의존성을 Linux x86_64/CPython3.13용 manylinux2014 wheel로 설치합니다. 테스트/pycache는 ZIP에 넣지 않습니다. 파일 순서/시간/권한을 고정해 같은 입력의 ZIP을 재현하고 SHA256/무결성/크기/ELF .so를 검사합니다. build 결과는 Git 제외입니다. 잠긴 wheel이 대상 플랫폼을 제공하지 않으면 빌드는 실패하며 버전을 검토해야 합니다. 소스 수정 후 반드시 ZIP을 다시 빌드하세요.

macOS에서 Linux binary를 직접 import했다고 주장하지 않습니다. GitHub Linux Python3.13 job은 ZIP을 풀어 handler import까지 검증하도록 작성했으며 원격 workflow는 이번에 실행하지 않았습니다. 로컬 ZIP의 ELF/대상 wheel 검사와 실제 AWS Lambda 실행 검증은 다릅니다.

Terraform은 ZIP이 없는 상태에서도 fmt/validate를 수행할 수 있지만 AIOps를 활성화한 사용자 plan/apply 시 precondition으로 먼저 build_aiops.sh를 실행하라고 안내합니다. 파일 내용을 Terraform에서 직접 생성하거나 계정에 업로드하는 로컬 테스트는 하지 않습니다.
