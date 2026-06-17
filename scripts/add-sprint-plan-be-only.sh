#!/bin/sh
# BE — Release/Sprint Plan API (Epic·Story Gantt + RISK)
#
# be-audio-test pod (/workspace/project):
#   git fetch github webpack-migration
#   sh scripts/add-sprint-plan-be-only.sh github/webpack-migration
#   sh scripts/verify-sprint-plan-be.sh
#   # uvicorn 재시작

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Add sprint-plan BE from $REF ==="

mkdir -p routers services scripts

for f in \
  backend/routers/sprint_plan.py:routers/sprint_plan.py \
  backend/services/sprint_plan_service.py:services/sprint_plan_service.py \
  backend/services/sprint_plan_forecast_service.py:services/sprint_plan_forecast_service.py \
  scripts/patch-be-main-sprint-plan.sh:scripts/patch-be-main-sprint-plan.sh \
  scripts/verify-sprint-plan-be.sh:scripts/verify-sprint-plan-be.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  chmod +x "$dst" 2>/dev/null || true
  echo "  + $dst"
done

echo ""
echo "=== main.py 패치 ==="
sh scripts/patch-be-main-sprint-plan.sh

echo ""
echo "=== import 테스트 ==="
python3 -c "from services import sprint_plan_service, sprint_plan_forecast_service; from routers import sprint_plan; print('OK', sprint_plan.router.prefix)" 2>/dev/null \
  || python -c "from services import sprint_plan_service, sprint_plan_forecast_service; from routers import sprint_plan; print('OK', sprint_plan.router.prefix)"

echo ""
echo "=== 다음 ==="
echo "  sh scripts/verify-sprint-plan-be.sh"
echo "  uvicorn main:app 재시작"
echo "=== Done ==="
