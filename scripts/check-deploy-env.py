"""Fail early on missing GitHub deployment variables; never print their values."""
import os
import sys

common = ['AWS_ACCOUNT_ID', 'FRONTEND_BUCKET', 'CF_DISTRIBUTION_ID', 'FRONTEND_URL']
required = {
    'frontend': common + ['FRONTEND_ROLE_ARN'],
    'backend': common + ['BACKEND_ROLE_ARN', 'ECR_URL', 'ECS_CLUSTER', 'ECS_SERVICE', 'TASK_FAMILY'],
}
if len(sys.argv) != 2 or sys.argv[1] not in required:
    raise SystemExit('Usage: python3 scripts/check-deploy-env.py frontend|backend')
missing = [key for key in required[sys.argv[1]] if not os.environ.get(key, '').strip()]
if missing:
    raise SystemExit('GitHub Variables 설정 필요: ' + ', '.join(missing))
if not os.environ['FRONTEND_URL'].startswith('https://'):
    raise SystemExit('FRONTEND_URL에는 HTTPS origin을 입력하세요.')
print('PASS: 필수 배포 변수 설정 확인')
