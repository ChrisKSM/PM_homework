#!/bin/sh
# FE planning 페이지만 선택 적용 (client.ts / Dockerfile / settings 건드리지 않음)
#
# 전제: hub master가 release 1.0.57 등 정상 동작 상태
#
# react-audio pod (/workspace/project):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/apply-planning-fe-only.sh
#
# 수동 확인:
#   - src/App.tsx (planning route 1줄)
#   - src/components/layout/Sidebar.tsx (계획 추적성 nav 1줄)
#   - src/api/client.ts 는 변경하지 않음

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' not found. Run: git fetch github webpack-migration"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply FE planning only from $REF ==="

mkdir -p \
  src/types \
  src/mocks \
  src/api \
  src/hooks \
  src/pages \
  src/components/planning

# 신규 파일 — 통째로 복사
for f in \
  src/types/planning.ts \
  src/mocks/mockPlanningData.ts \
  src/api/planningApi.ts \
  src/hooks/usePlanningData.ts \
  src/pages/PlanningTraceabilityPage.tsx \
  src/components/planning/BeforeAfterCard.tsx \
  src/components/planning/ComplianceChecklist.tsx \
  src/components/planning/HierarchyTree.tsx \
  src/components/planning/PlanningFilters.tsx \
  src/components/planning/PlanningDebugStrip.tsx \
  src/components/planning/StoryDetailDrawer.tsx \
  src/components/planning/TraceabilityMatrix.tsx
do
  show "$f" > "$f"
  echo "  + $f"
done

echo ""
echo "=== App.tsx / Sidebar.tsx — 수동 merge 필요 ==="
echo "아래 diff 참고 후 편집하세요 (client.ts 변경 금지)."
echo ""
echo "--- App.tsx 추가 ---"
echo "  import PlanningTraceabilityPage from './pages/PlanningTraceabilityPage'"
echo "  <Route path=\"planning\" element={<PlanningTraceabilityPage />} />"
echo ""
echo "--- Sidebar.tsx 추가 ---"
echo "  import { GitBranch, ... } from 'lucide-react'"
echo "  { to: '/planning', icon: GitBranch, label: '계획 추적성' }"
echo ""
echo "GitHub 버전 diff:"
git diff "$REF" -- src/App.tsx src/components/layout/Sidebar.tsx 2>/dev/null | head -80 || true
echo ""
echo "=== 완료 후 ==="
echo "  npm install   # 필요 시"
echo "  npm start     # /planning 확인"
echo "  REACT_APP_USE_MOCK=false  (.env) — BE planning API 연동 시"
echo ""
echo "=== 건드리지 않은 파일 (hub 유지) ==="
echo "  src/api/client.ts"
echo "  Dockerfile / .gitlab-ci.yml / settings/"
