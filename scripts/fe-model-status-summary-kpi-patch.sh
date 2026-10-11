#!/bin/sh
# FE pod — 요약 탭: HW/SW Event 타임라인 + KPI-1 SP 소진율 (worklog) + 릴리즈 탭 SP26 라벨 구분
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-model-status-summary-kpi-patch.sh?v=1" | sh
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

mkdir -p src/utils src/types src/hooks src/api src/components/modelStatus src/utils

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

grep -q buildOverviewEventsTimeline src/utils/modelStatusMilestones.ts && echo "OK  HW/SW overview timeline"
grep -q ModelStatusOverviewEventTimeline src/components/modelStatus/ModelIntegratedDashboard.tsx && echo "OK  summary dashboard wiring"
grep -q getStorySpKpi src/api/modelStatusApi.ts && echo "OK  story-sp-kpi API client"
grep -q SP26 src/components/modelStatus/ModelStatusReleaseEpicGantt.tsx && echo "OK  release tab SP26 label (not summary KPI-1)"

npm run build

echo ""
echo "=== FE build done ==="
echo "  grep -l ModelStatusOverviewEventTimeline build/main.*.js | head -1"
grep -l ModelStatusOverviewEventTimeline build/main.*.js 2>/dev/null | head -1 || echo "  (chunk split — check build/main.*.js exists)"
echo "  cat build/build-version.txt"
cat build/build-version.txt 2>/dev/null || true
echo ""
echo "  → git commit + push + GitLab deploy (공용 URL 은 CI/Route 갱신 필요)"
echo "  sh scripts/verify-model-status-summary-fe-deployed.sh"
