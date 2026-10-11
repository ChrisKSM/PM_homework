#!/bin/sh
# be-audio-test pod (/workspace/project) — Jira 502 수정 (jira_client + diagnose + token)
#
# ⚠️ scripts/apply-jira-be-fix.sh 가 pod에 없으면 (최초 1회):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
#     scripts/apply-jira-be-fix.sh \
#     scripts/verify-jira-be.sh \
#     scripts/fix-be-token.sh
#   chmod +x scripts/apply-jira-be-fix.sh scripts/verify-jira-be.sh scripts/fix-be-token.sh
#
#   sh scripts/apply-jira-be-fix.sh
#   # uvicorn 8000 재시작
#   sh scripts/verify-jira-be.sh
#
# ⚠️ git checkout 도 안 될 때 (스크립트 없이 직접 적용):
#   REF=github/cursor/model-schedule-bar-label-fix-b14b
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   mkdir -p scripts routers
#   git show $REF:backend/jira_client.py > jira_client.py
#   git show $REF:backend/routers/manager.py > routers/manager.py
#   git show $REF:scripts/fix-be-token.sh > scripts/fix-be-token.sh
#   git show $REF:scripts/verify-jira-be.sh > scripts/verify-jira-be.sh
#   chmod +x scripts/*.sh
#   sh scripts/fix-be-token.sh $REF
#   # uvicorn 8000 재시작 && sh scripts/verify-jira-be.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
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

for f in \
  scripts/verify-jira-be.sh \
  scripts/fix-be-token.sh \
  scripts/restore-be-jira-env.sh \
  scripts/apply-jira-be-fix.sh
do
  show "$f" > "$f"
  chmod +x "$f"
  echo "  + $f"
done

echo ""
sh scripts/fix-be-token.sh "$REF"

echo ""
echo "=== 다음: uvicorn 8000 재시작 ==="
echo "  uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo ""
echo "=== 검증 ==="
echo "  sh scripts/verify-jira-be.sh"
echo "=== Done ==="
