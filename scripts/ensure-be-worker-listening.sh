#!/bin/sh
# 본인 Worker BE URL 503 (text/plain) — port 8000 uvicorn 미기동·import 실패
#   sh scripts/ensure-be-worker-listening.sh
#   sh scripts/restart-be-route-port.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
. "$(dirname "$0")/pod-detect.sh" 2>/dev/null || true
PORT="${BE_ROUTE_PORT:-8000}"
WORKER="${BE_WORKER_URL:-https://be-audio-test--8000--seokmin-koh.apps.axstudio.lge.com}"

echo "=== BE Worker listen check ==="
echo "  hostname: $(hostname)"
echo "  port:     $PORT"

if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
  echo "  OK  something listening on :$PORT"
  ss -tlnp 2>/dev/null | grep ":${PORT} " || true
else
  echo "  NG  nothing on :$PORT → Worker URL 은 503 (text/plain)"
  echo "      sh scripts/restart-be-route-port.sh"
fi

PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"

echo ""
echo "=== import main:app (실패 시 uvicorn 즉시 종료) ==="
if $PY -c "import main" 2>/tmp/be-import.err; then
  echo "  OK  import main"
else
  echo "  NG  import main:"
  head -15 /tmp/be-import.err
  echo "  → sh scripts/fix-tvjira-missing.sh 후 재시도"
  exit 1
fi

echo ""
echo "=== local API (Harmony sprint — S80C 등) ==="
CODE=$(curl -s -o /tmp/be_health.json -w "%{http_code}" "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "000")
echo "  GET /health → HTTP $CODE"
CODE=$(curl -s -o /tmp/be_sprint.json -w "%{http_code}" "http://127.0.0.1:${PORT}/api/sprints/current/summary" 2>/dev/null || echo "000")
echo "  GET /api/sprints/current/summary → HTTP $CODE"
if [ "$CODE" = "503" ] || [ "$CODE" = "502" ]; then
  head -c 200 /tmp/be_sprint.json; echo ""
fi

echo ""
echo "=== Worker URL (브라우저와 동일 host) ==="
echo "  $WORKER"
CODE=$(curl -s -o /tmp/be_worker.json -w "%{http_code}" "${WORKER}/health" 2>/dev/null || echo "000")
CT=$(curl -sI "${WORKER}/health" 2>/dev/null | grep -i content-type | tr -d '\r' || true)
echo "  GET /health → HTTP $CODE  ${CT:-}"
if [ "$CODE" = "503" ] && echo "$CT" | grep -qi text/plain; then
  echo "  → Route 앞단 503: 이 Pod :$PORT 에 uvicorn 없거나 Worker URL 이 다른 Pod 를 가리킴"
fi
if [ "$CODE" = "200" ]; then
  curl -sf "${WORKER}/api/jira/diagnose" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -12 || true
fi

echo ""
cat <<'TXT'
요약:
· 브라우저 Worker URL 503 + text/plain + content-length ~25
  → FastAPI 가 아니라 **프록시** — **uvicorn 이 8000 에 없음** (가장 흔함)
· patch/restart 할 때마다 import 실패·port 충돌 kill 후 재기동 실패 → 503
· localhost 200 인데 Worker 503 → AX Worker Route ↔ Pod 불일치 (드묾)

항상 BE pod 에서:
  sh scripts/ensure-be-worker-listening.sh
  sh scripts/restart-be-route-port.sh
  tail -30 /tmp/uvicorn-8000.log
TXT
