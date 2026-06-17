#!/bin/sh
# be-audio-test pod — sprint-plan API 확인
set -e
BASE="${1:-http://127.0.0.1:8000}"

echo "=== sprint-plan ping ==="
curl -sf "$BASE/api/sprint-plan/ping" | head -c 500
echo ""

echo ""
echo "=== sprint-plan timeline (첫 800자) ==="
HTTP=$(curl -s -o /tmp/sp-timeline.json -w "%{http_code}" "$BASE/api/sprint-plan/timeline")
head -c 800 /tmp/sp-timeline.json
echo ""
echo "HTTP $HTTP"
if [ "$HTTP" != "200" ]; then
  echo "FAIL — detail 확인:"
  cat /tmp/sp-timeline.json
  exit 1
fi
