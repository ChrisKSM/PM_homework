#!/bin/sh
# FE pod — 「릴리즈 · Epic」 탭 원클릭 (소스 fetch + build + push 안내)
#
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   sh scripts/apply-model-status-release-fe.sh
#
# 통합(검증+Initiative+릴리즈): fe-verification-patch-min.sh 도 동일 REF 사용

set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-github/cursor/model-schedule-bar-label-fix-b14b}"
cd "$ROOT"

if [ -f scripts/fe-model-status-release-gantt-patch.sh ]; then
  REF="${REF#github/}"
  REF="${REF#origin/}"
  export REF ROOT
  sh scripts/fe-model-status-release-gantt-patch.sh
else
  BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b"
  curl -fsSL "$BASE/scripts/fe-model-status-release-gantt-patch.sh" | REF=cursor/model-schedule-bar-label-fix-b14b sh
fi

echo ""
echo "=== git 상태 (push 안 하면 사이트 탭 4개 그대로) ==="
for f in \
  src/data/modelStatusCatalog.ts \
  src/components/modelStatus/ModelIntegratedDashboard.tsx \
  src/components/modelStatus/ModelStatusReleaseEpicGantt.tsx \
  src/api/modelStatusApi.ts \
  src/hooks/useModelStatusReleaseGantt.ts
do
  if git diff --quiet HEAD -- "$f" 2>/dev/null; then
    echo "  same  $f (already committed?)"
  else
    echo "  DIFF  $f  ← git add 필요"
  fi
done

TAB_COUNT="$(grep -c "id: '" src/data/modelStatusCatalog.ts 2>/dev/null || echo 0)"
echo ""
echo "  catalog tabs (id lines): $TAB_COUNT (기대: 5 — summary, release, initiative, prd, issues)"
echo ""
echo "  git add -A && git commit -m 'feat: 모델현황 릴리즈 Epic 탭' && git push origin master"
echo "  GitLab CI 완료 후: sh scripts/verify-model-status-release-fe-deployed.sh"
