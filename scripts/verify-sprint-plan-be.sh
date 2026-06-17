#!/bin/sh
# be-audio-test pod — sprint-plan API 확인
set -e
BASE="${1:-http://127.0.0.1:8000}"

echo "=== sprint-plan ping ==="
curl -sf "$BASE/api/sprint-plan/ping" | head -c 500
echo ""

echo ""
echo "=== sprint-plan timeline (첫 800자) ==="
curl -sf "$BASE/api/sprint-plan/timeline" | head -c 800
echo ""
echo ""
echo "=== OK (502면 JIRA_API_TOKEN / board 12641 확인) ==="
