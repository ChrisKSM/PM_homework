#!/bin/sh
# BE pod — Delivery Portal export + Mongo sync 스크립트/BE 코드 한 번에 받기
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/ef5804c/scripts/fetch-delivery-portal-pod-scripts.sh" | REF=ef5804c sh
#   REF=ef5804c sh scripts/fetch-delivery-portal-pod-scripts.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-ef5804c}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

mkdir -p scripts services routers 2>/dev/null || true

fetch() {
  repo_path="$1"
  dest="$2"
  mkdir -p "$(dirname "$dest")"
  echo "  $dest"
  curl -fsSL "${BASE}/${repo_path}" -o "$dest"
}

echo "=== Fetch Delivery Portal pod bundle (REF=${REF}) ==="

echo "-- scripts --"
fetch scripts/export-delivery-portal-catalog.py scripts/export-delivery-portal-catalog.py
fetch scripts/delivery_portal_catalog_lib.py scripts/delivery_portal_catalog_lib.py
fetch scripts/sync-overview-from-delivery-portal.sh scripts/sync-overview-from-delivery-portal.sh
fetch scripts/verify-delivery-portal-api.sh scripts/verify-delivery-portal-api.sh
fetch scripts/DELIVERY_PORTAL_OVERVIEW_MAPPING.md scripts/DELIVERY_PORTAL_OVERVIEW_MAPPING.md

echo "-- BE (overview sync API) --"
fetch backend/services/delivery_portal_client.py services/delivery_portal_client.py
fetch backend/services/delivery_portal_catalog.py services/delivery_portal_catalog.py
fetch backend/services/delivery_portal_overview_sync.py services/delivery_portal_overview_sync.py
fetch backend/routers/delivery_portal.py routers/delivery_portal.py
fetch backend/routers/model_schedule.py routers/model_schedule.py

chmod +x scripts/sync-overview-from-delivery-portal.sh scripts/verify-delivery-portal-api.sh 2>/dev/null || true

echo ""
echo "=== Next ==="
echo "  1) uvicorn 재시작 (main.py에 model_schedule router 포함 확인)"
echo "  2) overview seed 비어 있으면: sh scripts/seed-model-schedule-overview-to-db.sh"
echo "  3) DRY=1 SCOPE=audio_products API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh"
echo "=== Done ==="
