#!/bin/sh
# FE pod — 모델현황 + Initiative 탭 (Jira H7 VI) + ManagerDashboard Jira deps
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-model-status-initiative-patch.sh" | sh
#
# 검증 일정까지 포함한 통합 패치:
#   curl -fsSL ".../scripts/fe-verification-patch-min.sh" | sh
#
# Jira deps만:
#   curl -fsSL ".../scripts/fe-model-status-jira-deps.sh" | sh
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
cd "$ROOT"

mkdir -p \
  src/pages src/api src/utils src/types src/hooks src/config src/mocks src/theme src/constants \
  src/components/modelSchedule src/components/modelStatus src/components/jira \
  src/components/charts src/components/cards src/data public

fetch() {
  if ! curl -fsSL "$BASE/$1" -o "$2"; then
    echo "ERROR: fetch failed — $BASE/$1" >&2
    exit 1
  fi
  echo "  + $2"
}

verify_files() {
  for f in "$@"; do
    [ -f "$f" ] || { echo "ERROR: missing $f" >&2; exit 1; }
  done
}

echo "=== FE model-status + Initiative @ $REF ==="

echo "--- 라우팅 ---"
fetch src/App.tsx src/App.tsx
fetch src/store/dashboardStore.ts src/store/dashboardStore.ts
fetch src/pages/ModelScheduleStatusPage.tsx src/pages/ModelScheduleStatusPage.tsx

echo "--- overview ---"
fetch src/data/modelScheduleOverviewMock.ts src/data/modelScheduleOverviewMock.ts
fetch src/utils/modelScheduleOverviewRows.ts src/utils/modelScheduleOverviewRows.ts
fetch src/types/modelScheduleOverview.ts src/types/modelScheduleOverview.ts
fetch src/components/modelSchedule/MetaTooltipCell.tsx src/components/modelSchedule/MetaTooltipCell.tsx

echo "--- model status / Initiative ---"
fetch src/data/modelStatusCatalog.ts src/data/modelStatusCatalog.ts
fetch src/data/modelStatusInitiativeMock.ts src/data/modelStatusInitiativeMock.ts
fetch src/types/modelStatusInitiative.ts src/types/modelStatusInitiative.ts
fetch src/constants/tvplatInitiativeFields.ts src/constants/tvplatInitiativeFields.ts
fetch src/api/modelStatusApi.ts src/api/modelStatusApi.ts
fetch src/hooks/useModelStatusInitiatives.ts src/hooks/useModelStatusInitiatives.ts
fetch src/utils/jiraBrowseUrl.ts src/utils/jiraBrowseUrl.ts
fetch src/utils/modelStatusMilestones.ts src/utils/modelStatusMilestones.ts
fetch src/components/modelStatus/ModelIntegratedDashboard.tsx src/components/modelStatus/ModelIntegratedDashboard.tsx
fetch src/components/modelStatus/ModelStatusInitiativePanel.tsx src/components/modelStatus/ModelStatusInitiativePanel.tsx
fetch src/components/modelStatus/ModelStatusMetaCard.tsx src/components/modelStatus/ModelStatusMetaCard.tsx
fetch src/components/modelStatus/ModelStatusEventsTable.tsx src/components/modelStatus/ModelStatusEventsTable.tsx
fetch src/components/modelStatus/ManagerDashboardBody.tsx src/components/modelStatus/ManagerDashboardBody.tsx

echo "--- Jira (S80C 책임자 보드 + degraded) ---"
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
  src/api/modelStatusApi.ts \
  src/hooks/useModelStatusInitiatives.ts \
  src/components/modelStatus/ModelStatusInitiativePanel.tsx \
  src/utils/jiraFetch.ts \
  src/utils/jiraDegradedBus.ts

grep -q getInitiatives src/api/modelStatusApi.ts && echo "OK modelStatusApi.getInitiatives"
grep -q ModelStatusInitiativePanel src/components/modelStatus/ModelIntegratedDashboard.tsx && echo "OK Initiative tab"

npm run build

echo ""
echo "=== FE Done ==="
echo "  /model-schedule/status → Sound Suite → H7 VI → Initiative"
echo "  localStorage.removeItem('model-schedule-data') 후 새로고침"
echo "  BE: curl .../be-model-status-initiative-patch.sh | sh"
