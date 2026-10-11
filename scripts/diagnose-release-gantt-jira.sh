#!/bin/sh
# BE pod — Initiative / Epic / Milestone 단계별 Jira 건수 + Gantt API 요약
#   sh scripts/diagnose-release-gantt-jira.sh
#   MODEL=H7_VI LABEL='SoundSuite_H7(VI)' sh scripts/diagnose-release-gantt-jira.sh
set -e
BASE="${BE_LOCAL:-http://127.0.0.1:8000}"
MODEL="${MODEL:-H7_VI}"
LABEL="${LABEL:-SoundSuite_H7(VI)}"

echo "=== health ==="
curl -sf "${BASE}/health" >/dev/null && echo "  OK  ${BASE}/health" || {
  echo "  NG  uvicorn 8000 — sh scripts/restart-be-route-port.sh"
  exit 1
}

echo ""
echo "=== step counts (Jira, no full Gantt payload) ==="
curl -sG "${BASE}/api/model-status/release/gantt/diagnose-counts" \
  --data-urlencode "model=${MODEL}" \
  --data-urlencode "label=${LABEL}" \
  | python3 -m json.tool

echo ""
echo "=== release/gantt (all_initiatives=true) ==="
curl -sG "${BASE}/api/model-status/release/gantt" \
  --data-urlencode "model=${MODEL}" \
  --data-urlencode "label=${LABEL}" \
  --data-urlencode "all_initiatives=true" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'meta' not in d:
    print('NO META — detail:', d.get('detail', d))
    sys.exit(1)
m = d['meta']
print('  initiativeCount', m.get('initiativeCount'), 'scope', len(m.get('scopeInitiativeKeys') or []))
print('  epicCount', m.get('epicCount'), 'milestoneCount', m.get('milestoneCount'))
print('  milestoneFixVersion', m.get('milestoneFixVersion'))
errs = m.get('errors') or []
print('  errors', len(errs))
for e in errs[:5]:
    print('   -', e[:160])
print('  epic keys (first 8)', [e.get('issueKey') for e in (d.get('epics') or [])[:8]])
print('  milestone keys (first 10)', [x.get('issueKey') for x in (d.get('milestones') or [])[:10]])
"
