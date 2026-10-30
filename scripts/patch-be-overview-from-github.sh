#!/bin/sh
# BE pod — overview/load 404 → model_schedule 라우터 + Mongo helper (git 없이 raw fetch)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-be-overview-from-github.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f main.py ] || [ ! -d routers ]; then
  echo "NG: BE pod /workspace/project"
  exit 1
fi

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== BE overview API patch @ $REF ==="
fetch backend/routers/model_schedule.py routers/model_schedule.py
fetch backend/services/mongo_helper.py services/mongo_helper.py
fetch backend/services/overview_snapshot_email.py services/overview_snapshot_email.py
fetch backend/services/schedule_snapshot_email.py services/schedule_snapshot_email.py
fetch backend/services/model_schedule_recipients.py services/model_schedule_recipients.py
fetch backend/services/email_service.py services/email_service.py
fetch backend/services/delivery_portal_client.py services/delivery_portal_client.py
fetch backend/services/delivery_portal_catalog.py services/delivery_portal_catalog.py
fetch backend/services/delivery_portal_overview_sync.py services/delivery_portal_overview_sync.py
fetch scripts/delivery_portal_catalog_lib.py scripts/delivery_portal_catalog_lib.py
fetch backend/dej_variables.py dej_variables.py
fetch backend/jira_client.py jira_client.py
fetch backend/tvjira_client.py tvjira_client.py
fetch scripts/patch-be-main-model-schedule.sh scripts/patch-be-main-model-schedule.sh
fetch scripts/be-restart-uvicorn-standalone.sh scripts/be-restart-uvicorn-standalone.sh
chmod +x scripts/patch-be-main-model-schedule.sh scripts/be-restart-uvicorn-standalone.sh

# config — dej_sdk hydrate 유지 (overview 패치만으로 config 롤백 방지)
fetch backend/config.py config.py.patched 2>/dev/null || true
if [ -f config.py.patched ]; then
  if grep -q _hydrate_settings_from_dej config.py 2>/dev/null \
    && ! grep -q _hydrate_settings_from_dej config.py.patched 2>/dev/null; then
    echo "  SKIP config.py replace (pod dej_sdk hydrate 유지)"
  elif grep -q model_schedule config.py.patched 2>/dev/null || grep -q _hydrate_settings_from_dej config.py.patched 2>/dev/null; then
    cp config.py config.py.bak.overview 2>/dev/null || true
    cp config.py.patched config.py
    echo "  + config.py (from github @ $REF)"
  fi
  rm -f config.py.patched
fi

grep -q pymilvus requirements.txt 2>/dev/null || echo "pymilvus==2.5.8" >> requirements.txt
grep -q 'setuptools>=' requirements.txt 2>/dev/null || echo "setuptools>=69.0.0,<82" >> requirements.txt

PIP="pip"
[ -x venv/bin/pip ] && PIP="venv/bin/pip"
echo ""
echo "=== pip install (pymilvus — overview Mongo) ==="
if ! "$PIP" install -q "pymilvus==2.5.8" "setuptools>=69.0.0,<82"; then
  echo "NG  pip install pymilvus failed — 네트워크/PyPI 확인"
  exit 1
fi
echo "OK  pymilvus installed"

sh scripts/patch-be-main-model-schedule.sh

echo ""
echo "=== import routers.model_schedule ==="
PY="python3"
[ -x venv/bin/python ] && PY="venv/bin/python"
if ! "$PY" -c "from routers import model_schedule; print('routes', len(model_schedule.router.routes))"; then
  echo "NG  import routers.model_schedule failed"
  exit 1
fi

echo ""
echo "=== restart uvicorn ==="
sh scripts/be-restart-uvicorn-standalone.sh

CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/model-schedule/overview/load)
echo ""
if [ "$CODE" = "200" ] || [ "$CODE" = "502" ]; then
  echo "OK  overview/load → HTTP $CODE (502면 Mongo 연결 확인)"
else
  echo "NG  overview/load → HTTP $CODE (404면 main.py 재시작·라우트 확인)"
  curl -s http://127.0.0.1:8000/openapi.json | "$PY" -c "
import json,sys
d=json.load(sys.stdin)
paths=[p for p in d.get('paths',{}) if 'overview' in p]
print('openapi overview paths:', paths[:10] or 'NONE')
" 2>/dev/null || true
  exit 1
fi
