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
  src/components/modelStatus/ModelStatusMetaCard.tsx \
  src/components/modelStatus/ModelStatusEventsTable.tsx \
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

if [ ! -f src/utils/captureOverviewPages.ts ]; then
  echo "Error: captureOverviewPages.ts 복사 실패 — git fetch 후 재실행"
  exit 1
fi

if ! grep -q '"html2canvas"' package.json 2>/dev/null; then
  echo "  + npm install html2canvas (snapshot PNG 캡처)"
  npm install html2canvas@^1.4.1 --save
else
  npm install html2canvas@^1.4.1 2>/dev/null || true
fi

# fix 스크립트도 최신 유지
if git cat-file -e "$REF:scripts/fix-overview-fe-capture-module.sh" 2>/dev/null; then
  show scripts/fix-overview-fe-capture-module.sh > scripts/fix-overview-fe-capture-module.sh
  chmod +x scripts/fix-overview-fe-capture-module.sh
fi
if git cat-file -e "$REF:scripts/verify-overview-fe-deployed.sh" 2>/dev/null; then
  show scripts/verify-overview-fe-deployed.sh > scripts/verify-overview-fe-deployed.sh
  chmod +x scripts/verify-overview-fe-deployed.sh
fi

echo ""
echo "  다음: sh scripts/verify-overview-fe-deployed.sh && npm run build → git push"
echo "  화면: /model-schedule/overview"
echo "=== Done ==="
