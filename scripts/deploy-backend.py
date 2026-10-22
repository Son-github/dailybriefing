"""사용자가 승인한 앱 배포 전용. 인프라 생성/삭제는 수행하지 않습니다. 이번 코드 작업에서는 실행하지 않습니다."""
import json
import os
import re
import subprocess
import tempfile


def task_payload(current, image):
    """현재 서비스가 아닌 최신 family 설정을 사용해 Terraform의 환경/Secret 변경도 함께 반영합니다."""
    allowed = ['family', 'taskRoleArn', 'executionRoleArn', 'networkMode', 'containerDefinitions',
               'volumes', 'placementConstraints', 'requiresCompatibilities', 'cpu', 'memory',
               'runtimePlatform', 'ephemeralStorage', 'pidMode', 'ipcMode', 'proxyConfiguration',
               'inferenceAccelerators', 'enableFaultInjection']
    payload = {k: current[k] for k in allowed if k in current}
    containers = [c for c in payload['containerDefinitions'] if c['name'] == 'backend']
    if len(containers) != 1:
        raise ValueError('backend 컨테이너 정의가 정확히 하나여야 합니다.')
    containers[0]['image'] = image
    return payload


def aws(*args):
    result = subprocess.run(['aws', *args, '--output', 'json'], check=True, capture_output=True, text=True, timeout=900)
    return json.loads(result.stdout) if result.stdout.strip() else {}


def deploy():
    if os.environ.get('ALLOW_AWS_MUTATIONS') != 'I_UNDERSTAND_COSTS':
        raise SystemExit('AWS 앱 배포 차단: 명시적 승인 환경이 필요합니다.')
    cluster, service, family, image = [os.environ[k] for k in ['ECS_CLUSTER', 'ECS_SERVICE', 'TASK_FAMILY', 'IMAGE_URI']]
    account = os.environ['AWS_ACCOUNT_ID']
    if not re.fullmatch(r'[0-9]{12}', account) or not re.fullmatch(re.escape(account)+r'\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/[a-z0-9/_-]+@sha256:[a-f0-9]{64}', image):
        raise SystemExit('계정 또는 immutable ECR digest 형식이 올바르지 않습니다.')
    if aws('sts','get-caller-identity')['Account'] != account:
        raise SystemExit('설정한 계정과 실제 OIDC 계정이 다릅니다.')
    services = aws('ecs','describe-services','--cluster',cluster,'--services',service)
    if services.get('failures') or not services.get('services') or services['services'][0]['status'] != 'ACTIVE':
        raise SystemExit('ECS 서비스가 없습니다. 사용자가 먼저 Main 2차 인프라를 생성해야 합니다. 자동으로 생성하지 않습니다.')
    old_revision = services['services'][0]['taskDefinition']
    current = aws('ecs','describe-task-definition','--task-definition',family)['taskDefinition']
    if current['family'] != family or current.get('status') != 'ACTIVE':
        raise SystemExit('활성화된 Task family를 확인하세요.')
    with tempfile.NamedTemporaryFile(mode='w',suffix='.json') as f:
        json.dump(task_payload(current,image),f); f.flush()
        revision = aws('ecs','register-task-definition','--cli-input-json','file://'+f.name)['taskDefinition']['taskDefinitionArn']
    aws('ecs','update-service','--cluster',cluster,'--service',service,'--task-definition',revision)
    subprocess.run(['aws','ecs','wait','services-stable','--cluster',cluster,'--services',service],check=True,timeout=900)
    deployed=aws('ecs','describe-services','--cluster',cluster,'--services',service)['services'][0]
    if deployed['taskDefinition'] != revision or deployed['runningCount'] < 1 or len(deployed.get('deployments',[])) != 1:
        raise SystemExit('배포 미완료 또는 circuit breaker rollback 감지. 기존 revision='+old_revision)
    print('ECS 새 revision 실행 확인 완료. 다음 API readiness smoke가 통과해야 최종 성공입니다.')

if __name__ == '__main__':
    try:
        deploy()
    except subprocess.CalledProcessError as error:
        # AWS 원문에는 환경값이 섞일 수 있어 전체 응답을 로그로 출력하지 않습니다.
        raise SystemExit('AWS 앱 배포 명령 실패: IAM/OIDC/서비스 상태를 확인하세요. exit='+str(error.returncode)) from None
