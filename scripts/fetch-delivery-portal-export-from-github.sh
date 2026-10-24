#!/bin/sh
# BE pod — export 스크립트 + catalog lib (backend 불필요)
#
#   REF=e8121df sh scripts/fetch-delivery-portal-export-from-github.sh
#   REF=cursor/model-schedule-bar-label-fix-b14b sh scripts/fetch-delivery-portal-export-from-github.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  name="$1"
  echo "  $name"
  curl -fsSL "${BASE}/scripts/${name}" -o "scripts/${name}"
}

echo "=== Fetch Delivery Portal export (REF=${REF}) ==="
fetch export-delivery-portal-catalog.py
fetch delivery_portal_catalog_lib.py
chmod +x scripts/fetch-delivery-portal-export-from-github.sh 2>/dev/null || true
echo "=== Done — run verify + export ==="
