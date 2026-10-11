#!/bin/sh
# BE pod 전용 — service + tvjira + (optional) router + restart
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/dd2494d/scripts/patch-be-story-sp-kpi-on-be-pod.sh" | sh
#   REF_SHA=b12f4be FETCH_ROUTER=1 curl -fsSL "..." | sh
set -e
REF_SHA="${REF_SHA:-dd2494d}"
FETCH_ROUTER="${FETCH_ROUTER:-0}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/lib/require-be-pod.sh" ]; then
  # shellcheck source=/dev/null
  . "$SCRIPT_DIR/lib/require-be-pod.sh"
else
  fetch_lib() {
    curl -fsSL -H "Cache-Control: no-cache" "$BASE/scripts/lib/require-be-pod.sh" -o /tmp/require-be-pod.sh
  }
  fetch_lib
  # shellcheck source=/tmp/require-be-pod.sh
  . /tmp/require-be-pod.sh
fi
require_be_pod "$ROOT"

fetch_one() {
  url="$1"
  out="$2"
  if curl -fsSL -H "Cache-Control: no-cache" --connect-timeout 15 "$url" -o "$out"; then
    return 0
  fi
  return 1
}

fetch() {
  rel="$1"
  out="$2"
  for base in \
    "$BASE" \
    "https://cdn.jsdelivr.net/gh/ChrisKSM/PM_homework@d98e756" \
    "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b" \
    "https://raw.githubusercontent.com/ChrisKSM/PM_homework/d98e756"; do
    if fetch_one "$base/$rel" "$out"; then
      echo "  + $out  (← $base)"
      return 0
    fi
  done
  echo "NG: fetch failed $rel (GitHub raw 404/차단?)"
  echo "    → BE pod에서: sh scripts/patch-be-story-sp-kpi-standalone.sh"
  echo "    → 또는 GitHub에서 scripts/patch-be-story-sp-kpi-standalone.sh 를 scp 후 실행"
  exit 1
}

echo "=== patch-be-story-sp-kpi-on-be-pod (${REF_SHA}) hostname=$(hostname) ==="
mkdir -p services routers scripts/lib

fetch backend/services/initiative_sp_kpi_service.py services/initiative_sp_kpi_service.py
fetch backend/tvjira_client.py tvjira_client.py

if [ "$FETCH_ROUTER" = "1" ]; then
  fetch backend/routers/model_status.py routers/model_status.py
elif ! grep -q 'story-sp-kpi' routers/model_status.py 2>/dev/null; then
  fetch scripts/patch-be-story-sp-kpi-router-snippet.py scripts/patch-be-story-sp-kpi-router-snippet.py
  python3 scripts/patch-be-story-sp-kpi-router-snippet.py "$ROOT"
fi

grep -q normalize_jira_description services/initiative_sp_kpi_service.py
grep -q consumptionPct services/initiative_sp_kpi_service.py || echo "  warn: old service ref — bump REF_SHA"

export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
PY="python3"
command -v uv >/dev/null 2>&1 && PY="uv run --frozen python"
$PY -c "
from services.initiative_sp_kpi_service import parse_milestone_table_from_description
t,r=parse_milestone_table_from_description('마일스톤\t산출물\t예상 SP\nM1\tdeliver\t25')
assert t==25.0, t
import main
print('  OK  import main + korean header parse')
"

if [ -x scripts/restart-be-route-port.sh ]; then
  sh scripts/restart-be-route-port.sh
fi

echo ""
echo "sh scripts/verify-story-sp-kpi-be.sh  # or curl :8000/api/model-status/initiatives/story-sp-kpi ..."
