#!/bin/sh
# BE pod — Delivery Portal (GitHub raw, git show 사용 안 함)
#
# 브랜치 raw CDN 캐시 이슈 시 REF=커밋 SHA 로 고정:
#   REF=c595c95 sh /tmp/patch-be-delivery-portal-from-github.sh
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/726bfc5/scripts/patch-be-delivery-portal-from-github.sh" -o /tmp/p.sh && sh /tmp/p.sh
#
set -e
cd /workspace/project 2>/dev/null || exit 1
REF="${REF:-726bfc5}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== BE Delivery Portal @ commit/ref $REF ==="
fetch backend/routers/delivery_portal.py routers/delivery_portal.py
fetch scripts/verify-delivery-portal-api.sh scripts/verify-delivery-portal-api.sh
fetch scripts/export-delivery-portal-catalog.py scripts/export-delivery-portal-catalog.py
fetch scripts/DELIVERY_PORTAL_DATA_SCHEMA.md scripts/DELIVERY_PORTAL_DATA_SCHEMA.md
fetch scripts/restart-be-route-port.sh scripts/restart-be-route-port.sh
fetch scripts/be-restart-uvicorn-standalone.sh scripts/be-restart-uvicorn-standalone.sh
chmod +x scripts/verify-delivery-portal-api.sh scripts/restart-be-route-port.sh scripts/be-restart-uvicorn-standalone.sh 2>/dev/null || true

if [ -f main.py ] && grep -q delivery_portal main.py 2>/dev/null; then
  echo "  OK  main.py delivery_portal"
else
  fetch scripts/ensure-be-delivery-portal-router.sh scripts/ensure-be-delivery-portal-router.sh
  chmod +x scripts/ensure-be-delivery-portal-router.sh 2>/dev/null || true
  sh scripts/ensure-be-delivery-portal-router.sh
fi

mkdir -p /usr/app/src 2>/dev/null || true
[ -f .env ] && cp .env /usr/app/src/.env 2>/dev/null || true

touch .env 2>/dev/null || true
grep -q '^DELIVERY_PORTAL_BASE_URL=' .env 2>/dev/null || echo 'DELIVERY_PORTAL_BASE_URL=https://delivery-portal-backend.apps.hedej.lge.com' >> .env
grep -q '^DELIVERY_PORTAL_API_TOKEN=' .env 2>/dev/null || echo 'DELIVERY_PORTAL_API_TOKEN=' >> .env
grep -q '^DELIVERY_PORTAL_VERIFY_SSL=' .env 2>/dev/null || echo 'DELIVERY_PORTAL_VERIFY_SSL=true' >> .env

echo ""
echo "Next: sh scripts/restart-be-route-port.sh && sh scripts/verify-delivery-portal-api.sh direct"
echo "=== Done ==="
