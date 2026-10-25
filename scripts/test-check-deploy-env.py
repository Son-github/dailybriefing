"""AWS 호출 없이 최초 이미지 업로드와 실제 서버 배포의 변수 요구사항을 검증합니다."""
from pathlib import Path
import subprocess
import sys
import unittest

SCRIPT = Path(__file__).with_name('check-deploy-env.py')


class DeploymentEnvironmentTests(unittest.TestCase):
    def check(self, mode, variables):
        # 로컬 AWS/GitHub 환경값이 누락 변수 테스트를 통과시키지 않도록 격리합니다.
        return subprocess.run(
            [sys.executable, str(SCRIPT), mode], env=variables,
            capture_output=True, text=True, check=False,
        )

    def test_first_image_needs_no_ecs_or_frontend(self):
        result = self.check('backend-image', {
            'AWS_ACCOUNT_ID': '123456789012',
            'BACKEND_ROLE_ARN': 'example-role', 'ECR_URL': 'example-repository',
        })
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_image_variables_report_names_only(self):
        result = self.check('backend-image', {'AWS_ACCOUNT_ID': '123456789012'})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('BACKEND_ROLE_ARN', result.stderr)
        self.assertIn('ECR_URL', result.stderr)
        self.assertNotIn('123456789012', result.stderr)

    def test_server_deployment_still_requires_ecs(self):
        result = self.check('backend', {
            'AWS_ACCOUNT_ID': '123456789012', 'BACKEND_ROLE_ARN': 'example-role',
            'ECR_URL': 'example-repository', 'FRONTEND_BUCKET': 'example-bucket',
            'CF_DISTRIBUTION_ID': 'example-distribution',
            'FRONTEND_URL': 'https://example.com',
        })
        self.assertNotEqual(result.returncode, 0)
        for key in ['ECS_CLUSTER', 'ECS_SERVICE', 'TASK_FAMILY']:
            self.assertIn(key, result.stderr)

    def test_frontend_keeps_https_requirement(self):
        result = self.check('frontend', {
            'AWS_ACCOUNT_ID': '123456789012', 'FRONTEND_ROLE_ARN': 'example-role',
            'FRONTEND_BUCKET': 'example-bucket', 'CF_DISTRIBUTION_ID': 'example',
            'FRONTEND_URL': 'http://example.com',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('HTTPS', result.stderr)


if __name__ == '__main__':
    unittest.main()
