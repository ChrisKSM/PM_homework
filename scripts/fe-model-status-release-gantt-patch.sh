#!/bin/sh
# FE pod — 릴리즈 · Epic 탭 (9 Initiative · [Demo] Epic · 전체 Milestone KPI)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/b2ea452/scripts/fe-model-status-release-gantt-patch.sh" | sh
#
# 또는:
#   REF_SHA=f63d5d8 sh scripts/fe-model-status-release-gantt-patch.sh
set -e
ROOT="${ROOT:-/workspace/project}"
REF_SHA="${REF_SHA:-b2ea452}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
cd "$ROOT"

mkdir -p src/api src/hooks src/types src/mocks src/data src/utils src/components/modelStatus

fetch() {
  curl -fsSL -H "Cache-Control: no-cache" -H "Pragma: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== FE release gantt @ git $REF_SHA ==="
fetch src/data/modelStatusCatalog.ts src/data/modelStatusCatalog.ts
fetch src/types/modelStatusReleaseGantt.ts src/types/modelStatusReleaseGantt.ts
fetch src/data/releaseSprintCalendar2026.ts src/data/releaseSprintCalendar2026.ts
fetch src/mocks/mockModelReleaseEpicGantt.ts src/mocks/mockModelReleaseEpicGantt.ts
fetch src/hooks/useModelStatusReleaseGantt.ts src/hooks/useModelStatusReleaseGantt.ts
fetch src/components/modelStatus/ModelStatusReleaseEpicGantt.tsx src/components/modelStatus/ModelStatusReleaseEpicGantt.tsx
fetch src/api/modelStatusApi.ts src/api/modelStatusApi.ts
fetch src/components/modelStatus/ModelIntegratedDashboard.tsx src/components/modelStatus/ModelIntegratedDashboard.tsx
fetch src/utils/releaseGanttKpi.ts src/utils/releaseGanttKpi.ts
fetch webpack.config.js webpack.config.js

echo ""
echo "=== verify ==="
grep -q getReleaseGantt src/api/modelStatusApi.ts || { echo "NG getReleaseGantt"; exit 1; }
grep -q 'all_initiatives' src/api/modelStatusApi.ts && echo "OK  all_initiatives param" || { echo "NG all_initiatives"; exit 1; }
grep -q 'true,' src/hooks/useModelStatusReleaseGantt.ts && echo "OK  hook requests all initiatives" || echo "!!  hook all_initiatives — REF 확인"
grep -q syncEpicMilestonesFromGlobal src/utils/releaseGanttKpi.ts && echo "OK  syncEpicMilestonesFromGlobal" || { echo "NG releaseGanttKpi sync"; exit 1; }
grep -q 'demoEpicCount' src/components/modelStatus/ModelStatusReleaseEpicGantt.tsx && echo "OK  9 demo epic header" || { echo "NG ModelStatusReleaseEpicGantt"; exit 1; }
grep -q computeReleaseGanttKpis src/utils/releaseGanttKpi.ts && echo "OK  releaseGanttKpi KPI"
grep -q useModelStatusReleaseGantt src/hooks/useModelStatusReleaseGantt.ts || { echo "NG hook"; exit 1; }
grep -q ModelStatusReleaseEpicGantt src/components/modelStatus/ModelIntegratedDashboard.tsx || { echo "NG dashboard"; exit 1; }
grep -q "release/gantt" src/api/modelStatusApi.ts && echo "OK  API /model-status/release/gantt"
grep -q "릴리즈 · Epic" src/data/modelStatusCatalog.ts || { echo "NG modelStatusCatalog release tab"; exit 1; }
echo "OK  modelStatusCatalog release tab"

echo ""
echo "=== npm run build ==="
npm run build

echo ""
echo "=== Done (pod build/ 갱신) ==="
echo "  사이트 반영: git add -A && git commit -m 'feat: 릴리즈 Gantt 9 Initiative [Demo] Epic' && git push origin master"
echo "  확인: sh scripts/verify-model-status-release-fe-deployed.sh"
echo ""
echo "  모델현황 → H7_VI → 릴리즈 · Epic"
echo "  Network: .../release/gantt?model=H7_VI&label=...&all_initiatives=true"
echo "  BE: curl -fsSL .../b2ea452/scripts/apply-be-release-gantt-v3.sh | sh && restart-be-route-port.sh"
