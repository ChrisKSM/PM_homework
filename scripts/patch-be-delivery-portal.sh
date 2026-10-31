#!/bin/sh
# BE pod — Delivery Portal 프록시 (all_deliveries_data, program-report)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-be-delivery-portal.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== BE Delivery Portal @ $REF (GitHub raw) ==="
fetch backend/routers/delivery_portal.py routers/delivery_portal.py
fetch scripts/verify-delivery-portal-api.sh scripts/verify-delivery-portal-api.sh
fetch scripts/restart-be-route-port.sh scripts/restart-be-route-port.sh
fetch scripts/be-restart-uvicorn-standalone.sh scripts/be-restart-uvicorn-standalone.sh
chmod +x scripts/verify-delivery-portal-api.sh scripts/restart-be-route-port.sh scripts/be-restart-uvicorn-standalone.sh 2>/dev/null || true

# main.py — delivery_portal router (append hint only; full main.py 덮어쓰기는 위험)
if [ -f main.py ] && ! grep -q delivery_portal main.py 2>/dev/null; then
  echo "  WARN main.py에 delivery_portal router 없음 — 수동 include 또는 BE main.py 패치 필요"
else
  echo "  OK  main.py delivery_portal 참조"
fi

mkdir -p /usr/app/src 2>/dev/null || true
[ -f .env ] && cp .env /usr/app/src/.env 2>/dev/null || true

echo ""
echo "=== .env (hedej 예) ==="
grep -q '^DELIVERY_PORTAL_BASE_URL=' .env 2>/dev/null || echo 'DELIVERY_PORTAL_BASE_URL=https://delivery-portal-backend.apps.hedej.lge.com' >> .env
grep -q '^DELIVERY_PORTAL_API_TOKEN=' .env 2>/dev/null || echo 'DELIVERY_PORTAL_API_TOKEN=' >> .env
grep -q '^DELIVERY_PORTAL_VERIFY_SSL=' .env 2>/dev/null || echo 'DELIVERY_PORTAL_VERIFY_SSL=true' >> .env
echo "  DELIVERY_PORTAL_API_TOKEN=<JWT> 설정 후 verify 실행"

echo ""
echo "=== Next ==="
echo "  sh scripts/restart-be-route-port.sh"
echo "  sh scripts/verify-delivery-portal-api.sh direct"
echo "  sh scripts/verify-delivery-portal-api.sh proxy"
echo "=== Done ==="
