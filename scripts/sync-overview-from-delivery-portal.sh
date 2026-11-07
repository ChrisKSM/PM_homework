#!/bin/sh
# BE pod — Delivery Portal → Mongo overview sync
#
# 스크립트 없으면:
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/ef5804c/scripts/fetch-delivery-portal-pod-scripts.sh" | REF=ef5804c sh
#
#   API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
#   DRY=1 SCOPE=audio_products API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
# linked = PO 5건 UUID. audio_products = Audio_Earbud/Others/Soundbar/Speaker 전체
SCOPE="${SCOPE:-linked}"
QS="?scope=${SCOPE}"
[ -n "$DRY" ] && QS="${QS}&dry_run=true"

echo "=== POST $API_BASE/model-schedule/overview/sync-delivery-portal$QS ==="
HTTP=$(curl -sS -w "%{http_code}" -o /tmp/sync_overview_resp.json -X POST "$API_BASE/model-schedule/overview/sync-delivery-portal$QS")
if [ "$HTTP" = "404" ]; then
  echo "HTTP 404 — overview Mongo 비어 있음. seed 후 재시도:" >&2
  echo "  sh scripts/seed-model-schedule-overview-to-db.sh" >&2
  cat /tmp/sync_overview_resp.json | python3 -m json.tool 2>/dev/null || cat /tmp/sync_overview_resp.json
  exit 1
fi
if [ "$HTTP" != "200" ]; then
  echo "HTTP $HTTP" >&2
  cat /tmp/sync_overview_resp.json | python3 -m json.tool 2>/dev/null || cat /tmp/sync_overview_resp.json
  exit 1
fi
python3 -m json.tool /tmp/sync_overview_resp.json

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
