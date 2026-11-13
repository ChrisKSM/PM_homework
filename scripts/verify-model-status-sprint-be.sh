#!/bin/sh
# BE pod — 모델현황 스프린트 · Velocity (TV worklog / IR/SP)
#   sh scripts/verify-model-status-sprint-be.sh
#
set -e
BASE="${API_BASE:-http://127.0.0.1:8000/api}"
MODEL="${MODEL:-H7_VI}"
LABEL="${LABEL:-SoundSuite_H7(VI)}"

echo "=== verify model-status sprint (TV Jira) ==="
test -f services/model_status_sprint_service.py || { echo "  NG  services/model_status_sprint_service.py"; exit 1; }
test -f services/model_status_sprint_worklog.py || { echo "  NG  services/model_status_sprint_worklog.py — patch-be 재실행"; exit 1; }
grep -q tvjira_issue_worklog_entries tvjira_client.py 2>/dev/null \
  || { echo "  NG  tvjira_client.py worklog entries — patch-be 재실행"; exit 1; }

code_ping=$(curl -s -o /tmp/ms_sprint_ping.json -w "%{http_code}" "${BASE}/model-status/initiatives/ping" 2>/dev/null || echo "000")
echo "  GET /model-status/initiatives/ping → HTTP $code_ping"

URL="${BASE}/model-status/sprint/dashboard?model=${MODEL}&label=${LABEL}"
code=$(curl -s -o /tmp/ms_sprint_dash.json -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
echo "  GET /model-status/sprint/dashboard → HTTP $code"
if [ "$code" != "200" ]; then
  head -c 400 /tmp/ms_sprint_dash.json 2>/dev/null || true
  echo ""
  echo "  TVJIRA_API_TOKEN · GET /model-status/initiatives/ping"
  exit 1
fi

python3 <<'PY' 2>/dev/null || python <<'PY'
import json
from pathlib import Path

p = Path("/tmp/ms_sprint_dash.json")
d = json.loads(p.read_text())
meta = d.get("meta") or {}
print(f"  label={meta.get('label')} source={meta.get('source')} currentSp={meta.get('currentSp')}")
wl = d.get("worklog") or {}
print(f"  worklog totalSpLogged={wl.get('totalSpLogged')} issuesWithWorklog={wl.get('issuesWithWorklog')}")
vel = d.get("velocity") or []
nonzero = sum(1 for v in vel if (v.get('planned') or v.get('committed') or 0) > 0 or (v.get('completed') or 0) > 0)
print(f"  velocity buckets with data: {nonzero}/{len(vel)}")
bd = d.get("burndown") or {}
print(f"  burndown sprint={bd.get('sprintName')} points={len(bd.get('points') or [])}")
PY

echo "=== OK ==="
