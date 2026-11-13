#!/bin/sh
# BE pod — Initiative Description Milestones → story-sp-kpi API
#
# Pod git remote 가 LGE 내부면 checkout 대신 curl | sh 사용.
#
#   권장 (standalone v5+ worklog, router upgrade):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/apply-model-status-summary-fe-be-patch.sh" | BE_ONLY=1 sh
#
#   구 방식 (개별 파일 fetch — router 전체 교체):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/apply-be-story-sp-kpi.sh" | sh
# router 로컬 수정 유지:
#   SKIP_ROUTER=1 curl -fsSL ".../apply-be-story-sp-kpi.sh" | sh
# 또는: .../patch-be-story-sp-kpi-service-only.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF_SHA="${REF_SHA:-cursor/model-schedule-bar-label-fix-b14b}"
SKIP_ROUTER="${SKIP_ROUTER:-0}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"

fetch() {
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== apply-be-story-sp-kpi (${REF_SHA}) ==="
mkdir -p services routers
fetch backend/services/initiative_sp_kpi_service.py services/initiative_sp_kpi_service.py
fetch backend/tvjira_client.py tvjira_client.py
if [ "$SKIP_ROUTER" = "1" ]; then
  echo "  skip routers/model_status.py (SKIP_ROUTER=1)"
else
  fetch backend/routers/model_status.py routers/model_status.py
fi

grep -q 'story-sp-kpi' routers/model_status.py || { echo "NG router missing story-sp-kpi"; exit 1; }
grep -q normalize_jira_description services/initiative_sp_kpi_service.py || exit 1
echo "  OK  routes + service"

PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"
$PY -c "from services.initiative_sp_kpi_service import parse_milestone_table_from_description; t,r=parse_milestone_table_from_description('Milestone\t예상 SP\nM1\tx\t2026-01-01\t10'); assert t==10; import main; print('  OK import main')"

if [ -x scripts/restart-be-route-port.sh ]; then
  sh scripts/restart-be-route-port.sh
else
  echo "→ sh scripts/restart-be-route-port.sh"
fi

echo ""
echo "curl -sG http://127.0.0.1:8000/api/model-status/initiatives/story-sp-kpi --data-urlencode model=H7_VI --data-urlencode label=SoundSuite_H7\\(VI\\) | python3 -m json.tool | head -40"
