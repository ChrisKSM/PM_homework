#!/bin/sh
# FE pod — captureOverviewPages.ts 누락 / html2canvas 미설치 빌드 오류 수정
#
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   sh scripts/fix-overview-fe-capture-module.sh
#   npm run build
set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github cursor/model-schedule-bar-label-fix-b14b 먼저"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Fix overview FE capture module from $REF ==="
mkdir -p src/utils src/components/modelSchedule

for f in \
  src/utils/captureOverviewPages.ts \
  src/components/modelSchedule/OverviewSnapshotDialog.tsx \
  src/pages/ModelScheduleOverviewPage.tsx \
  src/api/modelScheduleApi.ts
do
  show "$f" > "$f"
  echo "  + $f"
done

if [ ! -f src/utils/captureOverviewPages.ts ]; then
  echo "Error: captureOverviewPages.ts 복사 실패"
  exit 1
fi

if ! grep -q '"html2canvas"' package.json 2>/dev/null; then
  echo "  + npm install html2canvas"
  npm install html2canvas@^1.4.1 --save
else
  echo "  OK  html2canvas in package.json"
  npm install html2canvas@^1.4.1 2>/dev/null || true
fi

echo ""
echo "=== 다음: npm run build && git add -A && git commit && git push origin master ==="
echo "=== Done ==="
