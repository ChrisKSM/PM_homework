#!/bin/sh
# FE pod — 한 줄 실행:
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-verification-patch-min.sh" | sh
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
cd "$ROOT"
mkdir -p \
  src/pages src/api src/utils src/types \
  src/components/modelSchedule \
  src/components/modelStatus \
  src/data \
  public
fetch() { curl -fsSL "$BASE/$1" -o "$2" && echo "  + $2"; }
echo "=== FE patch (검증 일정 + 모델현황 + Initiative) @ $REF ==="

echo "--- 모델 검증 일정 ---"
fetch src/utils/modelScheduleMonth.ts src/utils/modelScheduleMonth.ts
fetch src/utils/modelScheduleDiff.ts src/utils/modelScheduleDiff.ts
fetch src/utils/modelScheduleRows.ts src/utils/modelScheduleRows.ts
fetch src/pages/ModelSchedulePage.tsx src/pages/ModelSchedulePage.tsx
fetch src/api/modelScheduleApi.ts src/api/modelScheduleApi.ts
fetch src/components/modelSchedule/ScheduleSnapshotDialog.tsx src/components/modelSchedule/ScheduleSnapshotDialog.tsx
fetch public/model-schedule-verification-mock.json public/model-schedule-verification-mock.json

echo "--- 모델현황 / Initiative ---"
fetch src/App.tsx src/App.tsx
fetch src/store/dashboardStore.ts src/store/dashboardStore.ts
fetch src/pages/ModelScheduleStatusPage.tsx src/pages/ModelScheduleStatusPage.tsx
fetch src/data/modelStatusCatalog.ts src/data/modelStatusCatalog.ts
fetch src/data/modelStatusInitiativeMock.ts src/data/modelStatusInitiativeMock.ts
fetch src/types/modelStatusInitiative.ts src/types/modelStatusInitiative.ts
fetch src/utils/jiraBrowseUrl.ts src/utils/jiraBrowseUrl.ts
fetch src/utils/modelStatusMilestones.ts src/utils/modelStatusMilestones.ts
fetch src/components/modelStatus/ModelIntegratedDashboard.tsx src/components/modelStatus/ModelIntegratedDashboard.tsx
fetch src/components/modelStatus/ModelStatusInitiativePanel.tsx src/components/modelStatus/ModelStatusInitiativePanel.tsx
fetch src/components/modelStatus/ModelStatusMetaCard.tsx src/components/modelStatus/ModelStatusMetaCard.tsx
fetch src/components/modelStatus/ModelStatusEventsTable.tsx src/components/modelStatus/ModelStatusEventsTable.tsx
fetch src/components/modelStatus/ManagerDashboardBody.tsx src/components/modelStatus/ManagerDashboardBody.tsx

grep -q ModelStatusInitiativePanel src/components/modelStatus/ModelIntegratedDashboard.tsx && echo "OK Initiative tab"
grep -q ensureSoundSuiteDetailRows src/utils/modelScheduleRows.ts && echo "OK Sound Suite + H7 VI"
npm run build
echo "=== Done — localStorage model-schedule-data 삭제 후 /model-schedule/status → Initiative 확인 ==="
