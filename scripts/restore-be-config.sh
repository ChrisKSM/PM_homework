#!/bin/sh
# sync로 덮어쓴 config.py / jira_client.py 회사 버전으로 복구
set -e
cd "$(dirname "$0")/.."

echo "=== config.py / jira_client.py 복구 ==="
echo ""
echo "최근 config.py 변경 이력:"
git log --oneline -8 -- config.py 2>/dev/null || true
echo ""
echo "reflog (방금 전 상태):"
git reflog | head -8
echo ""

# 인자로 커밋 지정 가능: sh scripts/restore-be-config.sh abc1234
TARGET="${1:-}"

if [ -n "$TARGET" ]; then
  git checkout "$TARGET" -- config.py jira_client.py
  echo "Restored from commit $TARGET"
elif git rev-parse HEAD@{1} >/dev/null 2>&1; then
  echo "HEAD@{1} 에서 복구 시도..."
  git checkout HEAD@{1} -- config.py jira_client.py 2>/dev/null && echo "OK" || {
    echo ""
    echo "자동 복구 실패. 아래처럼 patch 전 커밋 해시를 직접 지정하세요:"
    echo "  git log --oneline -10 -- config.py"
    echo "  sh scripts/restore-be-config.sh <커밋해시>"
    exit 1
  }
else
  echo "복구할 커밋을 지정하세요:"
  echo "  sh scripts/restore-be-config.sh <커밋해시>"
  exit 1
fi

echo ""
python3 -c "
from config import settings
print('jira_api_token length:', len((settings.jira_api_token or '').strip()))
" 2>/dev/null || python -c "
from config import settings
print('jira_api_token length:', len((settings.jira_api_token or '').strip()))
"
