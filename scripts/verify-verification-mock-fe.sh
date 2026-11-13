#!/bin/sh
# FE — verification mock 배포 전 확인
set -e
cd "$(dirname "$0")/.."

ok=0
fail=0
check(){ if eval "$@"; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1"; fail=$((fail+1)); fi; }

echo "=== Verify verification mock FE ==="
check "ModelSchedulePage mock" "grep -q 'model-schedule-verification-mock.json' src/pages/ModelSchedulePage.tsx"
check "mock ts" "[ -f src/data/modelScheduleVerificationMock.ts ]"
check "public json" "[ -f public/model-schedule-verification-mock.json ]"
check "build dir" "[ -d build ] && [ -f build/model-schedule-verification-mock.json ]"

if [ "$fail" -eq 0 ]; then
  echo "✅ OK ($ok)"
  exit 0
fi
echo "❌ npm run build 후 build/model-schedule-verification-mock.json 확인"
exit 1
