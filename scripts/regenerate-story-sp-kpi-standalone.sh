#!/bin/sh
# Repo root — offline standalone 번들 재생성
set -e
cd "$(dirname "$0")/.."
python3 << 'PY'
from pathlib import Path
import base64
import tarfile
import io

root = Path(".")
files = [
    ("backend/services/initiative_sp_kpi_service.py", "backend/services/initiative_sp_kpi_service.py"),
    ("backend/tvjira_client.py", "backend/tvjira_client.py"),
    ("scripts/patch-be-story-sp-kpi-router-snippet.py", "scripts/patch-be-story-sp-kpi-router-snippet.py"),
    ("scripts/lib/require-be-pod.sh", "scripts/lib/require-be-pod.sh"),
    ("scripts/verify-story-sp-kpi-import.py", "scripts/verify-story-sp-kpi-import.py"),
]
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode="w:gz") as tar:
    for disk, arc in files:
        tar.add(root / disk, arcname=arc)
b64 = base64.b64encode(buf.getvalue()).decode()

script = """#!/bin/sh
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"
if [ ! -f config.py ] || [ ! -f main.py ]; then
  echo "NG: BE pod only. hostname=$(hostname)"
  exit 1
fi
echo "=== patch-be-story-sp-kpi-standalone (offline bundle) ==="
mkdir -p services routers scripts/lib /tmp/sp-kpi-extract
B64='__B64__'
echo "$B64" | base64 -d > /tmp/sp-kpi-bundle.tgz
tar xzf /tmp/sp-kpi-bundle.tgz -C /tmp/sp-kpi-extract
cp /tmp/sp-kpi-extract/backend/services/initiative_sp_kpi_service.py services/initiative_sp_kpi_service.py
cp /tmp/sp-kpi-extract/backend/tvjira_client.py tvjira_client.py
cp /tmp/sp-kpi-extract/scripts/patch-be-story-sp-kpi-router-snippet.py scripts/patch-be-story-sp-kpi-router-snippet.py
cp /tmp/sp-kpi-extract/scripts/lib/require-be-pod.sh scripts/lib/require-be-pod.sh
cp /tmp/sp-kpi-extract/scripts/verify-story-sp-kpi-import.py scripts/verify-story-sp-kpi-import.py
chmod +x scripts/patch-be-story-sp-kpi-router-snippet.py scripts/verify-story-sp-kpi-import.py
if ! grep -q story-sp-kpi routers/model_status.py 2>/dev/null; then
  python3 scripts/patch-be-story-sp-kpi-router-snippet.py "$ROOT"
fi
export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
python3 scripts/verify-story-sp-kpi-import.py
if [ -x scripts/restart-be-route-port.sh ]; then sh scripts/restart-be-route-port.sh; fi
echo "Done. curl :8000/api/model-status/initiatives/story-sp-kpi ..."
"""
script = script.replace("__B64__", b64)

out = root / "scripts/patch-be-story-sp-kpi-standalone.sh"
out.write_text(script, encoding="utf-8")
out.chmod(0o755)
print("wrote", out, out.stat().st_size, "bytes")
PY
