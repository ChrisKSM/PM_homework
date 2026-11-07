#!/bin/sh
# BE pod — 503/502 (Route/Worker) 빠른 진단
#   sh scripts/diagnose-be-503.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
PORT="${BE_ROUTE_PORT:-8000}"

echo "=== BE 503/502 진단 (port $PORT) ==="
echo "  $(hostname)  $(date -u +%Y-%m-%dT%H:%M:%SZ) UTC"
echo ""

echo "=== 1) 8000 리스닝 여부 ==="
if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
  ss -tlnp 2>/dev/null | grep ":${PORT} " || true
else
  echo "  NG  :${PORT} 에 리스너 없음 → Route/Worker 503/502 (uvicorn 미기동 또는 크래시)"
fi
echo ""

echo "=== 2) GET /health (local) ==="
CODE=$(curl -s -o /tmp/be_health.json -w "%{http_code}" --max-time 5 \
  "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "000")
echo "  HTTP $CODE"
[ "$CODE" = "200" ] && cat /tmp/be_health.json 2>/dev/null
echo ""

echo "=== 3) import main (uvicorn 기동 전 필수) ==="
PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"
[ -x venv/bin/python ] && [ ! -x "$(command -v uv 2>/dev/null)" ] && PY="venv/bin/python"
if $PY -c "import main" 2>/tmp/import_main.err; then
  echo "  OK  $PY import main"
else
  echo "  NG  import main 실패 — uvicorn은 즉시 종료 → 외부 503"
  sed -n '1,15p' /tmp/import_main.err
fi
echo ""

echo "=== 4) uvicorn 로그 (최근) ==="
LOG="/tmp/uvicorn-${PORT}.log"
if [ -f "$LOG" ]; then
  tail -15 "$LOG" 2>/dev/null | sed 's/^/  /'
else
  echo "  (없음) $LOG"
fi
echo ""

echo "=== 5) 해석 / 조치 ==="
cat <<TXT
· 플랫폼 "8일 전 uvicorn 실행 중" = **배포 시점 기동 프로세스**일 수 있음.
  실제로는 import 실패·OOM·크래시 후 **8000이 비었는데** supervisor만 남는 경우도 있음.
  → pod 안에서 \`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/health\` 가 200인지가 기준.

· **수동 재기동으로 대부분 복구됨** (이 pod의 Route/Worker가 이 pod를 볼 때):
    cp .env /usr/app/src/.env 2>/dev/null || true
    sh scripts/restart-be-route-port.sh
  또는:
    uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8000
  (기존 8000 PID kill 후 nohup — restart-be-route-port.sh 가 처리)

· health=200 인데 브라우저만 503 → FE가 **공용 be-audio-test Route** 를 치거나 **다른 replica** 일 수 있음.
    sh scripts/diagnose-be-route-vs-local.sh

· pod 재시작(Deployment rollout) 후에도 반복되면 AX Variables + import main NG 원인(누락 모듈)을 먼저 해결.
TXT
echo "=== Done ==="
