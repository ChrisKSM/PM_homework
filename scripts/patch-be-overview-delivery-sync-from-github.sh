#!/bin/sh
# BE pod — Delivery Portal → overview Mongo sync API
# REF=241e848 or latest commit SHA
set -e
cd /workspace/project 2>/dev/null || exit 1
REF="${REF:-241e848}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
fetch() { mkdir -p "$(dirname "$2")"; curl -fsSL "$BASE/$1" -o "$2"; echo "  + $2"; }
echo "=== overview delivery sync @ $REF ==="
fetch backend/services/delivery_portal_client.py services/delivery_portal_client.py
fetch backend/services/delivery_portal_overview_sync.py services/delivery_portal_overview_sync.py
fetch backend/routers/delivery_portal.py routers/delivery_portal.py
fetch backend/routers/model_schedule.py routers/model_schedule.py
fetch scripts/sync-overview-from-delivery-portal.sh scripts/sync-overview-from-delivery-portal.sh
fetch scripts/DELIVERY_PORTAL_OVERVIEW_MAPPING.md scripts/DELIVERY_PORTAL_OVERVIEW_MAPPING.md
chmod +x scripts/sync-overview-from-delivery-portal.sh 2>/dev/null || true
echo "Next: sh scripts/restart-be-route-port.sh && DRY=1 API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh"
