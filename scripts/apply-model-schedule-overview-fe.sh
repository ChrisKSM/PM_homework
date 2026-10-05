#!/bin/sh
# react-audio FE — 전 모델 일정 페이지 반영
#
# FE pod (/workspace/project):
#
# ⚠️ scripts/ 가 pod에 없으면 (최초 1회):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
#     scripts/apply-model-schedule-overview-fe.sh
#   chmod +x scripts/apply-model-schedule-overview-fe.sh
#
#   sh scripts/apply-model-schedule-overview-fe.sh
#   npm run build && git add -A && git commit -m "feat: 전 모델 일정 overview" && git push origin master

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github cursor/model-schedule-bar-label-fix-b14b 먼저"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply 전 모델 일정 FE from $REF ==="
mkdir -p src/pages src/data src/types src/utils src/api src/components/modelSchedule

for f in \
  src/pages/ModelScheduleOverviewPage.tsx \
  src/pages/ModelScheduleStatusPage.tsx \
  src/pages/ManagerDashboard.tsx \
  src/components/modelStatus/ManagerDashboardBody.tsx \
  src/components/modelSchedule/OverviewEventEditor.tsx \
  src/components/modelSchedule/OverviewSnapshotDialog.tsx \
  src/api/modelScheduleApi.ts \
  src/components/modelSchedule/OverviewScheduleTable.tsx \
  src/components/modelSchedule/MetaTooltipCell.tsx \
  src/data/modelScheduleOverviewMock.ts \
  src/types/modelScheduleOverview.ts \
  src/utils/modelScheduleOverviewRows.ts \
  src/utils/captureOverviewPages.ts \
  src/utils/overviewBarStyles.ts \
  src/api/client.ts \
  src/App.tsx \
  src/store/dashboardStore.ts
do
  show "$f" > "$f"
  echo "  + $f"
done

if [ ! -f src/components/modelSchedule/OverviewEventEditor.tsx ]; then
  echo "Error: OverviewEventEditor.tsx 복사 실패 — git fetch 후 재실행"
  exit 1
fi

echo ""
echo "  다음: sh scripts/verify-overview-fe-deployed.sh && npm run build → git push"
echo "  화면: /model-schedule/overview"
echo "=== Done ==="
