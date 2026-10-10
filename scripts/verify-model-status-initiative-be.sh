#!/bin/sh
# BE — 모델현황 Initiative API 검증
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0

if [ -n "${1:-}" ]; then
  BASE="$1"
else
  BASE=""
  for p in 8200 8000; do
    if curl -sf "http://127.0.0.1:${p}/health" >/dev/null 2>&1; then
      BASE="http://127.0.0.1:${p}"
      break
    fi
  done
  [ -n "$BASE" ] || BASE="http://127.0.0.1:8200"
fi

echo "=== Model Status Initiative BE ($BASE) ==="

if [ -f services/model_status_initiative_service.py ]; then
  echo "  OK  services/model_status_initiative_service.py"
else
  echo "  NG  model_status_initiative_service — be-model-status-initiative-patch.sh"
  FAIL=1
fi

if [ -f routers/model_status.py ]; then
  echo "  OK  routers/model_status.py"
else
  echo "  NG  routers/model_status.py"
  FAIL=1
fi

CODE=$(curl -s -o /tmp/ms_init_ping.json -w "%{http_code}" "${BASE}/api/model-status/initiatives/ping" 2>/dev/null || echo "000")
echo "  GET /api/model-status/initiatives/ping → HTTP $CODE"
if [ "$CODE" != "200" ]; then
  head -c 300 /tmp/ms_init_ping.json 2>/dev/null || true
  echo ""
  FAIL=1
else
  grep -q H7_VI /tmp/ms_init_ping.json 2>/dev/null && echo "  OK  ping lists H7_VI" || true
fi

CODE=$(curl -s -o /tmp/ms_init_h7.json -w "%{http_code}" "${BASE}/api/model-status/initiatives?model=H7_VI" 2>/dev/null || echo "000")
echo "  GET /api/model-status/initiatives?model=H7_VI → HTTP $CODE"
if [ "$CODE" = "502" ]; then
  echo "  Jira 502 — JIRA_API_TOKEN · GET /api/jira/diagnose"
  head -c 400 /tmp/ms_init_h7.json 2>/dev/null || true
  echo ""
  FAIL=1
elif [ "$CODE" = "200" ]; then
  head -c 200 /tmp/ms_init_h7.json 2>/dev/null
  echo ""
fi

if [ "$FAIL" -eq 0 ]; then
  echo "=== OK ==="
else
  echo "=== FAILED ==="
  exit 1
fi
