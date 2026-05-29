#!/bin/sh
# FE planning + quality 한 번에 적용 (client.ts / .env / Dockerfile 절대 건드리지 않음)
#
# react-audio pod (/workspace/project):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/apply-fe-safe.sh github/webpack-migration
#   npm run build

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== FE safe apply from $REF ==="
echo "  (client.ts / .env 는 변경하지 않음)"
echo ""

mkdir -p \
  src/types src/mocks src/api src/hooks src/pages src/config \
  src/components/planning src/components/quality src/components/procurement \
  src/components/risk \
  src/components/layout

LAYOUT_FILES="
  src/App.tsx
  src/components/layout/Sidebar.tsx
"

PLANNING_FILES="
  src/types/planning.ts
  src/mocks/mockPlanningData.ts
  src/api/planningApi.ts
  src/hooks/usePlanningData.ts
  src/pages/PlanningTraceabilityPage.tsx
  src/components/planning/BeforeAfterCard.tsx
  src/components/planning/ComplianceChecklist.tsx
  src/components/planning/HierarchyTree.tsx
  src/components/planning/PlanningFilters.tsx
  src/components/planning/PlanningDebugStrip.tsx
  src/components/planning/StoryDetailDrawer.tsx
  src/components/planning/TraceabilityMatrix.tsx
"

QUALITY_FILES="
  src/types/quality.ts
  src/mocks/mockQualityData.ts
  src/api/qualityApi.ts
  src/hooks/useQualityData.ts
  src/pages/QualityDashboardPage.tsx
  src/components/quality/QualityFilters.tsx
  src/components/quality/QualityPriorityChart.tsx
  src/components/quality/QualityCategoryChart.tsx
  src/components/quality/QualityAgingCharts.tsx
  src/components/quality/QualityIssueTable.tsx
"

PROCUREMENT_FILES="
  src/types/procurement.ts
  src/mocks/mockProcurementData.ts
  src/api/procurementApi.ts
  src/hooks/useProcurementData.ts
  src/pages/ProcurementDashboardPage.tsx
  src/components/procurement/ProcurementFilters.tsx
  src/components/procurement/ProcurementKpiGrid.tsx
  src/components/procurement/ProcurementPipelineChart.tsx
  src/components/procurement/ProcurementTables.tsx
"

RISK_FILES="
  src/types/risk.ts
  src/mocks/mockRiskData.ts
  src/api/riskApi.ts
  src/hooks/useRiskData.ts
  src/pages/RiskDashboardPage.tsx
  src/components/risk/RiskFilters.tsx
  src/components/risk/RiskCategoryChart.tsx
  src/components/risk/RiskEmvChart.tsx
  src/components/risk/RiskEmvTrendChart.tsx
  src/components/risk/RiskIssueTable.tsx
"

for f in $PLANNING_FILES $QUALITY_FILES $PROCUREMENT_FILES $RISK_FILES src/config/dataSource.ts; do
  show "$f" > "$f"
  echo "  + $f"
done

# Sidebar · App 은 git ref에서 복사 (메뉴/라우트 누락 방지)
for f in $LAYOUT_FILES; do
  show "$f" > "$f"
  echo "  + $f"
done

echo ""
echo "=== App.tsx · Sidebar.tsx — $REF 복사 + risk 누락 시 패치 ==="
python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

def patch_app():
    p = Path("src/App.tsx")
    if not p.exists():
        print("  WARN: src/App.tsx 없음")
        return
    t = p.read_text(encoding="utf-8")
    orig = t

    if "PlanningTraceabilityPage" not in t:
        if "import Layout" in t:
            t = t.replace(
                "import Layout from './components/layout/Layout'",
                "import Layout from './components/layout/Layout'\nimport PlanningTraceabilityPage from './pages/PlanningTraceabilityPage'",
            )
        t = t.replace(
            '<Route path="devteam" element={<DevTeamDashboard />} />',
            '<Route path="devteam" element={<DevTeamDashboard />} />\n          <Route path="planning" element={<PlanningTraceabilityPage />} />',
        )

    if "QualityDashboardPage" not in t:
        if "PlanningTraceabilityPage" in t and "import QualityDashboardPage" not in t:
            t = t.replace(
                "import PlanningTraceabilityPage from './pages/PlanningTraceabilityPage'",
                "import PlanningTraceabilityPage from './pages/PlanningTraceabilityPage'\nimport QualityDashboardPage from './pages/QualityDashboardPage'",
            )
        elif "import QualityDashboardPage" not in t:
            t = t.replace(
                "import Layout from './components/layout/Layout'",
                "import Layout from './components/layout/Layout'\nimport QualityDashboardPage from './pages/QualityDashboardPage'",
            )
        if 'path="quality"' not in t:
            if 'path="planning"' in t:
                t = t.replace(
                    '<Route path="planning" element={<PlanningTraceabilityPage />} />',
                    '<Route path="planning" element={<PlanningTraceabilityPage />} />\n          <Route path="quality" element={<QualityDashboardPage />} />',
                )
            else:
                t = t.replace(
                    '<Route path="devteam" element={<DevTeamDashboard />} />',
                    '<Route path="devteam" element={<DevTeamDashboard />} />\n          <Route path="quality" element={<QualityDashboardPage />} />',
                )

    if "ProcurementDashboardPage" not in t:
        if "QualityDashboardPage" in t and "import ProcurementDashboardPage" not in t:
            t = t.replace(
                "import QualityDashboardPage from './pages/QualityDashboardPage'",
                "import QualityDashboardPage from './pages/QualityDashboardPage'\nimport ProcurementDashboardPage from './pages/ProcurementDashboardPage'",
            )
        elif "import ProcurementDashboardPage" not in t:
            t = t.replace(
                "import Layout from './components/layout/Layout'",
                "import Layout from './components/layout/Layout'\nimport ProcurementDashboardPage from './pages/ProcurementDashboardPage'",
            )
        if 'path="procurement"' not in t:
            if 'path="quality"' in t:
                t = t.replace(
                    '<Route path="quality" element={<QualityDashboardPage />} />',
                    '<Route path="quality" element={<QualityDashboardPage />} />\n          <Route path="procurement" element={<ProcurementDashboardPage />} />',
                )
            else:
                t = t.replace(
                    '<Route path="devteam" element={<DevTeamDashboard />} />',
                    '<Route path="devteam" element={<DevTeamDashboard />} />\n          <Route path="procurement" element={<ProcurementDashboardPage />} />',
                )

    if "RiskDashboardPage" not in t:
        if "ProcurementDashboardPage" in t and "import RiskDashboardPage" not in t:
            t = t.replace(
                "import ProcurementDashboardPage from './pages/ProcurementDashboardPage'",
                "import ProcurementDashboardPage from './pages/ProcurementDashboardPage'\nimport RiskDashboardPage from './pages/RiskDashboardPage'",
            )
        elif "import RiskDashboardPage" not in t:
            t = t.replace(
                "import Layout from './components/layout/Layout'",
                "import Layout from './components/layout/Layout'\nimport RiskDashboardPage from './pages/RiskDashboardPage'",
            )
        if 'path="risk"' not in t:
            if 'path="procurement"' in t:
                t = t.replace(
                    '<Route path="procurement" element={<ProcurementDashboardPage />} />',
                    '<Route path="procurement" element={<ProcurementDashboardPage />} />\n          <Route path="risk" element={<RiskDashboardPage />} />',
                )
            elif 'path="quality"' in t:
                t = t.replace(
                    '<Route path="quality" element={<QualityDashboardPage />} />',
                    '<Route path="quality" element={<QualityDashboardPage />} />\n          <Route path="risk" element={<RiskDashboardPage />} />',
                )

    if t != orig:
        p.write_text(t, encoding="utf-8")
        print("  patched App.tsx")
    else:
        print("  App.tsx OK")


def patch_sidebar():
    p = Path("src/components/layout/Sidebar.tsx")
    if not p.exists():
        print("  WARN: Sidebar.tsx 없음")
        return
    t = p.read_text(encoding="utf-8")
    orig = t

    if "ShieldAlert" not in t:
        t = t.replace(
            "ShieldCheck, Users",
            "ShieldAlert, ShieldCheck, Users",
        )

    if "/risk" not in t:
        t = t.replace(
            "{ to: '/procurement', icon: Package, label: '조달 KPI' },",
            "{ to: '/procurement', icon: Package, label: '조달 KPI' },\n  { to: '/risk', icon: ShieldAlert, label: '리스크 관리' },",
        )

    if t != orig:
        p.write_text(t, encoding="utf-8")
        print("  patched Sidebar.tsx (리스크 관리 메뉴 추가)")
    else:
        print("  Sidebar.tsx OK")


patch_app()
patch_sidebar()
PY

echo ""
echo "=== 검증 ==="
ERR=0
for needle in "PlanningTraceabilityPage" "QualityDashboardPage" "ProcurementDashboardPage" "RiskDashboardPage" "/planning" "/quality" "/procurement" "/risk" "계획 추적성" "품질 이슈" "조달 KPI" "리스크 관리"; do
  if grep -rq "$needle" src/App.tsx src/components/layout/Sidebar.tsx 2>/dev/null; then
    echo "  OK $needle"
  else
    echo "  MISSING $needle"
    ERR=1
  fi
done

if [ -f src/components/planning/PlanningDebugStrip.tsx ]; then
  echo "  OK PlanningDebugStrip.tsx"
else
  echo "  MISSING PlanningDebugStrip.tsx (planning 빌드 실패 원인)"
  ERR=1
fi

if [ -f src/components/risk/RiskFilters.tsx ]; then
  echo "  OK RiskFilters.tsx"
else
  echo "  MISSING src/components/risk/* (risk 빌드 실패 원인)"
  ERR=1
fi

if [ -f src/api/client.ts ]; then
  echo "  OK client.ts (미변경)"
fi

echo ""
if [ "$ERR" -eq 0 ]; then
  echo "=== 다음 ==="
  echo "  npm install"
  echo "  npm run build    # 또는 npm start"
  echo "  .env: REACT_APP_USE_MOCK=false  (BE 연동)"
  echo "  브라우저 hard refresh (Ctrl+Shift+R)"
else
  echo "=== 일부 누락 — App.tsx / Sidebar.tsx 수동 확인 필요 ==="
  exit 1
fi
