#!/bin/sh
# BE pod — ImportError: cannot import name 'release_gantt_service' from 'services'
# (routers/model_status.py 만 갱신되고 service 파일이 없을 때)
#
#   sh scripts/fix-release-gantt-missing.sh
#   sh scripts/restart-be-route-port.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

echo "=== fix release gantt services (ref $REF) ==="
mkdir -p services routers scripts

fetch() {
  curl -fsSL "$BASE/$1" -o "$2"
  echo "  + $2"
}

fetch backend/jira_client.py jira_client.py
fetch backend/tvjira_client.py tvjira_client.py
fetch backend/services/release_gantt_service.py services/release_gantt_service.py
fetch backend/services/release_sprint_calendar_2026.py services/release_sprint_calendar_2026.py
fetch backend/routers/model_status.py routers/model_status.py

echo ""
echo "=== route check ==="
grep -q 'release/gantt' routers/model_status.py && grep -q 'release/discover' routers/model_status.py \
  && echo "  OK  release/* routes in model_status.py" \
  || { echo "  NG  model_status.py missing release routes"; exit 1; }

PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"

echo ""
echo "=== import check ==="
test -f services/release_gantt_service.py
test -f services/release_sprint_calendar_2026.py
$PY -c "import tvjira_client; from services import release_gantt_service; import main; print('  OK  main:app import')"
$PY -c "from services.release_sprint_calendar_2026 import calendar_payload; assert calendar_payload()['sprintMax']==26; print('  OK  release calendar SP26')"

echo ""
echo "=== Done — restart ==="
echo "  sh scripts/restart-be-route-port.sh"
