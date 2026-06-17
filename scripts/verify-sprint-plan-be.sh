#!/bin/sh
# be-audio-test pod — sprint-plan API 확인
set -e
BASE="${1:-http://127.0.0.1:8000}"

echo "=== sprint-plan ping ==="
curl -sf "$BASE/api/sprint-plan/ping" | head -c 500
echo ""

echo ""
echo "=== sprint-plan forecast (첫 600자) ==="
HTTP_F=$(curl -s -o /tmp/sp-forecast.json -w "%{http_code}" "$BASE/api/sprint-plan/forecast")
head -c 600 /tmp/sp-forecast.json
echo ""
echo "HTTP $HTTP_F"
if [ "$HTTP_F" != "200" ]; then
  echo "FAIL forecast — detail:"
  cat /tmp/sp-forecast.json
  exit 1
fi

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
