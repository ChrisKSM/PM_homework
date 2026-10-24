#!/bin/sh
# BE pod — Delivery Portal → Mongo overview sync
#
#   API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
#   DRY=1 sh scripts/sync-overview-from-delivery-portal.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
QS=""
[ -n "$DRY" ] && QS="?dry_run=true"

echo "=== POST $API_BASE/model-schedule/overview/sync-delivery-portal$QS ==="
curl -sf -X POST "$API_BASE/model-schedule/overview/sync-delivery-portal$QS" | python3 -m json.tool

echo ""
echo "=== Verify H7_VI events ==="
curl -sf "$API_BASE/model-schedule/overview/load" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for m in d.get('models') or []:
    if m.get('id') in ('ov-h7-vi','ov-m7-vi','ov-s90c','ov-h7-mr10-11','ov-h5'):
        print(m['id'], 'events', len(m.get('events') or []), 'soc', m.get('soc'))
ids=[m.get('id') for m in d.get('models') or []]
print('ov-m5-vi present:', 'ov-m5-vi' in ids)
"
