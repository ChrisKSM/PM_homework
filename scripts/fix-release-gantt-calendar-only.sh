#!/bin/sh
# BE pod — release_gantt_service 만 갱신하고 calendar 가 구버전일 때 (import nearest_sprint_for_day 실패)
#   sh scripts/fix-release-gantt-calendar-only.sh
#   sh scripts/restart-be-route-port.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF_SHA="${REF_SHA:-1b0828e}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"
mkdir -p services
curl -fsSL -H "Cache-Control: no-cache" "$BASE/backend/services/release_sprint_calendar_2026.py" \
  -o services/release_sprint_calendar_2026.py
grep -q 'def nearest_sprint_for_day' services/release_sprint_calendar_2026.py
PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"
$PY -c "from services.release_sprint_calendar_2026 import nearest_sprint_for_day; from services import release_gantt_service; print('OK', release_gantt_service.RELEASE_GANTT_SERVICE_BUILD)"
echo "→ sh scripts/restart-be-route-port.sh"
