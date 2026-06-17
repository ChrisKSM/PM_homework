#!/bin/sh
# FE Release/Sprint Plan만 선택 적용 (client.ts / Dockerfile 건드리지 않음)
#
# react-audio pod (/workspace/project):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/apply-sprint-plan-fe-only.sh github/webpack-migration
#   npm run build

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' not found. Run: git fetch github webpack-migration"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply FE Release/Sprint Plan only from $REF ==="

mkdir -p \
  src/types \
  src/mocks \
  src/api \
  src/hooks \
  src/pages \
  src/components/sprintPlan \
  src/components/devteam \
  src/components/layout \
  src/config

SPRINT_PLAN_FILES="
  src/types/sprintPlan.ts
  src/types/sprintPlanForecast.ts
  src/mocks/mockSprintPlanData.ts
  src/api/sprintPlanApi.ts
  src/hooks/useSprintPlanData.ts
  src/pages/ReleaseSprintPlanPage.tsx
  src/pages/DevTeamDashboard.tsx
  src/components/sprintPlan/JiraLinkedText.tsx
  src/components/sprintPlan/RiskDescriptionPanel.tsx
  src/components/sprintPlan/SprintPlanGantt.tsx
  src/components/sprintPlan/sprintPlanUtils.ts
  src/components/devteam/SprintForecastPanel.tsx
"

for f in $SPRINT_PLAN_FILES; do
  show "$f" > "$f"
  echo "  + $f"
done

for f in src/App.tsx src/components/layout/Sidebar.tsx src/main.tsx; do
  show "$f" > "$f"
  echo "  + $f"
done

for f in webpack.config.js public/index.html; do
  show "$f" > "$f"
  echo "  + $f"
done

echo ""
echo "=== 검증 ==="
ERR=0
for f in \
  src/pages/ReleaseSprintPlanPage.tsx \
  src/components/sprintPlan/SprintPlanGantt.tsx \
  src/components/sprintPlan/sprintPlanUtils.ts \
  src/components/devteam/SprintForecastPanel.tsx \
  src/pages/DevTeamDashboard.tsx \
  src/App.tsx \
  src/components/layout/Sidebar.tsx
do
  if [ -f "$f" ]; then
    echo "  OK $f"
  else
    echo "  MISSING $f"
    ERR=1
  fi
done

if ! grep -q "릴리즈/스프린트 계획" src/components/layout/Sidebar.tsx 2>/dev/null; then
  echo "  MISSING Sidebar 릴리즈/스프린트 계획 메뉴"
  ERR=1
else
  echo "  OK Sidebar 릴리즈/스프린트 계획 메뉴"
fi

if ! grep -q 'path="sprint-plan"' src/App.tsx 2>/dev/null; then
  echo "  MISSING App.tsx sprint-plan route"
  ERR=1
else
  echo "  OK App.tsx sprint-plan route"
fi

if ! grep -q 'mockSprintPlanForecast' src/mocks/mockSprintPlanData.ts 2>/dev/null; then
  echo "  MISSING mockSprintPlanForecast in mockSprintPlanData.ts"
  ERR=1
else
  echo "  OK mockSprintPlanForecast mock"
fi

if [ "$ERR" -ne 0 ]; then
  exit 1
fi

echo ""
echo "=== 다음 ==="
echo "  npm run build"
echo "  REACT_APP_USE_MOCK=false — BE /api/sprint-plan/timeline 연동"
echo "=== Done ==="
