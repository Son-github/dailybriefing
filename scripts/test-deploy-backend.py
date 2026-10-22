"""AWS 호출 없이 revision payload 변경과 승인 게이트를 검증합니다."""
import importlib.util
import subprocess
import sys
from pathlib import Path
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('deploy_backend',Path(__file__).with_name('deploy-backend.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class DeploymentTest(unittest.TestCase):
    def test_preserves_roles_secrets_and_health_but_removes_read_only_fields(self):
        current={'family':'app','taskRoleArn':'task','executionRoleArn':'execution','revision':7,'taskDefinitionArn':'old',
                 'containerDefinitions':[{'name':'backend','image':'old','secrets':[{'name':'JWT_SECRET','valueFrom':'arn'}],'healthCheck':{'command':['CMD','health']}}]}
        result=module.task_payload(current,'new@sha256:digest')
        self.assertNotIn('revision',result);self.assertNotIn('taskDefinitionArn',result)
        self.assertEqual(result['taskRoleArn'],'task')
        self.assertEqual(result['containerDefinitions'][0]['secrets'],current['containerDefinitions'][0]['secrets'])
        self.assertEqual(result['containerDefinitions'][0]['image'],'new@sha256:digest')
    def test_missing_container_is_rejected(self):
        with self.assertRaises(ValueError):module.task_payload({'containerDefinitions':[]},'image')
    def test_no_approval_never_calls_aws(self):
        with patch.dict(module.os.environ,{},clear=True),patch.object(module,'aws') as aws:
            with self.assertRaises(SystemExit):module.deploy()
            aws.assert_not_called()
    def test_missing_service_never_registers_revision(self):
        env={'ALLOW_AWS_MUTATIONS':'I_UNDERSTAND_COSTS','AWS_ACCOUNT_ID':'123456789012',
             'ECS_CLUSTER':'app','ECS_SERVICE':'backend','TASK_FAMILY':'app',
             'IMAGE_URI':'123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/app@sha256:'+'a'*64}
        with patch.dict(module.os.environ,env,clear=True),patch.object(module,'aws',side_effect=[{'Account':'123456789012'},{'services':[]}]) as aws:
            with self.assertRaisesRegex(SystemExit,'ECS 서비스가 없습니다'):module.deploy()
            self.assertEqual(aws.call_count,2)
    def test_rollback_is_failure_even_when_waiter_succeeds(self):
        env={'ALLOW_AWS_MUTATIONS':'I_UNDERSTAND_COSTS','AWS_ACCOUNT_ID':'123456789012',
             'ECS_CLUSTER':'app','ECS_SERVICE':'backend','TASK_FAMILY':'app',
             'IMAGE_URI':'123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/app@sha256:'+'a'*64}
        replies=[{'Account':'123456789012'},
                 {'services':[{'status':'ACTIVE','taskDefinition':'old'}]},
                 {'taskDefinition':{'family':'app','status':'ACTIVE','containerDefinitions':[{'name':'backend','image':'old'}]}},
                 {'taskDefinition':{'taskDefinitionArn':'new'}},{},
                 {'services':[{'taskDefinition':'old','runningCount':1,'deployments':[{}]}]}]
        with patch.dict(module.os.environ,env,clear=True),patch.object(module,'aws',side_effect=replies),patch.object(module.subprocess,'run'):
            with self.assertRaisesRegex(SystemExit,'rollback'):module.deploy()
if __name__=='__main__':unittest.main()
