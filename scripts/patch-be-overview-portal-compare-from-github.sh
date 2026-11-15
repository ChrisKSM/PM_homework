#!/bin/sh
# BE pod — 전 모델 일정 ↔ Delivery Portal 날짜 비교 API + 확정 program 우선 sync
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-be-overview-portal-compare-from-github.sh" | sh
#
# Mongo 는 바꾸지 않음. 비교표 확인 후 화면 일정을 Portal 로 맞추려면 sync 를 따로 실행.
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT" 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f main.py ] || [ ! -d routers ]; then
  echo "SKIP: BE pod 아님 — cwd=$(pwd)"
  exit 0
fi

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL -H "Cache-Control: no-cache" --connect-timeout 15 --max-time 120 "$BASE/$1" -o "$2" || {
    echo "ERROR: fetch $1" >&2
    exit 1
  }
  echo "  + $2"
}

echo "=== overview ↔ Delivery Portal compare @ $REF ==="
fetch backend/services/delivery_portal_overview_sync.py services/delivery_portal_overview_sync.py
fetch backend/routers/model_schedule.py routers/model_schedule.py
fetch scripts/delivery_portal_catalog_lib.py scripts/delivery_portal_catalog_lib.py
fetch scripts/compare-overview-vs-delivery-portal.sh scripts/compare-overview-vs-delivery-portal.sh

PY="${PY:-python3}"
command -v "$PY" >/dev/null 2>&1 || PY=python
"$PY" -c "from services.delivery_portal_overview_sync import compare_overview_with_portal, OVERVIEW_SYNC_LOGIC_VERSION as v; print('  OK  import', v)"
"$PY" -c "import routers.model_schedule" && echo "  OK  routers.model_schedule"

if [ -f scripts/restart-be-route-port.sh ]; then
  sh scripts/restart-be-route-port.sh
elif [ -f scripts/restart-be.sh ]; then
  sh scripts/restart-be.sh
else
  echo "  (restart 스크립트 없음 — uvicorn 수동 재시작 후 아래 비교 명령 실행)"
  exit 0
fi

sleep 3
echo ""
echo "=== 비교표 (Mongo 변경 없음) ==="
sh scripts/compare-overview-vs-delivery-portal.sh || true
echo ""
echo "불일치만:   ONLY_DIFF=1 sh scripts/compare-overview-vs-delivery-portal.sh"
echo "Portal 로 맞추기: curl -s -X POST \"http://127.0.0.1:8000/api/model-schedule/overview/sync-delivery-portal?scope=audio_products\""
echo "=== Done ==="
