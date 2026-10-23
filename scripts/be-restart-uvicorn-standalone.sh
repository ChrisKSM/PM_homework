#!/bin/sh
# BE pod only — pod-detect.sh 없이 uvicorn 8000 기동 (Worker URL 503 해소)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/be-restart-uvicorn-standalone.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1

if [ ! -f main.py ] || [ ! -d routers ]; then
  echo "NG: BE pod /workspace/project (main.py + routers/) 에서 실행하세요"
  exit 1
fi

PORT="${BE_ROUTE_PORT:-8000}"

if [ -f .env ]; then
  mkdir -p /usr/app/src 2>/dev/null || true
  cp .env /usr/app/src/.env 2>/dev/null || true
  echo "OK  .env copied (if path exists)"
fi

# stop old listener on PORT (best effort)
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sleep 1
fi

if [ -x venv/bin/python ]; then
  PY="venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY="python3"
else
  echo "NG: python3 or venv/bin/python required"
  exit 1
fi

echo "=== import main:app ==="
if ! "$PY" -c "import main" 2>/tmp/be-import.err; then
  echo "NG  import main failed:"
  head -20 /tmp/be-import.err
  exit 1
fi
echo "OK  import main"

echo "=== uvicorn 0.0.0.0:$PORT ==="
nohup "$PY" -m uvicorn main:app --host 0.0.0.0 --port "$PORT" >>"/tmp/uvicorn-${PORT}.log" 2>&1 &
echo "  pid $!  log /tmp/uvicorn-${PORT}.log"

i=1
while [ "$i" -le 15 ]; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "OK  GET /health → 200"
    curl -s -o /dev/null -w "OK  GET /api/model-schedule/overview/load → %{http_code}\n" \
      "http://127.0.0.1:${PORT}/api/model-schedule/overview/load" || true
    exit 0
  fi
  sleep 1
  i=$((i + 1))
done

echo "NG  /health still not 200 — tail /tmp/uvicorn-${PORT}.log"
tail -30 "/tmp/uvicorn-${PORT}.log" 2>/dev/null || true
exit 1
