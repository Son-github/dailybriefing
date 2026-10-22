"""Check Git upload candidates without printing credential values; no network calls."""
from pathlib import Path
import argparse
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--staged', action='store_true', help='scan index contents before commit')
    args = parser.parse_args()
    if Path(git('rev-parse', '--show-toplevel').decode().strip()).resolve() != ROOT:
        raise SystemExit('FAIL: 프로젝트 자체 Git 저장소가 필요합니다. 이 폴더에서 git init을 실행하세요.')

    # Ignored files are excluded, but already tracked ignored files MUST be checked.
    names = git('ls-files', '-z') if args.staged else git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
    paths = sorted(set(name.decode() for name in names.split(b'\0') if name))
    env_values = []
    for env in [ROOT / '.env', *(ROOT / 'frontend').glob('.env*'), *(ROOT / 'backend').glob('.env*')]:
        if not env.is_file() or env.name.endswith('.example'):
            continue
        for line in env.read_text().splitlines():
            if line.lstrip().startswith('#') or '=' not in line:
                continue
            key, value = line.removeprefix('export ').split('=', 1)
            value = value.strip().strip('"').strip("'")
            if re.search(r'SECRET|PASSWORD|TOKEN|API_KEY|CLIENT_ID|MAP_KEY', key) and len(value) >= 16:
                env_values.append((key.strip(), value))

    pattern = re.compile(
        r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY'
        r'|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}'
        r'|\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}'
    )
    failures = []
    for name in paths:
        path = Path(name)
        if not args.staged and not (ROOT / name).exists():
            continue
        if ((path.name.startswith('.env') and path.name != '.env.example')
                or path.name.endswith(('.tfstate', '.tfstate.backup', '.tfvars', '.tfvars.json', '.tfplan'))
                or path.name == 'backend.hcl'
                or any(part in {'.aws', '.ssh', '.terraform'} for part in path.parts)):
            failures.append((name, 'private local file'))
        if args.staged:
            data = git('show', f':{name}')
        else:
            candidate = ROOT / name
            if not candidate.is_file() or candidate.is_symlink():
                continue
            data = candidate.read_bytes()
        if pattern.search(data.decode('utf-8', errors='replace')):
            failures.append((name, 'credential pattern'))
        for key, value in env_values:
            if value.encode() in data:
                failures.append((name, key))
    if failures:
        for name, kind in sorted(set(failures)):
            print(f'FAIL: {name} contains {kind}')
        raise SystemExit(1)
    print(f'PASS: {len(paths)} Git 업로드 대상 파일 검사 (비밀값 자체는 출력하지 않음)')


if __name__ == '__main__':
    main()
