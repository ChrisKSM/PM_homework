#!/bin/sh
# BE pod — 외부 be-audio-test URL vs 로컬 uvicorn 구분 진단
#
# 사용: cd /workspace/project && sh scripts/debug-be-routing.sh

set -e
cd "$(dirname "$0")/.."

EXT="${BE_EXT_URL:-https://be-audio-test.apps.axstudio.lge.com}"

echo "=== 1) Listen 포트 / Python 프로세스 ==="
netstat -tlnp 2>/dev/null | grep -E '8000|8200|python' || echo "(netstat 없음)"
ps aux | grep -E '[u]vicorn|[p]ython.*main' || true

echo ""
echo "=== 2) 로컬 BE (8200 → 8000) ==="
for p in 8200 8000; do
  code=$(curl -s -o /tmp/local_load.json -w "%{http_code}" "http://127.0.0.1:${p}/api/model-schedule/load" 2>/dev/null || echo "000")
  echo "  port $p load HTTP $code — $(head -c 80 /tmp/local_load.json 2>/dev/null; echo)"
  code=$(curl -s -o /tmp/local_diag.json -w "%{http_code}" "http://127.0.0.1:${p}/api/model-schedule/diagnose" 2>/dev/null || echo "000")
  echo "  port $p diagnose HTTP $code"
done

echo ""
echo "=== 3) 외부 BE ($EXT) ==="
code=$(curl -s -o /tmp/ext_load.json -w "%{http_code}" "${EXT}/api/model-schedule/load" 2>/dev/null || echo "000")
echo "  load HTTP $code — $(head -c 120 /tmp/ext_load.json 2>/dev/null; echo)"
code=$(curl -s -o /tmp/ext_diag.json -w "%{http_code}" "${EXT}/api/model-schedule/diagnose" 2>/dev/null || echo "000")
echo "  diagnose HTTP $code"
if [ -f /tmp/ext_diag.json ] && [ -s /tmp/ext_diag.json ]; then
  python3 -m json.tool /tmp/ext_diag.json 2>/dev/null | head -40 || cat /tmp/ext_diag.json
fi

echo ""
echo "=== 4) mongo_helper / .env (uvicorn venv) ==="
if [ -f .env ]; then
  grep -E '^MONGO_' .env | sed 's/PASSWORD=.*/PASSWORD=***/'
else
  echo "  .env 없음"
fi

PY="../venv/bin/python"
[ -x "$PY" ] || PY=".venv/bin/python"
[ -x "$PY" ] || PY="python3"

echo "  python: $PY"
"$PY" -c "
import os, sys
sys.path.insert(0, '.')
from services import mongo_helper
print('  pymilvus ok, db=', mongo_helper._db_name())
print('  MONGO_PASSWORD set=', bool(os.getenv('MONGO_PASSWORD')))
d = mongo_helper.diagnose('model_schedule_data')
print('  diagnose ok=', d.get('ok'), 'docs=', d.get('document_count'))
if not d.get('ok'):
    print('  error=', d.get('error') or d.get('steps'))
" 2>&1 || echo "  mongo_helper import/diagnose 실패"

echo ""
echo "=== 해석 ==="
echo "  · 로컬 8200 OK + 외부 load 502 → 브라우저는 외부(플랫폼) BE 사용. 수동 uvicorn과 무관."
echo "  · 외부 diagnose ok:false → 공용 BE에 mongo_helper dotenv + pymilvus + .env 필요."
echo "  · workspace 개인 BE 테스트 → uvicorn --port 8000 + FE URL /project/.../proxy/..."
