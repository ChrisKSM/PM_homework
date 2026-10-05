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
  src/components/modelSchedule/OverviewEventPicker.tsx \
  src/components/modelSchedule/OverviewSnapshotDialog.tsx \
  src/components/modelSchedule/OverviewScheduleTable.tsx \
  src/components/modelSchedule/MetaTooltipCell.tsx \
  src/data/modelScheduleOverviewMock.ts \
  src/types/modelScheduleOverview.ts \
  src/utils/modelScheduleOverviewRows.ts \
  src/utils/overviewBarStyles.ts \
  src/api/modelScheduleApi.ts \
  src/api/client.ts \
  src/App.tsx \
  src/store/dashboardStore.ts
do
  show "$f" > "$f"
  echo "  + $f"
done

echo ""
echo "  다음: npm run build → git push (GitLab 재배포)"
echo "  화면: /model-schedule/overview"
echo "=== Done ==="
