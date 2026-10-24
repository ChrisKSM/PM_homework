#!/bin/sh
# react-audio FE pod — 전 모델 일정 (Mongo 표시 · 일정가져오기 · 3개월 타임라인 · 모델현황 링크)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/fdc8161/scripts/patch-fe-overview-portal-sync-from-github.sh" | REF=fdc8161 sh
#   REF=fdc8161 sh scripts/patch-fe-overview-portal-sync-from-github.sh
#
#   npm run build && git add -A && git commit -m "feat: overview portal sync UI" && git push origin master
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-fdc8161}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  dest="$1"
  repo_path="$2"
  mkdir -p "$(dirname "$dest")"
  echo "  + $dest"
  curl -fsSL "${BASE}/${repo_path}" -o "$dest"
}

echo "=== FE patch: overview portal sync @ ${REF} ==="

fetch src/pages/ModelScheduleOverviewPage.tsx src/pages/ModelScheduleOverviewPage.tsx
fetch src/pages/ModelScheduleStatusPage.tsx src/pages/ModelScheduleStatusPage.tsx
fetch src/components/layout/Header.tsx src/components/layout/Header.tsx
fetch src/api/modelScheduleApi.ts src/api/modelScheduleApi.ts
fetch src/utils/overviewModelStatusLink.ts src/utils/overviewModelStatusLink.ts
fetch src/utils/overviewTimelineRange.ts src/utils/overviewTimelineRange.ts

# 스크립트 자체·검증·기존 overview bundle (누락 방지)
fetch scripts/patch-fe-overview-portal-sync-from-github.sh scripts/patch-fe-overview-portal-sync-from-github.sh
fetch scripts/apply-model-schedule-overview-fe.sh scripts/apply-model-schedule-overview-fe.sh
fetch scripts/verify-overview-fe-deployed.sh scripts/verify-overview-fe-deployed.sh

chmod +x scripts/patch-fe-overview-portal-sync-from-github.sh 2>/dev/null || true
chmod +x scripts/apply-model-schedule-overview-fe.sh 2>/dev/null || true
chmod +x scripts/verify-overview-fe-deployed.sh 2>/dev/null || true

echo ""
echo "=== Verify ==="
if grep -q '일정가져오기' src/pages/ModelScheduleOverviewPage.tsx 2>/dev/null; then
  echo "  OK: 일정가져오기"
else
  echo "  WARN: ModelScheduleOverviewPage — 일정가져오기 문자열 없음"
fi
if grep -q 'syncOverviewFromDeliveryPortal' src/api/modelScheduleApi.ts 2>/dev/null; then
  echo "  OK: syncOverviewFromDeliveryPortal API"
else
  echo "  WARN: modelScheduleApi sync missing"
fi
if grep -q 'buildOverviewTimelineDates' src/pages/ModelScheduleOverviewPage.tsx 2>/dev/null; then
  echo "  OK: 3-month timeline"
else
  echo "  WARN: timeline range helper missing"
fi

echo ""
echo "  npm run build"
echo "  git add -A && git commit -m 'feat: overview Delivery Portal sync UI' && git push origin master"
echo "  화면: /model-schedule/overview"
echo "=== Done ==="
