#!/bin/sh
# FE pod — 릴리즈 · Epic 탭 → GET /api/model-status/release/gantt 호출
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-model-status-release-gantt-patch.sh" | sh
#
# Initiative 탭만 있고 release/gantt Request 가 없으면 이 패치 필요.
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
cd "$ROOT"

mkdir -p src/api src/hooks src/types src/mocks src/data src/utils src/components/modelStatus

fetch() {
  curl -fsSL "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== FE release gantt @ $REF ==="
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

grep -q getReleaseGantt src/api/modelStatusApi.ts || { echo "NG getReleaseGantt"; exit 1; }
grep -q computeReleaseGanttKpis src/utils/releaseGanttKpi.ts && echo "OK  releaseGanttKpi"
grep -q "id: 'initiative'" src/data/modelStatusCatalog.ts && grep -q "릴리즈 · Epic" src/data/modelStatusCatalog.ts \
  && awk '/MODEL_STATUS_TABS/,/\]/' src/data/modelStatusCatalog.ts | grep -n "initiative\|release" | head -2
echo "OK  tab order (Initiative before 릴리즈 · Epic in catalog)"
grep -q useModelStatusReleaseGantt src/hooks/useModelStatusReleaseGantt.ts || { echo "NG hook"; exit 1; }
grep -q ModelStatusReleaseEpicGantt src/components/modelStatus/ModelIntegratedDashboard.tsx || { echo "NG dashboard"; exit 1; }
grep -q "release/gantt" src/api/modelStatusApi.ts && echo "OK  API path /model-status/release/gantt"
grep -q "릴리즈 · Epic" src/data/modelStatusCatalog.ts || { echo "NG  modelStatusCatalog — release tab"; exit 1; }
echo "OK  modelStatusCatalog release tab"

echo ""
echo "=== npm run build ==="
npm run build

echo ""
echo "=== Done (pod build/ 만 갱신됨) ==="
echo "  사이트 반영: git add -A && git commit -m 'feat: 모델현황 릴리즈 Epic 탭' && git push origin master"
echo "  확인: sh scripts/verify-model-status-release-fe-deployed.sh"
echo "         (pod build-version.txt = ${FE_URL:-https://react-audio.apps.axstudio.lge.com}/build-version.txt)"
echo ""
echo "  모델현황 → H7_VI → **릴리즈 · Epic** 탭"
echo "  Network: .../api/model-status/release/gantt?model=H7_VI&label=..."
echo "  (Initiatives API 와 별도 Request 1건 더 보여야 함)"
