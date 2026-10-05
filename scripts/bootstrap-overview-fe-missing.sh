#!/bin/sh
# FE pod — 누락된 overview 파일 한 번에 checkout (Module not found 해결)
#
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   sh scripts/bootstrap-overview-fe-missing.sh
#   npm run build

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github cursor/model-schedule-bar-label-fix-b14b 먼저"
  exit 1
fi

checkout() {
  git checkout "$REF" -- "$1"
  echo "  + $1"
}

echo "=== Bootstrap overview FE files from $REF ==="
mkdir -p src/components/modelSchedule src/utils src/pages

checkout scripts/apply-model-schedule-overview-fe.sh
checkout scripts/bootstrap-overview-fe-missing.sh
checkout src/components/modelSchedule/OverviewScheduleTable.tsx
checkout src/utils/overviewBarStyles.ts
checkout src/components/modelSchedule/OverviewSnapshotDialog.tsx
checkout src/pages/ModelScheduleOverviewPage.tsx
checkout src/utils/modelScheduleOverviewRows.ts
checkout src/types/modelScheduleOverview.ts

echo ""
echo "  npm run build"
echo "=== Done ==="
