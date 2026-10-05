#!/bin/sh
# FE pod — 전 모델 일정 신규 UI 배포 여부 확인
#
#   sh scripts/verify-overview-fe-deployed.sh
#
# ✅ 신규 UI: A~H 8열, HW/SW 2행, subtitle "A~H 메타"
# ❌ 구 UI: 생산/HW PM/SW PO 12열, 1행 타임라인

set -e
cd "$(dirname "$0")/.."
FAIL=0

check() {
  if eval "$2"; then
    echo "  OK  $1"
  else
    echo "  NG  $1"
    FAIL=1
  fi
}

echo "=== 전 모델 일정 FE 배포 검증 ==="

check "OverviewScheduleTable.tsx exists" "[ -f src/components/modelSchedule/OverviewScheduleTable.tsx ]"
check "overviewBarStyles.ts exists" "[ -f src/utils/overviewBarStyles.ts ]"
check "Page subtitle A~H meta" "grep -q 'A~H 메타' src/pages/ModelScheduleOverviewPage.tsx"
check "No old 생산 column in overview page" "! grep -q '생산' src/pages/ModelScheduleOverviewPage.tsx"
check "HW/SW timelineKind in utils" "grep -q 'timelineKind' src/utils/modelScheduleOverviewRows.ts"
check "8 meta columns defined" "grep -q \"label: 'SW'\" src/utils/modelScheduleOverviewRows.ts"

if [ -d build ]; then
  if grep -rq 'A~H 메타' build/ 2>/dev/null; then
    echo "  OK  build/ contains new UI strings"
  else
    echo "  NG  build/ is old — run: npm run build"
    FAIL=1
  fi
else
  echo "  --  build/ 없음 (npm run build 후 재확인)"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 소스는 신규 UI. git push + GitLab 재배포 후 브라우저 강력 새로고침(Ctrl+Shift+R)"
else
  echo "❌ 구버전 또는 미배포. 아래 실행:"
  echo "  git fetch github cursor/model-schedule-bar-label-fix-b14b"
  echo "  sh scripts/apply-model-schedule-overview-fe.sh"
  echo "  npm run build && git push origin master"
fi
echo "=== Done ==="
exit "$FAIL"
