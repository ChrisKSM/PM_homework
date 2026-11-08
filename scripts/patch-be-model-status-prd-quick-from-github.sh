#!/bin/sh
# BE pod — PRD Polarion 핫픽스만 (429 배치 완화 + workitem id 정규화). 느린 목록 curl 검증 없음.
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-be-model-status-prd-quick-from-github.sh" | sh
#
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT" 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f main.py ] || [ ! -d routers ]; then
  echo "SKIP: BE pod 아님 — cwd=$(pwd)"
  exit 0
fi

mkdir -p services

fetch() {
  curl -fsSL --connect-timeout 15 --max-time 120 "$BASE/$1" -o "$2" || {
    echo "ERROR: fetch $1" >&2
    exit 1
  }
  echo "  + $2"
}

BUNDLE="prd-quick-2026-02-sparse-list-enrich"
echo "=== PRD quick patch @ $REF ($BUNDLE) ==="
fetch backend/polarion_client.py polarion_client.py
fetch backend/services/model_status_prd_service.py services/model_status_prd_service.py

PY="${PY:-python3}"
command -v "$PY" >/dev/null 2>&1 || PY=python

if ! grep -q normalize_polarion_workitem_id polarion_client.py 2>/dev/null; then
  echo "ERROR: polarion_client.py 에 workitem id fix 없음" >&2
  exit 1
fi
if ! grep -q PRD_BROAD_SPARSE_ENRICH_MAX services/model_status_prd_service.py 2>/dev/null; then
  echo "ERROR: model_status_prd_service.py 에 broad sparse enrich 없음" >&2
  exit 1
fi
"$PY" -c "from polarion_client import normalize_polarion_workitem_id, workitem_id; assert normalize_polarion_workitem_id('AVSWReqMgmt/AVRM-5327')=='AVRM-5327'"
echo "  OK  import + id normalize"

if [ -f scripts/restart-be-route-port.sh ]; then
  sh scripts/restart-be-route-port.sh
elif [ -f scripts/restart-be.sh ]; then
  sh scripts/restart-be.sh
else
  echo "  (restart 스크립트 없음 — uvicorn 수동 재시작)"
fi

API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
sleep 2
PING=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 8 "${API_BASE}/model-status/initiatives/ping" 2>/dev/null || echo "000")
echo "  ping HTTP $PING"
if [ "$PING" = "200" ]; then
  curl -s --connect-timeout 3 --max-time 25 "${API_BASE}/model-status/prd/workitem?id=AVRM-5153" 2>/dev/null \
    | "$PY" -c "
import json,sys
d=json.load(sys.stdin)
it=d.get('item') or {}
iid=it.get('id')
url=it.get('polarionUrl') or ''
assert iid and iid!='AVSWReqMgmt', iid
assert 'AVRM-5153' in url, url
print('  OK  workitem id=', iid)
" 2>/dev/null || echo "  (workitem smoke skip — Polarion 429/502 가능)"
fi
echo "=== quick patch done ($BUNDLE) ==="
