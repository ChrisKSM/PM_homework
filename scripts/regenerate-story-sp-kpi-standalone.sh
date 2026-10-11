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
]
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode="w:gz") as tar:
    for disk, arc in files:
        tar.add(root / disk, arcname=arc)
b64 = base64.b64encode(buf.getvalue()).decode()

script = """#!/bin/sh
# standalone-v4 — offline story-sp-kpi BE patch (no git)
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"
echo "=== patch-be-story-sp-kpi-standalone v4 ==="
if [ ! -f config.py ] || [ ! -f main.py ]; then
  echo "NG: BE pod only. hostname=$(hostname)"
  exit 1
fi
mkdir -p services routers scripts/lib /tmp/sp-kpi-extract
B64='__B64__'
echo "$B64" | base64 -d > /tmp/sp-kpi-bundle.tgz
tar xzf /tmp/sp-kpi-bundle.tgz -C /tmp/sp-kpi-extract
cp /tmp/sp-kpi-extract/backend/services/initiative_sp_kpi_service.py services/initiative_sp_kpi_service.py
cp /tmp/sp-kpi-extract/backend/tvjira_client.py tvjira_client.py
cp /tmp/sp-kpi-extract/scripts/patch-be-story-sp-kpi-router-snippet.py scripts/patch-be-story-sp-kpi-router-snippet.py
cp /tmp/sp-kpi-extract/scripts/lib/require-be-pod.sh scripts/lib/require-be-pod.sh
chmod +x scripts/patch-be-story-sp-kpi-router-snippet.py
if ! grep -q story-sp-kpi routers/model_status.py 2>/dev/null; then
  python3 scripts/patch-be-story-sp-kpi-router-snippet.py "$ROOT"
fi
# Verify script — written here (never rely on cached /tmp or old bundle)
cat > scripts/verify-story-sp-kpi-import.py << 'ENDVERIFY'
#!/usr/bin/env python3
from services.initiative_sp_kpi_service import parse_milestone_table_from_description
hdr = "Milestone\\tSummary\\tDue date\\t\\uc608\\uc0c1 SP"
row = "M1\\tx\\t2026-01-01\\t25"
total, _ = parse_milestone_table_from_description(hdr + "\\n" + row)
assert total == 25.0, total
import main
print("OK import")
ENDVERIFY
chmod +x scripts/verify-story-sp-kpi-import.py
export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
if [ "${SKIP_VERIFY:-0}" = "1" ]; then
  echo "  skip verify (SKIP_VERIFY=1)"
else
  python3 scripts/verify-story-sp-kpi-import.py || {
    echo "  warn: verify failed — files copied; check PYTHONPATH and restart anyway"
  }
fi
if [ -x scripts/restart-be-route-port.sh ]; then sh scripts/restart-be-route-port.sh; fi
echo "Done. grep consumptionPct services/initiative_sp_kpi_service.py | head -1"
"""
script = script.replace("__B64__", b64)

out = root / "scripts/patch-be-story-sp-kpi-standalone.sh"
out.write_text(script, encoding="utf-8")
out.chmod(0o755)
print("wrote", out, out.stat().st_size, "bytes")
PY
