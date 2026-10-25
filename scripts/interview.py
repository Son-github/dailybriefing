"""면접용 모드 파일 생성과 저장된 계획 검사. AWS/plan/apply/destroy는 실행하지 않습니다.

기본 terraform.tfvars는 수정하지 않습니다. 개인별 모드는 Git 제외된 JSON overlay에
저장합니다. check는 저장 계획을 로컬에서 show -json으로 읽을 뿐 원격 State를 읽지 않습니다.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]
OVERLAY = "interview.auto.tfvars.json"
DATABASE = "module.rds[0].aws_db_instance.main"
RUNTIME_MODULES = tuple(f"module.{name}[0]." for name in ("nat", "alb", "ecs", "rds", "aiops"))
CLOUDFRONT = "module.frontend.aws_cloudfront_distribution.frontend"


def snapshot_name(value):
    if not isinstance(value, str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,253}[a-z0-9]", value) or "--" in value:
        raise ValueError("스냅샷 이름은 소문자 시작 2~255자의 문자/숫자/하이픈이며 끝/연속 하이픈은 허용하지 않습니다.")
    return value


def transition(current, command, snapshot=None):
    """파일의 단계만 전환합니다. AWS에서 이전 적용이 성공했음을 의미하지 않습니다."""
    mode = current.get("interview_mode", "running")
    result = dict(current)
    if command == "prepare-suspend":
        if mode == "suspended":
            raise ValueError("중단 상태에서는 먼저 resume으로 복원하세요.")
        if mode == "prepare-suspend":
            if snapshot and snapshot != current.get("final_snapshot_identifier"):
                raise ValueError("준비 중인 스냅샷 이름은 바꾸지 마세요. 기존 계획과 같은 이름을 유지합니다.")
            return result
        name = snapshot or f"interview-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:6]}"
        name = snapshot_name(name)
        if name == current.get("restore_snapshot_identifier"):
            raise ValueError("복원 원본과 다른 새 최종 스냅샷 이름이 필요합니다.")
        result.update(interview_mode="prepare-suspend", final_snapshot_identifier=name)
    elif command == "suspend":
        if mode not in ("prepare-suspend", "suspended"):
            raise ValueError("prepare-suspend 계획을 먼저 검토하고 적용해야 합니다.")
        snapshot_name(current.get("final_snapshot_identifier"))
        result["interview_mode"] = "suspended"
    elif command == "resume":
        if mode != "suspended":
            raise ValueError("suspend 적용 완료 후 resume을 사용하세요. 기존 DB에 복원 원본을 바꾸면 교체될 수 있습니다.")
        name = snapshot_name(snapshot or current.get("final_snapshot_identifier"))
        result.update(interview_mode="running", restore_snapshot_identifier=name, final_snapshot_identifier="")
    return result


def check_plan(plan, phase):
    """보존 리소스 삭제/교체 및 준비 없는 DB 삭제를 거절합니다. 실제 복원 검증은 별도입니다."""
    if plan.get("errored") or plan.get("applyable") is False:
        raise ValueError("오류가 있거나 적용할 변경이 없는 계획입니다. 새 계획을 확인하세요.")
    values = {key: item.get("value") for key, item in plan.get("variables", {}).items()}
    expected_mode = {"prepare-suspend": "prepare-suspend", "suspend": "suspended", "resume": "running"}[phase]
    if values.get("interview_mode", "running") != expected_mode:
        raise ValueError("계획의 interview_mode와 검사 단계가 다릅니다. 새 base.tfplan을 생성하세요.")
    if values.get("enable_backend") is not True or values.get("allow_storage_cleanup") is not False:
        raise ValueError("enable_backend=true / allow_storage_cleanup=false를 유지해야 합니다.")
    if values.get("database_disposal") != "protect":
        raise ValueError("기본 DB 정책은 protect로 유지하고 면접 모드의 준비 단계를 사용하세요.")
    snapshot = values.get("restore_snapshot_identifier") if phase == "resume" else values.get("final_snapshot_identifier")
    snapshot_name(snapshot)
    database_found = False
    counts = {"create": 0, "update": 0, "delete": 0}
    for item in plan.get("resource_changes", []):
        if item.get("mode") != "managed":
            continue
        address = item["address"]
        change = item["change"]
        actions = change["actions"]
        if actions == ["no-op"]:
            continue
        if len(actions) != 1 or actions[0] not in counts:
            raise ValueError(f"교체/예상 밖 작업 금지: {address}")
        action = actions[0]
        counts[action] += 1
        before, after = change.get("before") or {}, change.get("after") or {}
        if address == CLOUDFRONT and phase != "prepare-suspend" and action == "update":
            for key in ("aliases", "viewer_certificate", "default_cache_behavior", "enabled"):
                if before.get(key) != after.get(key):
                    raise ValueError("CloudFront 화면 도메인/인증서/기본 동작은 보존해야 합니다.")
            continue
        if phase == "prepare-suspend":
            if address != DATABASE or action != "update":
                raise ValueError(f"준비 단계는 기존 DB 삭제 정책만 변경해야 합니다: {address}")
        elif not address.startswith(RUNTIME_MODULES):
            raise ValueError(f"보존 자원 변경 금지: {address}")
        elif action != ("delete" if phase == "suspend" else "create"):
            raise ValueError(f"단계와 다른 작업: {address}")
        if address == DATABASE:
            database_found = True
            db = before if phase == "suspend" else after
            if phase == "prepare-suspend":
                for key in ("identifier", "instance_class", "allocated_storage", "storage_type", "snapshot_identifier",
                            "engine", "engine_version", "db_name", "username", "vpc_security_group_ids",
                            "db_subnet_group_name", "publicly_accessible", "storage_encrypted", "manage_master_user_password"):
                    if before.get(key) != after.get(key):
                        raise ValueError("준비 단계에서 DB 사양/원본/네트워크를 함께 변경하지 마세요.")
            if phase == "resume":
                if db.get("snapshot_identifier") != snapshot or db.get("deletion_protection") is not True:
                    raise ValueError("지정 스냅샷 복원과 DB 삭제 보호가 필요합니다.")
            elif (db.get("deletion_protection") is not False or db.get("skip_final_snapshot") is not False
                  or db.get("final_snapshot_identifier") != snapshot):
                raise ValueError("DB 최종 스냅샷 정책이 먼저 적용되지 않았습니다. prepare-suspend부터 완료하세요.")
    if not database_found:
        raise ValueError("이 단계의 DB 작업이 없습니다. 부분 실패/이미 적용 여부를 먼저 확인하세요.")
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["status", "prepare-suspend", "suspend", "resume", "check"])
    parser.add_argument("--snapshot", help="새 최종 스냅샷 또는 명시적으로 복원할 보관 스냅샷 이름")
    parser.add_argument("--infra-dir", type=Path, default=ROOT / "infra")
    parser.add_argument("--plan", default="base.tfplan")
    parser.add_argument("--phase", choices=["prepare-suspend", "suspend", "resume"])
    args = parser.parse_args()
    folder = args.infra_dir.resolve()
    path = folder / OVERLAY
    try:
        if args.command == "check":
            if not args.phase:
                parser.error("check에는 --phase가 필요합니다.")
            env = dict(os.environ)
            for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
                env.pop(key, None)
            env.update(AWS_EC2_METADATA_DISABLED="true", AWS_SHARED_CREDENTIALS_FILE="/dev/null", AWS_CONFIG_FILE="/dev/null")
            result = subprocess.run(["terraform", f"-chdir={folder}", "show", "-json", args.plan],
                                    env=env, text=True, capture_output=True, check=False)
            if result.returncode:
                raise ValueError("저장 계획을 로컬에서 읽지 못했습니다. init/provider/파일 경로를 확인하세요. 원문은 출력하지 않습니다.")
            print("PASS: 계획의 보존 범위/DB 정책 검사", check_plan(json.loads(result.stdout), args.phase))
            print("이 검사는 AWS 작업을 하지 않았습니다. 전체 계획을 검토한 후 사용자가 직접 적용합니다.")
            return
        current = json.loads(path.read_text()) if path.exists() else {}
        if args.command == "status":
            print(json.dumps(current or {"interview_mode": "running"}, ensure_ascii=False, indent=2))
            print("로컬 요청 모드입니다. AWS 실제 상태나 스냅샷 존재를 확인한 결과가 아닙니다.")
            return
        result = transition(current, args.command, args.snapshot)
        # 자격증명은 저장하지 않습니다. 임시 파일을 같은 디렉터리에 쓴 뒤 원자적으로 교체합니다.
        temporary = folder / "interview.auto.tfvars.json.tmp"
        temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        temporary.replace(path)
        print(f"로컬 설정만 준비했습니다: {path}")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("AWS/plan/apply/destroy는 실행하지 않았습니다. 다음 단계는 문서의 새 계획 생성과 검사입니다.")
    except (ValueError, OSError) as error:
        parser.exit(1, f"중단: {error}\n")


if __name__ == "__main__":
    main()
