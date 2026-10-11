#!/bin/sh
# BE pod — 릴리즈 Gantt API (/api/model-status/release/*) 검증
#   sh scripts/verify-model-status-release-be.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
PORT="${BE_ROUTE_PORT:-8000}"
BASE="http://127.0.0.1:${PORT}"

echo "=== model_status router file ==="
if grep -q 'release/gantt' routers/model_status.py 2>/dev/null; then
  echo "  OK  routers/model_status.py has release/gantt"
else
  echo "  NG  routers/model_status.py missing release routes"
  echo "      curl raw .../backend/routers/model_status.py -o routers/model_status.py"
  exit 1
fi

test -f services/release_gantt_service.py || { echo "  NG  services/release_gantt_service.py missing"; exit 1; }
test -f services/release_sprint_calendar_2026.py || { echo "  NG  services/release_sprint_calendar_2026.py missing"; exit 1; }

echo ""
echo "=== HTTP $BASE ==="
code_ping=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/model-status/initiatives/ping")
echo "  initiatives/ping  HTTP ${code_ping}"

code_cal=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/model-status/release/calendar")
echo "  release/calendar  HTTP ${code_cal}"

code_gantt=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/model-status/release/gantt?model=H7_VI&label=SoundSuite_H7(VI)")
echo "  release/gantt       HTTP ${code_gantt}"

code_disc=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/model-status/release/discover?model=H7_VI&label=SoundSuite_H7(VI)")
echo "  release/discover    HTTP ${code_disc}"

if [ "$code_cal" != "200" ] || [ "$code_gantt" != "200" ]; then
  echo ""
  echo "  NG  release API not OK — patch router + services then restart-be-route-port.sh"
  exit 1
fi

echo ""
echo "=== release/gantt meta (epicCount) ==="
curl -s "${BASE}/api/model-status/release/gantt?model=H7_VI&label=SoundSuite_H7(VI)&refresh=true" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); m=d.get('meta',{}); print('  epicCount=', m.get('epicCount'), 'milestoneCount=', m.get('milestoneCount'))" \
  || true

echo ""
echo "=== Done ==="
