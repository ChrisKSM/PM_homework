#!/bin/sh
# FE pod — 전 모델 일정: 머리글 + 제품군~개발등급 틀 고정, 표 내부 상하/좌우 스크롤 (화면 높이에 맞춤)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-fe-overview-freeze-from-github.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f package.json ] || [ ! -d src/pages ]; then
  echo "ERROR: FE pod 아님 — package.json / src/pages 필요 (cwd=$(pwd))" >&2
  exit 1
fi

fetch() {
  mkdir -p "$(dirname "$1")"
  curl -fsSL -H "Cache-Control: no-cache" "${BASE}/$1" -o "$1"
  echo "  + $1"
}

echo "=== FE overview freeze panes @ ${REF} ==="
fetch src/components/modelSchedule/OverviewScheduleTable.tsx
fetch src/pages/ModelScheduleOverviewPage.tsx
fetch src/hooks/useViewportFitHeight.ts
fetch src/index.css

grep -q 'frozenMetaCount={3}' src/pages/ModelScheduleOverviewPage.tsx && echo "  OK  제품군~개발등급 고정"
grep -q 'stickyHeader' src/components/modelSchedule/OverviewScheduleTable.tsx && echo "  OK  머리글 고정"
grep -q 'useViewportFitHeight' src/pages/ModelScheduleOverviewPage.tsx && echo "  OK  표 내부 스크롤 (화면 높이)"

if [ "${RUN_BUILD:-1}" = "1" ] && command -v npm >/dev/null 2>&1; then
  echo ""
  echo "=== npm run build ==="
  npm run build
else
  echo "  build 생략 — npm run build"
fi
echo "=== Done — /model-schedule/overview 새로고침 ==="
