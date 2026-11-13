#!/bin/sh
# Pod 종류 자동 안내 — PRD 패치는 FE/BE 각각 1회
#
#   curl -fsSL ".../patch-model-status-prd-hint.sh" | REF=8937333 sh
#
REF="${REF:-8937333}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1

echo "=== PRD patch hint @ $REF (cwd=$(pwd)) ==="
if [ -f main.py ] && [ -d routers ]; then
  echo "Detected: BE pod"
  echo "  curl -fsSL \"$BASE/scripts/patch-be-model-status-prd-from-github.sh\" | REF=$REF sh"
elif [ -f package.json ] && [ -d src ]; then
  echo "Detected: FE pod"
  echo "  curl -fsSL \"$BASE/scripts/patch-fe-model-status-prd-from-github.sh\" | REF=$REF sh"
  echo "  npm run build"
else
  echo "Unknown pod layout — main.py( BE ) 또는 package.json( FE ) 확인"
fi
