#!/bin/sh
# be-audio-test pod — Jira API 502 원인 진단
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

check_http() {
  path="$1"
  label="$2"
  CODE=$(curl -s -o "/tmp/jira_${label}.json" -w "%{http_code}" "${BASE}${path}" 2>/dev/null || echo "000")
  echo "  GET ${path} → HTTP ${CODE}"
  if [ "$CODE" = "502" ]; then
    head -c 200 "/tmp/jira_${label}.json" 2>/dev/null
    echo ""
    FAIL=1
  fi
}

echo "=== Jira BE 검증 ($BASE) ==="

echo ""
echo "=== 소스 ==="
if grep -q 'diagnose_jira' jira_client.py 2>/dev/null; then
  echo "  OK  jira_client.py diagnose_jira"
else
  echo "  NG  jira_client.py — apply-jira-be-fix.sh 실행"
  FAIL=1
fi
if grep -q '/jira/diagnose' routers/manager.py 2>/dev/null; then
  echo "  OK  routers/manager.py /jira/diagnose"
else
  echo "  NG  routers/manager.py — apply-jira-be-fix.sh 실행"
  FAIL=1
fi

echo ""
echo "=== 토큰 (로컬 Python) ==="
python3 -c "
from jira_client import _token_source_info
s, n = _token_source_info()
print(f'  token_source={s}  length={n}')
if n == 0:
    raise SystemExit(1)
" 2>/dev/null || {
  echo "  NG  JIRA_API_TOKEN 없음 — .env 확인 + cp /workspace/project/.env /usr/app/src/.env"
  FAIL=1
}

echo ""
echo "=== /api/jira/diagnose ==="
CODE=$(curl -s -o /tmp/jira_diagnose.json -w "%{http_code}" "${BASE}/api/jira/diagnose" 2>/dev/null || echo "000")
echo "  HTTP ${CODE}"
if [ "$CODE" = "200" ]; then
  python3 -c "
import json
d = json.load(open('/tmp/jira_diagnose.json'))
print('  ok:', d.get('ok'))
print('  token_source:', d.get('token_source'), 'length:', d.get('token_length'))
print('  jira_ping:', d.get('jira_ping'))
if d.get('error'):
    print('  error:', d.get('error'))
if not d.get('ok'):
    raise SystemExit(1)
" 2>/dev/null || FAIL=1
else
  echo "  NG  diagnose 미배포 또는 uvicorn 미기동"
  FAIL=1
fi

echo ""
echo "=== Jira KPI 엔드포인트 ==="
check_http "/api/metrics/summary" "metrics"
check_http "/api/epics/progress" "epics"
check_http "/api/issues/risks" "risks"
check_http "/api/sprints/current/summary" "sprint"

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Jira BE 정상"
else
  echo "❌ Jira 502 — sh scripts/apply-jira-be-fix.sh 후 uvicorn 8200 재시작"
fi
echo "=== Done ==="
exit "$FAIL"
