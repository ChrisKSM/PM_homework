#!/bin/sh
# FE pod — 모델현황 요약 + 전 모델 일정 mock(H7/H5 SW) + status 페이지 안정화
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-model-status-summary-kpi-patch.sh?v=3" | sh
#
# 포함: KPI-1 소수 1자리, HW/SW 타임라인, story-sp-kpi 클라이언트, modelStatusDisabled,
#       overview mock(SIT/FC1), ErrorBoundary·build-version reload guard
#
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
cd "$ROOT"

if [ ! -f package.json ] || [ ! -d src ]; then
  echo "NG: react-audio FE pod only (package.json + src/)"
  exit 1
fi

mkdir -p scripts src/data src/utils src/types src/hooks src/api src/components/modelStatus src/pages src/components

fetch() {
  if ! curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"; then
    echo "ERROR: fetch failed — $BASE/$1" >&2
    exit 1
  fi
  echo "  + $2"
}

echo "=== FE model-status summary (timeline + SP KPI) @ $REF ==="

fetch src/utils/modelStatusMilestones.ts src/utils/modelStatusMilestones.ts
fetch src/components/modelStatus/ModelStatusOverviewEventTimeline.tsx src/components/modelStatus/ModelStatusOverviewEventTimeline.tsx
fetch src/components/modelStatus/ModelIntegratedDashboard.tsx src/components/modelStatus/ModelIntegratedDashboard.tsx
fetch src/components/modelStatus/ModelStatusReleaseEpicGantt.tsx src/components/modelStatus/ModelStatusReleaseEpicGantt.tsx
fetch src/components/modelStatus/ModelStatusEventsTable.tsx src/components/modelStatus/ModelStatusEventsTable.tsx
fetch src/types/modelStatusStorySpKpi.ts src/types/modelStatusStorySpKpi.ts
fetch src/hooks/useModelStatusStorySpKpi.ts src/hooks/useModelStatusStorySpKpi.ts
fetch src/api/modelStatusApi.ts src/api/modelStatusApi.ts
fetch src/utils/releaseGanttKpi.ts src/utils/releaseGanttKpi.ts
fetch src/utils/modelScheduleOverviewRows.ts src/utils/modelScheduleOverviewRows.ts
fetch src/data/modelStatusCatalog.ts src/data/modelStatusCatalog.ts
fetch src/utils/modelStatusDisabled.ts src/utils/modelStatusDisabled.ts
fetch src/pages/ModelScheduleStatusPage.tsx src/pages/ModelScheduleStatusPage.tsx
fetch src/data/modelScheduleOverviewMock.ts src/data/modelScheduleOverviewMock.ts
fetch src/main.tsx src/main.tsx
fetch src/components/ErrorBoundary.tsx src/components/ErrorBoundary.tsx

fetch scripts/verify-model-status-summary-fe-deployed.sh scripts/verify-model-status-summary-fe-deployed.sh
chmod +x scripts/verify-model-status-summary-fe-deployed.sh

grep -q buildOverviewEventsTimeline src/utils/modelStatusMilestones.ts && echo "OK  HW/SW overview timeline"
grep -q ModelStatusOverviewEventTimeline src/components/modelStatus/ModelIntegratedDashboard.tsx && echo "OK  summary dashboard wiring"
grep -q getStorySpKpi src/api/modelStatusApi.ts && echo "OK  story-sp-kpi API client"
grep -q SP26 src/components/modelStatus/ModelStatusReleaseEpicGantt.tsx && echo "OK  release tab SP26 label (not summary KPI-1)"
grep -q isModelStatusModelDisabled src/utils/modelStatusDisabled.ts && echo "OK  modelStatusDisabled util"
grep -q modelStatusDisabled src/pages/ModelScheduleStatusPage.tsx && echo "OK  status page imports util"
grep -q '2026-08-13' src/data/modelScheduleOverviewMock.ts && echo "OK  H7/H5 SIT1 mock dates"
grep -q 'toFixed(1)' src/components/modelStatus/ModelIntegratedDashboard.tsx && echo "OK  KPI-1 one decimal"

npm run build 2>&1 | tee /tmp/fe-summary-build.log
if grep -q "isModelStatusModelDisabled" /tmp/fe-summary-build.log; then
  echo "NG: webpack export warning — modelStatusCatalog.ts 와 utils/modelStatusDisabled.ts 를 함께 반영했는지 확인" >&2
  exit 1
fi

echo ""
echo "=== FE build done ==="
echo "  grep -l ModelStatusOverviewEventTimeline build/main.*.js | head -1"
grep -l ModelStatusOverviewEventTimeline build/main.*.js 2>/dev/null | head -1 || echo "  (chunk split — check build/main.*.js exists)"
echo "  cat build/build-version.txt"
cat build/build-version.txt 2>/dev/null || true
echo ""
echo "  → git commit + push + GitLab deploy (공용 URL 은 CI/Route 갱신 필요)"
if [ -x scripts/verify-model-status-summary-fe-deployed.sh ]; then
  sh scripts/verify-model-status-summary-fe-deployed.sh
else
  echo "  sh scripts/verify-model-status-summary-fe-deployed.sh"
fi
