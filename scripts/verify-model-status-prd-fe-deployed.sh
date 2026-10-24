#!/bin/sh
# FE pod — PRD 탭 UI 배포 확인
#   sh scripts/verify-model-status-prd-fe-deployed.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
FAIL=0

check() {
  if eval "$2" >/dev/null 2>&1; then
    echo "  OK  $1"
  else
    echo "  NG  $1"
    FAIL=1
  fi
}

echo "=== verify model-status PRD FE ==="
check "ModelStatusPrdPanel" "test -f src/components/modelStatus/ModelStatusPrdPanel.tsx"
check "dashboard imports PRD panel" "grep -q ModelStatusPrdPanel src/components/modelStatus/ModelIntegratedDashboard.tsx"
check "dashboard PRD section wired" "grep -q model-status-prd-section src/components/modelStatus/ModelIntegratedDashboard.tsx"
check "useModelStatusPrd hook" "test -f src/hooks/useModelStatusPrd.ts"
check "workflow utils" "test -f src/utils/modelStatusPrdWorkflow.ts"
check "savePrdReviewLabel API" "grep -q savePrdReviewLabel src/api/modelStatusApi.ts"
check "검토 라벨 UI string" "grep -q '검토 라벨' src/components/modelStatus/ModelStatusPrdPanel.tsx"

if [ -d build ]; then
  if grep -rq '검토 라벨별 묶음' build/ 2>/dev/null; then
    echo "  OK  build/ contains PRD label UI"
  else
    echo "  NG  build/ old — run: npm run build"
    FAIL=1
  fi
else
  echo "  WARN  no build/ — npm run build"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "✅ PRD FE OK"
else
  echo "❌ REF=8937333 curl .../patch-fe-model-status-prd-from-github.sh | sh && npm run build"
fi
exit "$FAIL"
