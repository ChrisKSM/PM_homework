#!/bin/sh
# FE pod — 모델현황 PRD 탭 (ALM probe UI)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/REF/scripts/patch-fe-model-status-prd-from-github.sh" | REF=REF sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== FE model-status PRD @ $REF ==="
fetch src/types/modelStatusPrd.ts src/types/modelStatusPrd.ts
fetch src/api/modelStatusApi.ts src/api/modelStatusApi.ts
fetch src/components/modelStatus/ModelStatusPrdPanel.tsx src/components/modelStatus/ModelStatusPrdPanel.tsx
fetch src/components/modelStatus/ModelIntegratedDashboard.tsx src/components/modelStatus/ModelIntegratedDashboard.tsx
fetch src/utils/modelStatusPrdWorkflow.ts src/utils/modelStatusPrdWorkflow.ts

echo "  npm run build (optional on pod)"
echo "=== patch-fe-model-status-prd done ==="
