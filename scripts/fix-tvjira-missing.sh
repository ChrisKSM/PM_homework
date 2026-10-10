#!/bin/sh
# BE pod — ModuleNotFoundError: tvjira_client (uvicorn 503)
#   sh scripts/fix-tvjira-missing.sh
#   sh scripts/restart-be-route-port.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

echo "=== fix tvjira_client + Initiative service (ref $REF) ==="
mkdir -p services routers scripts

fetch() {
  curl -fsSL "$BASE/$1" -o "$2"
  echo "  + $2"
}

fetch backend/tvjira_client.py tvjira_client.py
fetch backend/jira_client.py jira_client.py
fetch backend/config.py config.py
fetch backend/services/model_status_initiative_service.py services/model_status_initiative_service.py
fetch backend/routers/model_status.py routers/model_status.py

PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"

echo ""
echo "=== import check ==="
if grep -q '^from tvjira_client import' services/model_status_initiative_service.py 2>/dev/null; then
  echo "  NG  services/model_status_initiative_service.py still has top-level tvjira import"
  exit 1
fi
$PY -c "import tvjira_client; import services.model_status_initiative_service; import main; print('  OK  main:app import')"

echo ""
echo "=== Done — restart ==="
echo "  sh scripts/restart-be-route-port.sh"
