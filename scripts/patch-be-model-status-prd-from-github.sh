#!/bin/sh
# BE pod — 모델현황 PRD ALM 조회 (Polarion / davis-db-api)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/REF/scripts/patch-be-model-status-prd-from-github.sh" | REF=REF sh
#   REF=main sh scripts/patch-be-model-status-prd-from-github.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== model-status PRD @ $REF ==="
fetch backend/services/model_status_prd_service.py backend/services/model_status_prd_service.py
fetch backend/tests/test_model_status_prd.py backend/tests/test_model_status_prd.py
fetch backend/routers/model_status.py backend/routers/model_status.py
fetch backend/config.py backend/config.py
fetch backend/polarion_client.py backend/polarion_client.py
fetch scripts/verify-model-status-prd-fetch.sh scripts/verify-model-status-prd-fetch.sh

if [ -f scripts/restart-be-route-port.sh ]; then
  sh scripts/restart-be-route-port.sh
elif [ -f scripts/restart-be.sh ]; then
  sh scripts/restart-be.sh
else
  echo "  (restart script 없음 — uvicorn 수동 재시작)"
fi

echo "=== probe H7_VI ==="
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
sh scripts/verify-model-status-prd-fetch.sh || true

echo "=== patch-be-model-status-prd done ==="
