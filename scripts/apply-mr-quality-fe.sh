#!/bin/sh
# react-audio pod — Polarion MR 품질 페이지만 적용. client.ts / .env 유지.
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

echo "=== Apply MR quality FE from $REF ==="
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
    if "MrQualityPage" not in t:
        t = t.replace(
            "import QualityDashboardPage from './pages/QualityDashboardPage'",
            "import QualityDashboardPage from './pages/QualityDashboardPage'\nimport MrQualityPage from './pages/mr/MrQualityPage'",
        )
        t = t.replace(
            '<Route path="quality" element={<QualityDashboardPage />} />',
            '<Route path="quality" element={<QualityDashboardPage />} />\n          <Route path="mr-quality" element={<MrQualityPage />} />',
        )
        p.write_text(t, encoding="utf-8")
        print("  patched App.tsx")
    else:
        print("  App.tsx OK")

p = Path("src/components/layout/Sidebar.tsx")
if p.exists():
    t = p.read_text(encoding="utf-8")
    if "/mr-quality" not in t:
        t = t.replace(
            "{ to: '/quality', icon: ShieldCheck, label: '품질 이슈' },",
            "{ to: '/quality', icon: ShieldCheck, label: '품질 이슈' },\n  { to: '/mr-quality', icon: ShieldCheck, label: 'MR 품질 이슈' },",
        )
        p.write_text(t, encoding="utf-8")
        print("  patched Sidebar.tsx")
    else:
        print("  Sidebar.tsx OK")
PY

echo ""
echo "  client.ts / .env 미변경"
echo "  다음: npm install && npm start"
echo "  메뉴: MR 품질 이슈  (/mr-quality)"
echo "=== Done ==="
