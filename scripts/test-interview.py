"""실제 Terraform 계획/AWS 호출 없이 면접 중단·복구와 삭제 범위를 검증합니다."""
from copy import deepcopy
import contextlib
import io
import json
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import interview


def plan(phase):
    suspend = phase == "suspend"
    resume = phase == "resume"
    db = {"deletion_protection": resume, "skip_final_snapshot": False,
          "final_snapshot_identifier": "saved-final", "snapshot_identifier": "saved-final" if resume else None}
    return {
        "applyable": True,
        "variables": {key: {"value": value} for key, value in {
            "interview_mode": "suspended" if suspend else "running" if resume else "prepare-suspend",
            "enable_backend": True, "allow_storage_cleanup": False, "database_disposal": "protect",
            "final_snapshot_identifier": "saved-final", "restore_snapshot_identifier": "saved-final" if resume else None,
        }.items()},
        "resource_changes": [{"mode": "managed", "address": interview.DATABASE,
                              "change": {"actions": ["delete" if suspend else "create" if resume else "update"],
                                         "before": deepcopy(db) if not resume else {}, "after": None if suspend else db}}],
    }


class InterviewTests(unittest.TestCase):
    def test_complete_local_cycle_preserves_restore_source(self):
        prepared = interview.transition({}, "prepare-suspend", "saved-final")
        self.assertEqual(prepared, interview.transition(prepared, "prepare-suspend"))
        suspended = interview.transition(prepared, "suspend")
        resumed = interview.transition(suspended, "resume")
        self.assertEqual(resumed["restore_snapshot_identifier"], "saved-final")
        self.assertEqual(resumed["interview_mode"], "running")
        next_cycle = interview.transition(resumed, "prepare-suspend", "next-final")
        self.assertEqual(next_cycle["restore_snapshot_identifier"], "saved-final")
        self.assertEqual(next_cycle["final_snapshot_identifier"], "next-final")

    def test_suspending_without_prepare_is_rejected(self):
        with self.assertRaises(ValueError):
            interview.transition({}, "suspend")

    def test_restoring_over_existing_running_db_is_rejected(self):
        with self.assertRaises(ValueError):
            interview.transition({}, "resume", "saved-final")

    def test_new_snapshot_name_must_not_reuse_source(self):
        with self.assertRaises(ValueError):
            interview.transition({"restore_snapshot_identifier": "saved-final"}, "prepare-suspend", "saved-final")

    def test_snapshot_name_rules(self):
        for value in (None, "", "-bad", "bad-", "bad--name", "UPPER", "a" * 256):
            with self.subTest(value=value), self.assertRaises(ValueError):
                interview.snapshot_name(value)

    def test_expected_phases_pass(self):
        for phase in ("prepare-suspend", "suspend", "resume"):
            with self.subTest(phase=phase):
                self.assertEqual(sum(interview.check_plan(plan(phase), phase).values()), 1)

    def test_prepare_rejects_unrelated_pending_changes(self):
        p = plan("prepare-suspend")
        p["resource_changes"].append({"mode": "managed", "address": "module.frontend.aws_s3_bucket.frontend",
                                      "change": {"actions": ["update"]}})
        with self.assertRaisesRegex(ValueError, "준비 단계"):
            interview.check_plan(p, "prepare-suspend")

    def test_prepare_does_not_mix_in_database_resize(self):
        p = plan("prepare-suspend")
        p["resource_changes"][0]["change"]["after"]["instance_class"] = "db.t4g.small"
        with self.assertRaisesRegex(ValueError, "사양"):
            interview.check_plan(p, "prepare-suspend")

    def test_suspend_protects_all_foundation_resources(self):
        for address in ("aws_acm_certificate.api[0]", "module.ecr.aws_ecr_repository.backend",
                        "module.frontend.aws_s3_bucket.frontend", "module.vpc.aws_vpc.main",
                        'module.iam.aws_iam_role.github["backend"]'):
            with self.subTest(address=address):
                p = plan("suspend")
                p["resource_changes"].append({"mode": "managed", "address": address, "change": {"actions": ["delete"]}})
                with self.assertRaisesRegex(ValueError, "보존 자원"):
                    interview.check_plan(p, "suspend")

    def test_suspend_rejects_unprepared_database(self):
        for field, value in (("deletion_protection", True), ("skip_final_snapshot", True),
                             ("final_snapshot_identifier", "different-final")):
            with self.subTest(field=field):
                p = plan("suspend")
                p["resource_changes"][0]["change"]["before"][field] = value
                with self.assertRaisesRegex(ValueError, "먼저 적용"):
                    interview.check_plan(p, "suspend")

    def test_resume_rejects_empty_database_and_replacement(self):
        p = plan("resume")
        p["resource_changes"][0]["change"]["after"]["snapshot_identifier"] = None
        with self.assertRaisesRegex(ValueError, "스냅샷 복원"):
            interview.check_plan(p, "resume")
        p = plan("resume")
        p["resource_changes"][0]["change"]["actions"] = ["delete", "create"]
        with self.assertRaisesRegex(ValueError, "교체"):
            interview.check_plan(p, "resume")

    def test_cloudfront_api_change_preserves_frontend(self):
        p = plan("suspend")
        settings = {"aliases": ["www.example.com"], "viewer_certificate": ["kept"],
                    "default_cache_behavior": ["kept"], "enabled": True}
        change = {"mode": "managed", "address": interview.CLOUDFRONT,
                  "change": {"actions": ["update"], "before": deepcopy(settings), "after": deepcopy(settings)}}
        p["resource_changes"].append(change)
        interview.check_plan(p, "suspend")
        change["change"]["after"]["aliases"] = []
        with self.assertRaisesRegex(ValueError, "보존"):
            interview.check_plan(p, "suspend")

    def test_wrong_phase_and_full_destroy_inputs_are_rejected(self):
        with self.assertRaises(ValueError):
            interview.check_plan(plan("resume"), "suspend")
        p = plan("suspend")
        p["variables"]["allow_storage_cleanup"]["value"] = True
        with self.assertRaises(ValueError):
            interview.check_plan(p, "suspend")

    def test_cli_only_writes_ignored_overlay(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            original = folder / "terraform.tfvars"
            original.write_text('enable_backend = true\n')
            with patch.object(sys, "argv", ["interview.py", "prepare-suspend", "--snapshot", "saved-final", "--infra-dir", directory]), \
                 patch("subprocess.run") as run, contextlib.redirect_stdout(io.StringIO()):
                interview.main()
            run.assert_not_called()
            self.assertEqual(original.read_text(), 'enable_backend = true\n')
            self.assertEqual(json.loads((folder / interview.OVERLAY).read_text())["interview_mode"], "prepare-suspend")

    def test_check_only_shows_local_plan_with_credentials_blocked(self):
        document = plan("suspend")
        document["variables"]["private_test_value"] = {"value": "not-for-output"}
        output = io.StringIO()
        result = subprocess.CompletedProcess([], 0, stdout=json.dumps(document))
        with patch.object(sys, "argv", ["interview.py", "check", "--phase", "suspend"]), \
             patch("subprocess.run", return_value=result) as run, contextlib.redirect_stdout(output):
            interview.main()
        command = run.call_args.args[0]
        self.assertEqual(command[2:], ["show", "-json", "base.tfplan"])
        env = run.call_args.kwargs["env"]
        self.assertEqual(env["AWS_SHARED_CREDENTIALS_FILE"], "/dev/null")
        self.assertEqual(env["AWS_EC2_METADATA_DISABLED"], "true")
        self.assertNotIn("AWS_ACCESS_KEY_ID", env)
        self.assertNotIn("not-for-output", output.getvalue())


if __name__ == "__main__":
    unittest.main()
