#!/bin/sh
# 모델현황(ManagerDashboardBody) Jira 의존 파일만 Pod에 반영:
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-model-status-jira-deps.sh" | sh
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
cd "$ROOT"
mkdir -p src/utils src/hooks src/api src/types src/config src/mocks src/theme \
  src/components/jira src/components/charts src/components/cards
fetch() {
  if ! curl -fsSL "$BASE/$1" -o "$2"; then
    echo "ERROR: fetch failed — $BASE/$1" >&2
    exit 1
  fi
  echo "  + $2"
}
echo "=== Jira deps for model-status @ $REF ==="
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
fetch src/components/modelStatus/ManagerDashboardBody.tsx src/components/modelStatus/ManagerDashboardBody.tsx
for f in \
  src/utils/jiraDegradedBus.ts \
  src/utils/jiraFetch.ts \
  src/hooks/useJiraDegraded.ts \
  src/hooks/useJiraData.ts; do
  if [ ! -f "$f" ]; then
    echo "ERROR: missing after fetch — $f" >&2
    exit 1
  fi
done
echo "OK — all Jira deps present (run npm run build in project root)"
