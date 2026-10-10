#!/bin/sh
# BE pod — Initiative 503 (text/plain) 원인 진단
# 503 + text/plain → 보통 Route(8000)에 uvicorn 없음 (import 실패·재시작 실패)
# 502/JSON → TV Jira 호출 오류 (토큰·URL)
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
PORT="${BE_ROUTE_PORT:-8000}"
BASE="http://127.0.0.1:${PORT}"

echo "=== Initiative 503 진단 (port $PORT) ==="

echo ""
echo "1) port listen"
ss -tlnp 2>/dev/null | grep ":${PORT} " || netstat -tlnp 2>/dev/null | grep ":${PORT} " || echo "  NG  port $PORT not listening → restart-be-route-port.sh"

echo ""
echo "2) /health"
CODE=$(curl -s -o /tmp/diag_health.json -w "%{http_code}" "${BASE}/health" 2>/dev/null || echo "000")
echo "  HTTP $CODE"
head -c 120 /tmp/diag_health.json 2>/dev/null; echo ""

echo ""
echo "3) /api/model-status/initiatives/ping"
CODE=$(curl -s -o /tmp/diag_ping.json -w "%{http_code}" "${BASE}/api/model-status/initiatives/ping" 2>/dev/null || echo "000")
CT=$(curl -sI "${BASE}/api/model-status/initiatives/ping" 2>/dev/null | grep -i content-type | tr -d '\r' || true)
echo "  HTTP $CODE  ${CT:-}"
if [ "$CODE" = "503" ] && echo "$CT" | grep -qi text/plain; then
  echo "  → Ingress/Route 503 (uvicorn down). BE 로그·import 확인:"
fi
head -c 200 /tmp/diag_ping.json 2>/dev/null; echo ""

echo ""
echo "4) Python import"
python3 <<'PY' || true
import sys
sys.path.insert(0, ".")
for mod in ("tvjira_client", "services.model_status_initiative_service", "routers.model_status"):
    try:
        __import__(mod)
        print(f"  OK  import {mod}")
    except Exception as e:
        print(f"  NG  import {mod}: {e}")
PY

echo ""
echo "5) TVJIRA token (length only)"
python3 -c "from tvjira_client import tvjira_token_source_info; s,n=tvjira_token_source_info(); print(f'  token_source={s} length={n}')" 2>/dev/null || echo "  NG  tvjira_client/token"

echo ""
echo "Fix:"
echo "  sh scripts/be-model-status-initiative-patch.sh"
echo "  sh scripts/be-jira-token-setup.sh"
echo "  sh scripts/restart-be-route-port.sh"
echo "  sh scripts/verify-model-status-initiative-be.sh"
