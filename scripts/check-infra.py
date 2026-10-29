"""계정/네트워크 호출 없는 구조 회귀 검사. 보안 감사나 실제 AWS 검증을 대체하지 않습니다."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
def read(path): return (ROOT / path).read_text()
for path in ['infra/backend.tf','infra/bootstrap/backend.tf.example']:
    assert re.search(r'use_lockfile\s*=\s*true', read(path))
for path in ['infra/providers.tf','infra/bootstrap/providers.tf']:
    assert 'allowed_account_ids' in read(path)
for path in (ROOT/'infra/modules').rglob('*.tf'):
    assert 'backend "' not in path.read_text(), str(path)
    assert 'provider "aws"' not in path.read_text(), str(path)
code='\n'.join(p.read_text() for p in (ROOT/'infra').rglob('*.tf') if '.terraform' not in p.parts)
assert 'terraform_remote_state' not in code
assert re.search(r'publicly_accessible\s*=\s*false',read('infra/modules/rds/main.tf'))
assert re.search(r'manage_master_user_password\s*=\s*true',code)
assert re.search(r'assign_public_ip\s*=\s*false',code)
assert re.search(r'force_destroy\s*=\s*var.allow_storage_cleanup',code)
assert re.search(r'force_delete\s*=\s*var.allow_storage_cleanup',code)
assert 'permissions_boundary' in code
assert 'custom_error_response' not in code
expected={'vpc','frontend','ecr','iam','alb','ecs','rds','nat','aiops'}
assert {p.name for p in (ROOT/'infra/modules').iterdir() if p.is_dir()} == expected
assert set(re.findall(r'module "([^"]+)"',read('infra/main.tf'))) == expected
for name in expected:
    for filename in ['main.tf','variables.tf','outputs.tf']:
        assert (ROOT/'infra/modules'/name/filename).is_file(), (name,filename)
    assert 'module "' not in read(f'infra/modules/{name}/main.tf')
assert re.search(r'db_host\s*=\s*module\.rds\[0\]\.db_host',read('infra/main.tf'))
assert 'module.ecr.repository_url' in read('infra/main.tf')
assert 'module.alb[0].target_group_arn' in read('infra/main.tf')
for p in (ROOT/'infra').rglob('*.tf'):
    if '.terraform' not in p.parts:
        assert not re.search(r'\b(?:password|secret_string|access_key|secret_key)\s*=',p.read_text()),str(p)
for p in (ROOT/'.github/workflows').glob('*.yml'):
    s=p.read_text()
    assert not re.search(r'terraform[^\n]*(?:\bapply\b|\bdestroy\b|\bplan\b)',s),str(p)
    assert 'live-plan' not in s and 'live-apply' not in s,str(p)
assert 'state_bucket' not in read('infra/modules/iam/main.tf')
# runtimeは初回生成後CIが所有します。メタデータ差分によるDEMO再アップロードを防ぎます。
runtime = read('infra/modules/frontend/main.tf').split('resource "aws_s3_object" "runtime" {', 1)[1]
assert re.search(r'ignore_changes\s*=\s*all', runtime)
assert 'no-store,max-age=0' in runtime
interview = read('infra/interview.tf')
assert 'var.enable_backend && var.interview_mode != "suspended"' in interview
assert 'self.status == "available" && self.engine == "postgres"' in interview
assert 'enable_backend     = var.enable_backend' in read('infra/main.tf')  # SG/VPC는 중단 중에도 유지
assert read('infra/main.tf').count('count                 = local.backend_running ? 1 : 0') >= 1

aiops=read('infra/modules/aiops/main.tf')
assert 'vpc_config' not in aiops
assert 'aws_cloudwatch_log_subscription_filter' in aiops and 'aws_lambda_permission.logs' in aiops
assert 'aws_dynamodb_table' in aiops and 'PAY_PER_REQUEST' in aiops
assert 'module.ecs[0].cluster_arn' in read('infra/main.tf')
assert 'module.ecs[0].log_group_arn' in read('infra/main.tf')
assert 'fileexists(var.package_path)' in aiops
print('PASS: 기존 8개+AIOps 모듈/단일 Main State/비밀값/사설망/자동 인프라 변경 금지 검사')

summary = read('infra/modules/aiops/scheduler.tf')
assert 'aws_scheduler_schedule_group' in summary
assert 'rate(' not in summary and 'cron(' not in summary
assert 'scheduler:CreateSchedule' in aiops and 'scheduler:GetSchedule' in aiops
assert 'iam:PassedToService' in aiops and 'scheduler.amazonaws.com' in aiops
assert 'reserved_concurrent_executions = var.settings.reserved_concurrency' in aiops

assert 'var.interview_mode == "running" && var.aiops_settings.processing_enabled' in interview
assert 'merge(var.aiops_settings, { processing_enabled = local.aiops_processing_enabled })' in read('infra/main.tf')
