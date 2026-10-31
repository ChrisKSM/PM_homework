#!/bin/sh
# AxStudio variables.get 지원 — dej_sdk (os.getenv → variables.get)
#
# BE pod:
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-be-dej-variables-from-github.sh" | sh
#
# 확인 후 Publish / Rollout:
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-be-public-env.sh
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT" 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f main.py ]; then
  echo "SKIP: BE pod 아님 (main.py 없음) — cwd=$(pwd)"
  exit 0
fi

mkdir -p routers services scripts tests

fetch_flat() {
  # $1 = repo path backend/..., $2 = pod flat path
  if ! curl -fsSL "$BASE/$1" -o "$2"; then
    echo "ERROR: fetch $BASE/$1" >&2
    exit 1
  fi
  echo "  + $2"
}

echo "=== patch dej_sdk variables.get @ $REF ==="
fetch_flat backend/dej_variables.py dej_variables.py
fetch_flat backend/jira_client.py jira_client.py
fetch_flat backend/tvjira_client.py tvjira_client.py
fetch_flat backend/config.py config.py
fetch_flat backend/polarion_client.py polarion_client.py
fetch_flat backend/services/delivery_portal_client.py services/delivery_portal_client.py
fetch_flat backend/routers/model_status.py routers/model_status.py
fetch_flat backend/services/initiative_sp_kpi_service.py services/initiative_sp_kpi_service.py
fetch_flat backend/services/model_status_initiative_service.py services/model_status_initiative_service.py
fetch_flat backend/services/release_gantt_service.py services/release_gantt_service.py
fetch_flat scripts/diagnose-be-public-env.sh scripts/diagnose-be-public-env.sh
chmod +x scripts/diagnose-be-public-env.sh 2>/dev/null || true

echo ""
echo "=== dej_sdk ==="
if python3 -c "from dej_sdk import variables" 2>/dev/null; then
  echo "  OK  dej_sdk.variables"
  python3 <<'PY'
from dej_variables import dej_get, dej_sdk_variables_available
print("  dej_sdk_variables_available:", dej_sdk_variables_available())
for k in ("JIRA_API_TOKEN", "TVJIRA_API_TOKEN", "POLARION_PAT"):
    print(f"  variables.get {k} length={len(dej_get(k))}")
PY
else
  echo "  WARN dej_sdk import failed — AxStudio BE 이미지 확인"
fi

echo ""
echo "=== runtime token (Harmony / TV) ==="
python3 <<'PY'
from jira_client import _token_source_info
from tvjira_client import tvjira_token_source_info
s, n = _token_source_info()
ts, tn = tvjira_token_source_info()
print(f"  Harmony source={s} length={n}")
print(f"  TV Jira source={ts} length={tn}")
PY

echo ""
echo "=== next ==="
echo "  1) IDE에서 /api/jira/diagnose · initiatives/ping 확인"
echo "  2) Publish (공용 be-audio-test-dpl Rollout)"
echo "  3) API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-be-public-env.sh"
