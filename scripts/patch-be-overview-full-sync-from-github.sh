#!/bin/sh
# BE pod — overview Portal sync 전체 패치 (events 교체 + multi-detail schedules + catalog lib)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/<SHA>/scripts/patch-be-overview-full-sync-from-github.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-HEAD}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== overview full sync patch @ $REF ==="
mkdir -p services scripts
fetch backend/services/delivery_portal_overview_sync.py services/delivery_portal_overview_sync.py
fetch scripts/delivery_portal_catalog_lib.py scripts/delivery_portal_catalog_lib.py
fetch backend/services/delivery_portal_catalog.py services/delivery_portal_catalog.py

echo ""
echo "  sh scripts/restart-be-route-port.sh"
echo "  curl -s -X POST \"http://127.0.0.1:8000/api/model-schedule/overview/sync-delivery-portal?scope=audio_products\""
echo "=== Done ==="
