#!/usr/bin/env bash
# AWS/OpenAI 호출 없이 Linux x86_64 / Lambda Python3.13 ZIP만 빌드합니다.
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$TASK_ROOT/lambda/aiops"
BUILD_ROOT="$SOURCE/build"
PYTHON="${AIOPS_PYTHON:-python3}"
mkdir -p "$BUILD_ROOT"
STAGE="$(mktemp -d "$BUILD_ROOT/stage.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
"$PYTHON" -m pip install --disable-pip-version-check --no-compile --require-hashes \
  --only-binary=:all: --platform manylinux2014_x86_64 --implementation cp --python-version 3.13 --abi cp313 \
  --target "$STAGE" -r "$SOURCE/requirements.txt" > "$BUILD_ROOT/install.log" 2>&1
cp "$SOURCE"/*.py "$STAGE/"
"$PYTHON" - "$STAGE" "$BUILD_ROOT/aiops.zip" <<'PY'
from pathlib import Path
import hashlib,sys,zipfile
source, target=map(Path,sys.argv[1:])
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for path in sorted(source.rglob('*')):
        if not path.is_file() or '__pycache__' in path.parts or path.suffix=='.pyc':continue
        if path.relative_to(source).parts[0]=='bin' or path.name in ['RECORD','direct_url.json']:continue
        info=zipfile.ZipInfo(path.relative_to(source).as_posix(),date_time=(1980,1,1,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=0o100644 << 16
        z.writestr(info,path.read_bytes(),compresslevel=9)
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert 'handler.py' in z.namelist()
    assert not any(n.startswith('tests/') for n in z.namelist())
    assert sum(x.file_size for x in z.infolist()) < 250*1024*1024
    for n in z.namelist():
        if n.endswith('.so'):assert z.read(n).startswith(b'\x7fELF'),n
assert target.stat().st_size < 50*1024*1024
checksum=hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.zip.sha256').write_text(checksum+'  aiops.zip\n')
print('Lambda ZIP:',target)
print('SHA256:',checksum)
PY
