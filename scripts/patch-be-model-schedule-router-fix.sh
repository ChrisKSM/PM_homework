#!/bin/sh
# BE pod — model_schedule router SyntaxError hotfix (sync try/except + debug route)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/3e4d4dc/scripts/patch-be-model-schedule-router-fix.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-3e4d4dc}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
mkdir -p routers
curl -fsSL -H "Cache-Control: no-cache" "${BASE}/backend/routers/model_schedule.py" -o routers/model_schedule.py
echo "  + routers/model_schedule.py @ ${REF}"
python3 -c "import ast; ast.parse(open('routers/model_schedule.py').read()); print('syntax OK')"
echo "Next: sh scripts/restart-be-route-port.sh"
