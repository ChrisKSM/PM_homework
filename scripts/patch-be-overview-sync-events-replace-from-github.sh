#!/bin/sh
# BE pod — overview Portal sync: Mongo seed 와 merge 하지 않고 Portal events 로 교체 (QP 날짜 오류)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/02508b2/scripts/patch-be-overview-sync-events-replace-from-github.sh" | sh
#   REF=02508b2 sh scripts/patch-be-overview-sync-events-replace-from-github.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-02508b2}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== overview sync events replace @ $REF ==="
mkdir -p services
fetch backend/services/delivery_portal_overview_sync.py services/delivery_portal_overview_sync.py

if [ -f scripts/restart-be-route-port.sh ]; then
  echo ""
  echo "Restart BE:"
  echo "  sh scripts/restart-be-route-port.sh"
else
  echo ""
  echo "Restart uvicorn on port 8000, then re-sync:"
fi

echo ""
echo "Re-import schedules (audio products):"
echo "  curl -s -X POST \"http://127.0.0.1:8000/api/model-schedule/overview/sync-delivery-portal?scope=audio_products\""
echo ""
echo "Check S90C QP 1:"
echo "  curl -s http://127.0.0.1:8000/api/model-schedule/overview/load | python3 -c \""
echo "import json,sys"
echo "m=next(x for x in json.load(sys.stdin)['models'] if x.get('id')=='ov-s90c')"
echo "print([e for e in m.get('events') or [] if 'QP' in e.get('name','')])\""
echo "=== Done ==="
