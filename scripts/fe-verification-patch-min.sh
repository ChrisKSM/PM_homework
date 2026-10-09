#!/bin/sh
# FE pod — 한 줄 실행:
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-verification-patch-min.sh" | sh
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
cd "$ROOT"
mkdir -p src/pages src/api src/utils src/components/modelSchedule public
fetch() { curl -fsSL "$BASE/$1" -o "$2" && echo "  + $2"; }
echo "=== FE verification patch @ $REF ==="
fetch src/utils/modelScheduleMonth.ts src/utils/modelScheduleMonth.ts
fetch src/utils/modelScheduleDiff.ts src/utils/modelScheduleDiff.ts
fetch src/utils/modelScheduleRows.ts src/utils/modelScheduleRows.ts
fetch src/pages/ModelSchedulePage.tsx src/pages/ModelSchedulePage.tsx
fetch src/api/modelScheduleApi.ts src/api/modelScheduleApi.ts
fetch src/components/modelSchedule/ScheduleSnapshotDialog.tsx src/components/modelSchedule/ScheduleSnapshotDialog.tsx
fetch public/model-schedule-verification-mock.json public/model-schedule-verification-mock.json
grep -q ensureSoundSuiteDetailRows src/utils/modelScheduleRows.ts && echo "OK Sound Suite + H7 VI"
npm run build
echo "=== Done — localStorage model-schedule-data 삭제 후 새로고침 ==="
