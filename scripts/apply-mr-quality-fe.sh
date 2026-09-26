#!/bin/sh
# react-audio pod — H7/M7/W7 멀티 프로젝트 + 품질 이슈 현황(Polarion 필터) 적용.
# 프로젝트 이름 OR · 차수 AND · 생성일 From/To AND
# client.ts / .env / Dockerfile / .gitlab-ci.yml 은 건드리지 않음.
#
# /workspace/project (react-audio):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/apply-mr-quality-fe.sh github/webpack-migration
#   npm install && npm run build
#   git add -A && git commit -m "..." && git push   # GitLab CI 재배포

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply H7/M7/W7 품질 이슈 (Polarion 필터) from $REF ==="
mkdir -p src/api src/pages/mr src/components/mr src/components/layout src/utils src/store

for f in \
  src/App.tsx \
  src/components/layout/Sidebar.tsx \
  src/store/dashboardStore.ts \
  src/pages/mr/MrSchedulePage.tsx \
  src/pages/mr/MrQualityPage.tsx \
  src/pages/mr/MrBuildPlanPage.tsx \
  src/components/mr/DatePickerField.tsx \
  src/api/mrQualityApi.ts \
  src/utils/polarionQuery.ts
do
  show "$f" > "$f"
  echo "  + $f"
done

echo ""
echo "=== 검증 ==="
ERR=0
for pair in \
  "src/pages/mr/MrQualityPage.tsx:DatePickerField" \
  "src/pages/mr/MrQualityPage.tsx:DEFAULT_PROJECTS" \
  "src/api/mrQualityApi.ts:created_from" \
  "src/App.tsx:h7m7w7/quality"
do
  file="${pair%%:*}"
  needle="${pair##*:}"
  if grep -q "$needle" "$file"; then
    echo "  OK $file ($needle)"
  else
    echo "  MISSING $needle in $file"
    ERR=1
  fi
done
[ "$ERR" -eq 0 ] || exit 1

echo ""
echo "  client.ts / .env 미변경"
echo "  화면: H7/M7/W7 9월 MR → 품질 이슈 현황 (/h7m7w7/quality)"
echo "  다음: npm install && npm run build  →  git push (GitLab 재배포)"
echo "=== Done ==="
