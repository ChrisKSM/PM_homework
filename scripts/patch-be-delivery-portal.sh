#!/bin/sh
# BE pod — Delivery Portal 프록시 (릴리즈 Gantt)
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF="${1:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

mkdir -p routers
fetch() { curl -fsSL "$BASE/backend/$1" -o "$2" && echo "  + $2"; }

if git rev-parse "github/$REF" >/dev/null 2>&1; then
  git show "github/$REF:backend/routers/delivery_portal.py" > routers/delivery_portal.py
  git show "github/$REF:backend/config.py" > config.py
  git show "github/$REF:backend/main.py" > main.py
else
  fetch routers/delivery_portal.py routers/delivery_portal.py
  fetch config.py config.py
  fetch main.py main.py
fi

grep -q delivery_portal main.py || echo "WARN: main.py 에 delivery_portal router 없음"
echo "=== .env 예 ==="
echo "DELIVERY_PORTAL_API_TOKEN=<Davis REACT_APP DELIVERY_PORTAL_BACKEND_TOKEN 과 동일 PAT>"
echo "=== restart ==="
echo "sh scripts/restart-be-route-port.sh"
