#!/bin/sh
# FE pod — 모델현황 PRD 탭 (ALM probe UI)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/REF/scripts/patch-fe-model-status-prd-from-github.sh" | REF=REF sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f package.json ] || [ ! -d src/components/modelStatus ]; then
  echo "ERROR: FE pod 아님 (package.json / src/components/modelStatus 없음) — cwd=$(pwd)" >&2
  echo "  → BE pod 에서는 patch-be-model-status-prd-from-github.sh 를 실행하세요." >&2
  exit 1
fi

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== FE model-status PRD @ $REF ==="
echo "  (BE API·라벨 저장은 be-audio-test pod — patch-be-model-status-prd-from-github.sh)"
fetch src/types/modelStatusPrd.ts src/types/modelStatusPrd.ts
fetch src/api/modelStatusApi.ts src/api/modelStatusApi.ts
fetch src/components/modelStatus/ModelStatusPrdPanel.tsx src/components/modelStatus/ModelStatusPrdPanel.tsx
fetch src/components/modelStatus/ModelIntegratedDashboard.tsx src/components/modelStatus/ModelIntegratedDashboard.tsx
fetch src/utils/modelStatusPrdWorkflow.ts src/utils/modelStatusPrdWorkflow.ts
fetch scripts/verify-model-status-prd-fe-deployed.sh scripts/verify-model-status-prd-fe-deployed.sh
chmod +x scripts/verify-model-status-prd-fe-deployed.sh 2>/dev/null || true

grep -q ModelStatusPrdPanel src/components/modelStatus/ModelIntegratedDashboard.tsx \
  && echo "  OK  ModelIntegratedDashboard → PRD tab wired"

if [ "${RUN_BUILD:-1}" = "1" ] && command -v npm >/dev/null 2>&1; then
  echo ""
  echo "=== npm run build ==="
  npm run build
  sh scripts/verify-model-status-prd-fe-deployed.sh || true
else
  echo ""
  echo "  build 생략 — RUN_BUILD=1 npm run build 후 verify"
fi

echo ""
echo "  배포: git push origin master (팀 절차에 맞게)"
echo "=== patch-fe-model-status-prd done ==="
