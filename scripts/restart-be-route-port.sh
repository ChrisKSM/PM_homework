#!/bin/sh
# be-audio-test — Route 포트(8000) uvicorn 재시작 (.env + Jira token 반영)
#
# FE(브라우저) → be-audio-test Route → port 8000
# pod 수동 dev → port 8200 (별도)
#
#   sh scripts/restart-be-route-port.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
PORT="${BE_ROUTE_PORT:-8000}"

if [ ! -f .env ] && [ ! -f /workspace/project/.env ]; then
  echo "Error: .env 없음"
  exit 1
fi

mkdir -p /usr/app/src
cp /workspace/project/.env /usr/app/src/.env
echo "  .env → /usr/app/src/.env"

echo "=== port $PORT listen ==="
ss -tlnp 2>/dev/null | grep ":${PORT} " || netstat -tlnp 2>/dev/null | grep ":${PORT} " || echo "  (not listening)"

PID=""
if command -v ss >/dev/null 2>&1; then
  PID=$(ss -tlnp 2>/dev/null | grep ":${PORT} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
elif command -v netstat >/dev/null 2>&1; then
  PID=$(netstat -tlnp 2>/dev/null | grep ":${PORT} " | awk '{print $7}' | cut -d/ -f1 | head -1)
fi

if [ -n "$PID" ] && [ "$PID" != "-" ]; then
  echo "  stopping pid $PID on port $PORT"
  kill "$PID" 2>/dev/null || true
  sleep 2
  kill -0 "$PID" 2>/dev/null && kill -9 "$PID" 2>/dev/null || true
fi

PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"

echo "=== starting uvicorn 0.0.0.0:$PORT ==="
nohup $PY -m uvicorn main:app --host 0.0.0.0 --port "$PORT" \
  >> "/tmp/uvicorn-${PORT}.log" 2>&1 &
NEW_PID=$!
echo "  pid $NEW_PID — log /tmp/uvicorn-${PORT}.log"

for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && break
  sleep 1
done

echo ""
echo "=== local $PORT ==="
curl -s "http://127.0.0.1:${PORT}/api/jira/diagnose" | python3 -m json.tool 2>/dev/null | head -14

echo ""
echo "=== external (FE) ==="
curl -s -o /dev/null -w "  issues/risks HTTP %{http_code}\n" \
  "https://be-audio-test.apps.axstudio.lge.com/api/issues/risks" || true
curl -s "https://be-audio-test.apps.axstudio.lge.com/api/jira/diagnose" \
  | python3 -m json.tool 2>/dev/null | head -10 || true

echo ""
echo "8200 dev uvicorn은 건드리지 않았습니다."
echo "=== Done ==="
