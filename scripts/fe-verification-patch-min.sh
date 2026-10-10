#!/bin/sh
# FE pod — 한 줄 실행:
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-verification-patch-min.sh" | sh
#
# Jira 모듈만 빠졌을 때:
#   curl -fsSL ".../scripts/fe-model-status-jira-deps.sh" | sh
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
cd "$ROOT"
mkdir -p \
  src/pages src/api src/utils src/types src/hooks src/config src/mocks src/theme \
  src/components/modelSchedule \
  src/components/modelStatus \
  src/components/jira \
  src/components/charts \
  src/components/cards \
  src/data \
  public
fetch() {
  if ! curl -fsSL "$BASE/$1" -o "$2"; then
    echo "ERROR: fetch failed — $BASE/$1" >&2
    exit 1
  fi
  echo "  + $2"
}
verify_files() {
  for f in "$@"; do
    if [ ! -f "$f" ]; then
      echo "ERROR: missing — $f (REF=$REF, re-run full patch or fe-model-status-jira-deps.sh)" >&2
      exit 1
    fi
  done
}
echo "=== FE patch (검증 일정 + 모델현황 + Initiative) @ $REF ==="

echo "--- 모델 검증 일정 ---"
fetch src/utils/modelScheduleMonth.ts src/utils/modelScheduleMonth.ts
fetch src/utils/modelScheduleDiff.ts src/utils/modelScheduleDiff.ts
fetch src/utils/modelScheduleRows.ts src/utils/modelScheduleRows.ts
fetch src/pages/ModelSchedulePage.tsx src/pages/ModelSchedulePage.tsx
fetch src/api/modelScheduleApi.ts src/api/modelScheduleApi.ts
fetch src/components/modelSchedule/ScheduleSnapshotDialog.tsx src/components/modelSchedule/ScheduleSnapshotDialog.tsx
fetch public/model-schedule-verification-mock.json public/model-schedule-verification-mock.json

echo "--- 모델현황 overview ---"
fetch src/data/modelScheduleOverviewMock.ts src/data/modelScheduleOverviewMock.ts
fetch src/utils/modelScheduleOverviewRows.ts src/utils/modelScheduleOverviewRows.ts
fetch src/types/modelScheduleOverview.ts src/types/modelScheduleOverview.ts
fetch src/components/modelSchedule/MetaTooltipCell.tsx src/components/modelSchedule/MetaTooltipCell.tsx

echo "--- 모델현황 / Initiative ---"
fetch src/App.tsx src/App.tsx
fetch src/store/dashboardStore.ts src/store/dashboardStore.ts
fetch src/pages/ModelScheduleStatusPage.tsx src/pages/ModelScheduleStatusPage.tsx
fetch src/data/modelStatusCatalog.ts src/data/modelStatusCatalog.ts
fetch src/data/modelStatusInitiativeMock.ts src/data/modelStatusInitiativeMock.ts
fetch src/types/modelStatusInitiative.ts src/types/modelStatusInitiative.ts
fetch src/utils/jiraBrowseUrl.ts src/utils/jiraBrowseUrl.ts
fetch src/utils/modelStatusMilestones.ts src/utils/modelStatusMilestones.ts
fetch src/api/modelStatusApi.ts src/api/modelStatusApi.ts
fetch src/hooks/useModelStatusInitiatives.ts src/hooks/useModelStatusInitiatives.ts
fetch src/components/modelStatus/ModelIntegratedDashboard.tsx src/components/modelStatus/ModelIntegratedDashboard.tsx
fetch src/components/modelStatus/ModelStatusInitiativePanel.tsx src/components/modelStatus/ModelStatusInitiativePanel.tsx
fetch src/components/modelStatus/ModelStatusMetaCard.tsx src/components/modelStatus/ModelStatusMetaCard.tsx
fetch src/components/modelStatus/ModelStatusEventsTable.tsx src/components/modelStatus/ModelStatusEventsTable.tsx
fetch src/components/modelStatus/ManagerDashboardBody.tsx src/components/modelStatus/ManagerDashboardBody.tsx

echo "--- Jira (ManagerDashboardBody 의존 — 순서 중요) ---"
fetch src/config/dataSource.ts src/config/dataSource.ts
fetch src/utils/jiraDegradedBus.ts src/utils/jiraDegradedBus.ts
fetch src/utils/jiraFetch.ts src/utils/jiraFetch.ts
fetch src/api/client.ts src/api/client.ts
fetch src/api/jiraApi.ts src/api/jiraApi.ts
fetch src/types/jira.ts src/types/jira.ts
fetch src/mocks/mockData.ts src/mocks/mockData.ts
fetch src/hooks/useJiraDegraded.ts src/hooks/useJiraDegraded.ts
fetch src/hooks/useJiraData.ts src/hooks/useJiraData.ts
fetch src/components/jira/JiraDegradedBanner.tsx src/components/jira/JiraDegradedBanner.tsx
fetch src/theme/colors.ts src/theme/colors.ts
fetch src/components/charts/EpicProgressChart.tsx src/components/charts/EpicProgressChart.tsx
fetch src/components/charts/IssueStatusChart.tsx src/components/charts/IssueStatusChart.tsx
fetch src/components/charts/VelocityChart.tsx src/components/charts/VelocityChart.tsx
fetch src/components/cards/KpiCard.tsx src/components/cards/KpiCard.tsx
fetch src/components/cards/SectionCard.tsx src/components/cards/SectionCard.tsx
fetch src/components/cards/RiskTable.tsx src/components/cards/RiskTable.tsx

verify_files \
  src/utils/jiraDegradedBus.ts \
  src/utils/jiraFetch.ts \
  src/hooks/useJiraDegraded.ts \
  src/hooks/useJiraData.ts \
  src/components/jira/JiraDegradedBanner.tsx
echo "OK Jira + Initiative files on disk"
grep -q ModelStatusInitiativePanel src/components/modelStatus/ModelIntegratedDashboard.tsx && echo "OK Initiative tab"
grep -q ensureSoundSuiteDetailRows src/utils/modelScheduleRows.ts && echo "OK Sound Suite + H7 VI"
npm run build
echo "=== Done — localStorage model-schedule-data 삭제 후 /model-schedule/status → Initiative 확인 ==="
