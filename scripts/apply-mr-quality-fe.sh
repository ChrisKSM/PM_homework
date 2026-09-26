#!/bin/sh
# react-audio pod — 기존 /quality 를 Polarion MR 품질 필터 페이지로 교체.
# client.ts / .env 유지.
#
# /workspace/project (react-audio):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/apply-mr-quality-fe.sh github/webpack-migration
#   npm start

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Replace /quality with Polarion MR filter from $REF ==="
mkdir -p src/api src/pages/mr src/components/mr src/utils

for f in \
  src/api/mrQualityApi.ts \
  src/pages/mr/MrQualityPage.tsx \
  src/components/mr/DatePickerField.tsx \
  src/utils/polarionQuery.ts
do
  show "$f" > "$f"
  echo "  + $f"
done

python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

p = Path("src/App.tsx")
if p.exists():
    t = p.read_text(encoding="utf-8")
    if "import MrQualityPage" not in t:
        if "import QualityDashboardPage" in t:
            t = t.replace(
                "import QualityDashboardPage from './pages/QualityDashboardPage'",
                "import MrQualityPage from './pages/mr/MrQualityPage'",
            )
        else:
            t = t.replace(
                "import Layout from './components/layout/Layout'",
                "import Layout from './components/layout/Layout'\nimport MrQualityPage from './pages/mr/MrQualityPage'",
            )
    t = t.replace(
        '<Route path="quality" element={<QualityDashboardPage />} />',
        '<Route path="quality" element={<MrQualityPage />} />',
    )
    t = t.replace(
        '<Route path="mr-quality" element={<MrQualityPage />} />',
        '<Route path="quality" element={<MrQualityPage />} />',
    )
    p.write_text(t, encoding="utf-8")
    print("  patched App.tsx → /quality = MrQualityPage")

p = Path("src/components/layout/Sidebar.tsx")
if p.exists():
    t = p.read_text(encoding="utf-8")
    t = t.replace(
        "  { to: '/mr-quality', icon: ShieldCheck, label: 'MR 품질 이슈' },\n",
        "",
    )
    if "{ to: '/quality'" not in t:
        t = t.replace(
            "{ to: '/planning', icon: GitBranch, label: '계획 추적성' },",
            "{ to: '/planning', icon: GitBranch, label: '계획 추적성' },\n  { to: '/quality', icon: ShieldCheck, label: '품질 이슈' },",
        )
    p.write_text(t, encoding="utf-8")
    print("  Sidebar.tsx → 품질 이슈 = /quality")
PY

echo ""
echo "  client.ts / .env 미변경"
echo "  다음: npm install && npm start"
echo "  메뉴: 품질 이슈  (/quality) — 프로젝트 OR + 차수/날짜 AND"
echo "=== Done ==="
