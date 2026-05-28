#!/bin/sh
# FE 리스크 관리 대시보드만 선택 적용 (client.ts / Dockerfile 건드리지 않음)
#
# react-audio pod (/workspace/project):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/apply-risk-fe-only.sh github/webpack-migration
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

echo "=== Apply FE risk dashboard only from $REF ==="

mkdir -p \
  src/types \
  src/mocks \
  src/api \
  src/hooks \
  src/pages \
  src/components/risk \
  src/components/layout \
  src/config

RISK_FILES="
  src/types/risk.ts
  src/mocks/mockRiskData.ts
  src/api/riskApi.ts
  src/hooks/useRiskData.ts
  src/pages/RiskDashboardPage.tsx
  src/components/risk/RiskFilters.tsx
  src/components/risk/RiskCategoryChart.tsx
  src/components/risk/RiskEmvChart.tsx
  src/components/risk/RiskIssueTable.tsx
"

for f in $RISK_FILES src/config/dataSource.ts; do
  show "$f" > "$f"
  echo "  + $f"
done

for f in src/App.tsx src/components/layout/Sidebar.tsx; do
  show "$f" > "$f"
  echo "  + $f"
done

echo ""
echo "=== App.tsx / Sidebar.tsx 패치 ==="
python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

def patch_app():
    p = Path("src/App.tsx")
    if not p.exists():
        print("  WARN: src/App.tsx 없음")
        return
    t = p.read_text(encoding="utf-8")
    orig = t

    if "RiskDashboardPage" not in t:
        if "import ProcurementDashboardPage" in t:
            t = t.replace(
                "import ProcurementDashboardPage from './pages/ProcurementDashboardPage'",
                "import ProcurementDashboardPage from './pages/ProcurementDashboardPage'\nimport RiskDashboardPage from './pages/RiskDashboardPage'",
            )
        elif "import QualityDashboardPage" in t:
            t = t.replace(
                "import QualityDashboardPage from './pages/QualityDashboardPage'",
                "import QualityDashboardPage from './pages/QualityDashboardPage'\nimport RiskDashboardPage from './pages/RiskDashboardPage'",
            )
        else:
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

    if "ShieldAlert" not in t and "/risk" in t:
        t = t.replace(
            "ShieldCheck, Users",
            "ShieldAlert, ShieldCheck, Users",
        )
    elif "ShieldAlert" not in t:
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
        print("  patched Sidebar.tsx")
    else:
        print("  Sidebar.tsx OK")


patch_app()
patch_sidebar()
PY

echo ""
echo "=== 검증 ==="
ERR=0
for f in \
  src/components/risk/RiskFilters.tsx \
  src/components/risk/RiskCategoryChart.tsx \
  src/components/risk/RiskEmvChart.tsx \
  src/components/risk/RiskIssueTable.tsx \
  src/pages/RiskDashboardPage.tsx \
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

if [ "$ERR" -ne 0 ]; then
  echo "=== 파일 누락 — github/webpack-migration 에 risk FE 커밋 후 다시 실행 ==="
  exit 1
fi

if grep -q "리스크 관리" src/components/layout/Sidebar.tsx 2>/dev/null; then
  echo "  OK Sidebar 리스크 관리 메뉴"
else
  echo "  MISSING Sidebar 리스크 관리 — patch_sidebar 재실행 필요"
  ERR=1
fi

if [ "$ERR" -ne 0 ]; then
  exit 1
fi

echo ""
echo "=== 다음 ==="
echo "  npm run build"
echo "  REACT_APP_USE_MOCK=false — BE /api/risk 연동"
