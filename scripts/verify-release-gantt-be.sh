#!/bin/sh
# BE pod — /api/model-status/release/gantt smoke
#   sh scripts/verify-release-gantt-be.sh
set -e
BASE="${BE_LOCAL:-http://127.0.0.1:8000}"
URL="${BASE}/api/model-status/release/gantt"

echo "=== health ==="
curl -sf "${BASE}/health" >/dev/null && echo "  OK  /health" || { echo "  NG  uvicorn 8000"; exit 1; }

echo ""
echo "=== release/gantt/ping (no Jira) ==="
PING_CODE="$(curl -sS -o /tmp/rg_ping.json -w '%{http_code}' "${URL}/ping")"
echo "  HTTP $PING_CODE"
head -c 200 /tmp/rg_ping.json
echo ""
if [ "$PING_CODE" != "200" ] || ! python3 -c "import json; d=json.load(open('/tmp/rg_ping.json')); assert d.get('meta')" 2>/dev/null; then
  echo "  NG  route missing or release_gantt_service not deployed"
  echo "  Fix: curl -fsSL .../apply-model-status-release-fe-be-patch.sh | BE_ONLY=1 sh"
  echo "       sh scripts/restart-be-route-port.sh"
  exit 1
fi
echo "  OK  meta present (ping)"

echo ""
echo "=== release/gantt (label URL-encoded) ==="
BODY="$(curl -sG -w '\n__HTTP__%{http_code}' "$URL" --data-urlencode "model=H7_VI" --data-urlencode "label=SoundSuite_H7(VI)")"
HTTP_CODE="${BODY##*__HTTP__}"
BODY="${BODY%__HTTP__*}"
echo "  HTTP $HTTP_CODE"
echo "$BODY" | head -c 400
echo ""

if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'meta' in d; print('  OK  meta keys:', list(d['meta'].keys())[:6]); print('  epicCount', d['meta'].get('epicCount')); print('  errors', d['meta'].get('errors'))" 2>/dev/null; then
  exit 0
fi

if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  NG  no meta — FastAPI error body:'); print('  detail =', d.get('detail', d))" 2>/dev/null; then
  echo ""
  echo "  Tip: unencoded label=SoundSuite_H7(VI) in shell URL often returns detail, not meta."
  echo "  Use: curl -sG \"$URL\" --data-urlencode \"model=H7_VI\" --data-urlencode \"label=SoundSuite_H7(VI)\""
  exit 1
fi

echo "  NG  not JSON — route missing or wrong port"
exit 1
