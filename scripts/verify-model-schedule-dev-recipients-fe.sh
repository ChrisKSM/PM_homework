#!/bin/sh
# FE — overview Snapshot 개발 수신자(swPm) 반영 검증
set -e
cd "$(dirname "$0")/.."

ok=0
fail=0

check() {
  name="$1"
  shift
  if eval "$@"; then
    echo "  ✓ $name"
    ok=$((ok + 1))
  else
    echo "  ✗ $name"
    fail=$((fail + 1))
  fi
}

echo "=== Verify overview dev recipients FE ==="

check "modelScheduleDevRecipients.ts" "[ -f src/utils/modelScheduleDevRecipients.ts ]"
check "devEmailsFromSwPm export" "grep -q 'export function devEmailsFromSwPm' src/utils/modelScheduleDevRecipients.ts"
check "고석민 mapping" "grep -q \"고석민: 'seokmin.koh@lge.com'\" src/utils/modelScheduleDevRecipients.ts"
check "OverviewSnapshotDialog imports util" "grep -q 'modelScheduleDevRecipients' src/components/modelSchedule/OverviewSnapshotDialog.tsx"
check "uses devRecipients" "grep -q 'devRecipients' src/components/modelSchedule/OverviewSnapshotDialog.tsx"
check "no hardcoded seokmin override" "! grep -q \"recipients: \\['seokmin.koh@lge.com'\\]\" src/components/modelSchedule/OverviewSnapshotDialog.tsx"
check "no 테스트 seokmin UI" "! grep -q '테스트: seokmin.koh@lge.com' src/components/modelSchedule/OverviewSnapshotDialog.tsx"

echo ""
if [ "$fail" -eq 0 ]; then
  echo "✅ FE dev recipients OK ($ok checks)"
  exit 0
fi

echo "❌ FE dev recipients FAIL ($fail failed, $ok passed)"
echo "  sh scripts/apply-model-schedule-dev-recipients-fe.sh"
exit 1
