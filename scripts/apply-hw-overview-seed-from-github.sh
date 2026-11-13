#!/bin/sh
# BE pod — GitHub 최신 overview seed(HW Event 표 반영) → Mongo overview/save
# update-hw-events-table-2026.py 없어도 됨 (repo 에 seed 이미 생성됨)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/f586d40/scripts/apply-hw-overview-seed-from-github.sh" | sh
#
#   REF_SHA=f586d40 API_BASE=http://127.0.0.1:8000/api sh scripts/apply-hw-overview-seed-from-github.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF_SHA="${REF_SHA:-f586d40}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"

echo "=== HW overview seed from git ${REF_SHA} ==="
mkdir -p scripts
curl -fsSL -H "Cache-Control: no-cache" \
  "$BASE/scripts/seed-model-schedule-overview.json" \
  -o scripts/seed-model-schedule-overview.json
echo "  + scripts/seed-model-schedule-overview.json"

python3 -c "
import json
m = next(x for x in json.load(open('scripts/seed-model-schedule-overview.json'))['models'] if x.get('model')=='H7_VI')
hw = [e for e in m.get('events',[]) if e.get('kind')=='hw']
pre = next((e for e in hw if e.get('name')=='PrePV'), {})
print('  H7_VI PrePV', pre.get('start'), pre.get('end'), '(expect 2026-09-04 2026-10-20)')
"

SEED_FILE=scripts/seed-model-schedule-overview.json API_BASE="$API_BASE" sh scripts/seed-model-schedule-overview-to-db.sh 2>/dev/null || {
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/scripts/seed-model-schedule-overview-to-db.sh" -o /tmp/seed-overview.sh
  chmod +x /tmp/seed-overview.sh
  SEED_FILE=scripts/seed-model-schedule-overview.json API_BASE="$API_BASE" sh /tmp/seed-overview.sh
}
