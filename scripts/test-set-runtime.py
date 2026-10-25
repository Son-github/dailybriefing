"""실제 AWS 명령 없이 실행 설정의 변경 차단과 LIVE 키 보존을 검증합니다."""
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('set-runtime.py')


class RuntimeTests(unittest.TestCase):
    def invoke(self, mode, environment, runner):
        with patch.dict(os.environ, environment, clear=True), patch.object(
            sys, 'argv', [str(SCRIPT), '--mode', mode, '--bucket', 'example-bucket',
                          '--distribution', 'example-distribution'],
        ), patch('subprocess.run', side_effect=runner):
            runpy.run_path(str(SCRIPT), run_name='__main__')

    def test_no_opt_in_runs_no_aws_commands(self):
        with patch('subprocess.run') as runner:
            with self.assertRaisesRegex(SystemExit, 'AWS 변경 차단'):
                self.invoke('LIVE', {}, runner)
            runner.assert_not_called()

    def test_live_without_map_key_does_not_overwrite_runtime(self):
        calls = []
        with self.assertRaisesRegex(SystemExit, 'PUBLIC_KAKAO_MAP_KEY'):
            self.invoke('LIVE', {'ALLOW_AWS_MUTATIONS': 'I_UNDERSTAND_COSTS'}, calls.append)
        self.assertEqual(calls, [])

    def test_live_key_and_mode_survive_upload(self):
        uploaded = []
        commands = []

        def runner(command, **kwargs):
            commands.append(command)
            if command[:3] == ['aws', 's3', 'cp']:
                uploaded.append(json.loads(Path(command[3]).read_text()))
            return subprocess.CompletedProcess(command, 0, stdout='example-invalidation\n')

        self.invoke('LIVE', {
            'ALLOW_AWS_MUTATIONS': 'I_UNDERSTAND_COSTS',
            'PUBLIC_KAKAO_MAP_KEY': 'test-public-javascript-key',
        }, runner)
        self.assertEqual(uploaded[0]['mode'], 'LIVE')
        self.assertTrue(uploaded[0]['liveEnabled'])
        self.assertEqual(uploaded[0]['kakaoMapKey'], 'test-public-javascript-key')
        self.assertIn('no-store,max-age=0', commands[0])
        self.assertEqual(commands[-1][1:4], ['cloudfront', 'wait', 'invalidation-completed'])


if __name__ == '__main__':
    unittest.main()
