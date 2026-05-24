#!/bin/sh
# FE planning + quality 선택 적용 (client.ts 변경 금지)
#
# react-audio pod (/workspace/project):
#   git fetch github webpack-migration
#   sh scripts/apply-planning-quality-fe.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="${1:-github/webpack-migration}"

sh "$ROOT/scripts/apply-planning-fe-only.sh" "$REF" 2>/dev/null || true

# planning 스크립트는 App/Sidebar 수동 안내만 — quality 파일은 여기서 복사
sh "$ROOT/scripts/apply-quality-fe-only.sh" "$REF"

echo ""
echo "=== App.tsx / Sidebar.tsx 자동 패치 시도 ==="
python3 - <<'PY' 2>/dev/null || python - <<'PY'
import re
from pathlib import Path

root = Path(".")
app = root / "src/App.tsx"
sidebar = root / "src/components/layout/Sidebar.tsx"

if app.exists():
    t = app.read_text(encoding="utf-8")
    if "QualityDashboardPage" not in t:
        t = t.replace(
            "import PlanningTraceabilityPage from './pages/PlanningTraceabilityPage'",
            "import PlanningTraceabilityPage from './pages/PlanningTraceabilityPage'\nimport QualityDashboardPage from './pages/QualityDashboardPage'",
        )
        t = t.replace(
            '<Route path="planning" element={<PlanningTraceabilityPage />} />',
            '<Route path="planning" element={<PlanningTraceabilityPage />} />\n          <Route path="quality" element={<QualityDashboardPage />} />',
        )
        app.write_text(t, encoding="utf-8")
        print("  patched App.tsx")

if sidebar.exists():
    t = sidebar.read_text(encoding="utf-8")
    if "/quality" not in t:
        t = t.replace(
            "GitBranch, LayoutDashboard, Users",
            "GitBranch, LayoutDashboard, ShieldCheck, Users",
        )
        t = t.replace(
            "{ to: '/planning', icon: GitBranch, label: '계획 추적성' },\n]",
            "{ to: '/planning', icon: GitBranch, label: '계획 추적성' },\n  { to: '/quality', icon: ShieldCheck, label: '품질 이슈' },\n]",
        )
        sidebar.write_text(t, encoding="utf-8")
        print("  patched Sidebar.tsx")
PY

echo "=== FE planning+quality apply done ==="
