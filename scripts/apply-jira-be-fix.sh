#!/bin/sh
# be-audio-test pod — Jira 502 수정 (jira_client + diagnose + token 경로)
#
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   sh scripts/apply-jira-be-fix.sh
#   # uvicorn 8200 재시작
#   sh scripts/verify-jira-be.sh
set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' 없음"
  echo "  git fetch github cursor/model-schedule-bar-label-fix-b14b"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Jira BE fix from $REF ==="

for f in backend/jira_client.py backend/routers/manager.py; do
  dest="${f#backend/}"
  show "$f" > "$dest"
  echo "  + $dest"
done

for f in scripts/verify-jira-be.sh scripts/fix-be-token.sh scripts/apply-jira-be-fix.sh; do
  show "$f" > "$f"
  chmod +x "$f"
  echo "  + $f"
done

echo ""
sh scripts/fix-be-token.sh "$REF"

echo ""
echo "=== 다음: uvicorn 8200 재시작 ==="
echo "  uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8200"
echo ""
echo "=== 검증 ==="
echo "  sh scripts/verify-jira-be.sh"
echo "=== Done ==="
