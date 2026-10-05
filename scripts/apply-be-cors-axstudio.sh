#!/bin/sh
# be-audio-test pod (/workspace/project) — CORS axstudio FE 허용 (한 번에)
#
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- scripts/apply-be-cors-axstudio.sh
#   chmod +x scripts/apply-be-cors-axstudio.sh
#   sh scripts/apply-be-cors-axstudio.sh
#   # uvicorn 8200 재시작
set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' 없음"
  echo "  git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true"
  echo "  git fetch github cursor/model-schedule-bar-label-fix-b14b"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== BE pod CORS fix (axstudio react-audio) from $REF ==="
mkdir -p scripts

for f in \
  scripts/patch-be-config-cors.sh \
  scripts/patch-be-main-cors.sh \
  scripts/patch-env-cors-axstudio.sh \
  scripts/verify-overview-be-deployed.sh
do
  show "$f" > "$f"
  chmod +x "$f"
  echo "  + $f"
done

sh scripts/patch-be-config-cors.sh "$REF"
sh scripts/patch-be-main-cors.sh
sh scripts/patch-env-cors-axstudio.sh .env

echo ""
echo "=== 다음: uvicorn 8200 재시작 ==="
echo "  uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8200"
echo ""
echo "=== 검증 ==="
echo "  sh scripts/verify-overview-be-deployed.sh"
echo "=== Done ==="
