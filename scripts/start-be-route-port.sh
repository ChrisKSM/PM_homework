#!/bin/sh
# be-audio-test — FE가 쓰는 외부 URL(Route)용 uvicorn 8000 기동
#
# 증상: local8000 OK + external 502 + external diagnose token_length:0
# 원인: Route → port 8000, uvicorn 미기동
#
#   sh scripts/start-be-route-port.sh
#   curl -s https://be-audio-test.apps.axstudio.lge.com/api/jira/diagnose | python3 -m json.tool
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
PORT="${BE_ROUTE_PORT:-8000}"

if [ ! -f .env ] && [ ! -f /workspace/project/.env ]; then
  echo "Error: .env 없음 — JIRA_API_TOKEN 설정 필요"
  exit 1
fi

mkdir -p /usr/app/src
if [ -f /workspace/project/.env ]; then
  cp /workspace/project/.env /usr/app/src/.env
  echo "  copied .env → /usr/app/src/.env"
fi

if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "  port $PORT already UP"
  curl -s "http://127.0.0.1:${PORT}/api/jira/diagnose" | python3 -m json.tool 2>/dev/null | head -8 || true
  echo ""
  echo "  token 없으면: sh scripts/restart-be-route-port.sh  (8000 재시작)"
  exit 0
fi

PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"

echo "=== Starting uvicorn on 0.0.0.0:${PORT} (Route port) ==="
nohup $PY -m uvicorn main:app --host 0.0.0.0 --port "$PORT" \
  >> /tmp/uvicorn-${PORT}.log 2>&1 &
echo "  pid $! — log: /tmp/uvicorn-${PORT}.log"

for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "  local health OK"
    break
  fi
  sleep 1
done

curl -s "http://127.0.0.1:${PORT}/api/jira/diagnose" | python3 -m json.tool 2>/dev/null | head -15

echo ""
echo "=== external (FE URL) ==="
curl -s -o /dev/null -w "  issues/risks HTTP %{http_code}\n" \
  "https://be-audio-test.apps.axstudio.lge.com/api/issues/risks" || true
curl -s "https://be-audio-test.apps.axstudio.lge.com/api/jira/diagnose" \
  | python3 -m json.tool 2>/dev/null | head -12 || true

echo ""
echo "Route용 port $PORT 에 uvicorn 기동했습니다."
echo "=== Done ==="
