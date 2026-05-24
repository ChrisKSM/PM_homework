#!/bin/sh
# config.py / .env 건드리지 않음 — jira_client.py만 교체 + prod .env 경로 복사
set -e
cd "$(dirname "$0")/.."
REF="${1:-github/webpack-migration}"

echo "=== fix BE token (jira_client only) ==="

git fetch github webpack-migration 2>/dev/null || true
git show "$REF:backend/jira_client.py" > jira_client.py
echo "  updated jira_client.py"

if [ -f /workspace/project/.env ] && [ -d /usr/app/src ]; then
  cp /workspace/project/.env /usr/app/src/.env
  echo "  copied .env -> /usr/app/src/.env"
fi

python3 -c "
from jira_client import _resolve_jira_token
t = _resolve_jira_token()
print('token OK, length:', len(t))
" 2>/dev/null || python -c "
from jira_client import _resolve_jira_token
t = _resolve_jira_token()
print('token OK, length:', len(t))
"

echo ""
echo "GitLab push + 재배포 후:"
echo "  curl -s https://be-audio-test.apps.hedej.lge.com/api/issues/risks | head -c 120"
echo "=== Done ==="
