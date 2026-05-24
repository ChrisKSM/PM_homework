#!/bin/sh
# FE 품질 이슈 대시보드만 선택 적용 (client.ts / Dockerfile 건드리지 않음)
#
# react-audio pod (/workspace/project):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/apply-quality-fe-only.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' not found. Run: git fetch github webpack-migration"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply FE quality dashboard only from $REF ==="

mkdir -p \
  src/types \
  src/mocks \
  src/api \
  src/hooks \
  src/pages \
  src/components/quality \
  src/config

for f in \
  src/types/quality.ts \
  src/mocks/mockQualityData.ts \
  src/api/qualityApi.ts \
  src/hooks/useQualityData.ts \
  src/pages/QualityDashboardPage.tsx \
  src/components/quality/QualityFilters.tsx \
  src/components/quality/QualityPriorityChart.tsx \
  src/components/quality/QualityCategoryChart.tsx \
  src/components/quality/QualityAgingCharts.tsx \
  src/components/quality/QualityIssueTable.tsx \
  src/config/dataSource.ts
do
  show "$f" > "$f"
  echo "  + $f"
done

echo ""
echo "=== App.tsx / Sidebar.tsx — planning과 함께 수동 merge 또는 아래 diff 참고 ==="
echo "  import QualityDashboardPage from './pages/QualityDashboardPage'"
echo "  <Route path=\"quality\" element={<QualityDashboardPage />} />"
echo "  { to: '/quality', icon: ShieldCheck, label: '품질 이슈' }"
echo ""
git diff "$REF" -- src/App.tsx src/components/layout/Sidebar.tsx 2>/dev/null | head -60 || true
echo ""
echo "=== 완료 후 ==="
echo "  npm install && npm start"
echo "  REACT_APP_USE_MOCK=false — BE /api/quality 연동"
echo ""
echo "=== 건드리지 않음 ==="
echo "  src/api/client.ts"
