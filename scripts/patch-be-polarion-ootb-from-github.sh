#!/bin/sh
# BE pod — Polarion OOTB REST v1 (customs v1 → rest/v1)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/<REF>/scripts/patch-be-polarion-ootb-from-github.sh" | REF=<REF> sh
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

echo "=== Polarion OOTB REST @ $REF ==="
fetch backend/polarion_client.py polarion_client.py
fetch backend/config.py config.py
fetch backend/services/model_status_prd_service.py services/model_status_prd_service.py
fetch scripts/diagnose-polarion-pat.sh scripts/diagnose-polarion-pat.sh
fetch scripts/probe-polarion-prd-rest.sh scripts/probe-polarion-prd-rest.sh
fetch scripts/patch-be-polarion-ootb-from-github.sh scripts/patch-be-polarion-ootb-from-github.sh
chmod +x scripts/diagnose-polarion-pat.sh scripts/probe-polarion-prd-rest.sh scripts/patch-be-polarion-ootb-from-github.sh 2>/dev/null || true

if grep -q '^POLARION_BASE_URL=' .env 2>/dev/null; then
  sed -i 's|polarion/restful/customs/v1|polarion/rest/v1|g' .env 2>/dev/null || true
else
  echo 'POLARION_BASE_URL=https://alm-lge-hlm.singlex.com/polarion/rest/v1' >> .env
fi

echo ""
echo "Next:"
echo "  sh scripts/restart-be-route-port.sh"
echo "  set -a && . ./.env && set +a && sh scripts/diagnose-polarion-pat.sh"
echo "=== Done ==="
