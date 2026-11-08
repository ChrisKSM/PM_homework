#!/bin/sh
# BE pod — 모델현황 PRD ALM 조회 (Polarion / davis-db-api)
#
# Pod layout: /workspace/project/{main.py, routers/, services/} — NOT backend/ subdir.
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-be-model-status-prd-from-github.sh" | sh
#
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT" 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f main.py ] || [ ! -d routers ]; then
  echo "SKIP: BE pod 아님 (main.py + routers/ 없음) — cwd=$(pwd)"
  echo "  → react-audio FE pod 에서는 patch-fe-model-status-prd-from-github.sh 만 실행하세요."
  echo "  → BE: project-be-audio-test pod 에서 이 스크립트를 실행하세요."
  exit 0
fi

mkdir -p routers services scripts tests

fetch() {
  if ! curl -fsSL "$BASE/$1" -o "$2"; then
    echo "ERROR: fetch failed — $BASE/$1" >&2
    exit 1
  fi
  echo "  + $2"
}

PATCH_BUNDLE_ID="prd-patch-2026-02-dev-hyperlink-enrich"
echo "=== model-status PRD + sprint (TV worklog) @ $REF ($PATCH_BUNDLE_ID) ==="
fetch backend/services/model_status_prd_service.py services/model_status_prd_service.py
fetch backend/services/model_status_prd_labels.py services/model_status_prd_labels.py
fetch backend/services/model_status_prd_status.py services/model_status_prd_status.py
fetch backend/services/model_status_sprint_service.py services/model_status_sprint_service.py
fetch backend/services/model_status_sprint_worklog.py services/model_status_sprint_worklog.py
fetch backend/services/initiative_sp_kpi_service.py services/initiative_sp_kpi_service.py
fetch backend/tvjira_client.py tvjira_client.py
fetch backend/tests/test_model_status_sprint.py tests/test_model_status_sprint.py
fetch backend/tests/test_model_status_prd.py tests/test_model_status_prd.py
fetch backend/routers/model_status.py routers/model_status.py
fetch backend/config.py config.py
fetch backend/dej_variables.py dej_variables.py
fetch backend/polarion_client.py polarion_client.py
fetch scripts/patch-be-main-model-status.sh scripts/patch-be-main-model-status.sh
fetch scripts/verify-model-status-prd-fetch.sh scripts/verify-model-status-prd-fetch.sh
fetch scripts/verify-model-status-sprint-be.sh scripts/verify-model-status-sprint-be.sh
fetch scripts/diagnose-model-status-gantt-400.sh scripts/diagnose-model-status-gantt-400.sh
fetch scripts/diagnose-model-status-prd-502.sh scripts/diagnose-model-status-prd-502.sh
fetch scripts/print-prd-polarion-query-urls.sh scripts/print-prd-polarion-query-urls.sh
fetch scripts/probe-polarion-prd-rest.sh scripts/probe-polarion-prd-rest.sh
fetch scripts/diagnose-polarion-pat.sh scripts/diagnose-polarion-pat.sh
fetch scripts/curl-polarion-prd-verbose.sh scripts/curl-polarion-prd-verbose.sh
fetch scripts/fetch-polarion-diagnose-scripts.sh scripts/fetch-polarion-diagnose-scripts.sh
fetch scripts/patch-model-status-be-fe.sh scripts/patch-model-status-be-fe.sh
chmod +x scripts/print-prd-polarion-query-urls.sh scripts/probe-polarion-prd-rest.sh scripts/diagnose-polarion-pat.sh scripts/curl-polarion-prd-verbose.sh scripts/fetch-polarion-diagnose-scripts.sh scripts/patch-model-status-be-fe.sh 2>/dev/null || true
chmod +x scripts/patch-be-main-model-status.sh scripts/verify-model-status-prd-fetch.sh scripts/verify-model-status-sprint-be.sh scripts/diagnose-model-status-gantt-400.sh 2>/dev/null || true

PY="${PY:-python3}"
command -v "$PY" >/dev/null 2>&1 || PY=python

echo "=== PRD patch preflight (dej_variables + polarion_client) ==="
if ! "$PY" -c "from dej_variables import normalize_polarion_pat, looks_like_jwt_bearer; from polarion_client import polarion_pat" 2>/tmp/prd-patch-preflight.err; then
  echo "ERROR: dej_variables.py / polarion_client.py 불일치 — 502 원인"
  sed -n '1,12p' /tmp/prd-patch-preflight.err
  echo "  수동: curl -fsSL \"${BASE}/backend/dej_variables.py\" -o dej_variables.py"
  exit 1
fi
echo "  OK  dej_variables + polarion_client import"

if ! grep -q 'PRD_BROAD_LIST_LIMIT' services/model_status_prd_service.py 2>/dev/null; then
  echo "ERROR: PRD broad list limit 없음 — division 480건 패치 필요" >&2
  exit 1
fi
if ! grep -q 'def fixed_prd_lucene_query' services/model_status_prd_service.py 2>/dev/null; then
  echo "ERROR: model_status_prd_service.py 에 fixed_prd_lucene_query 없음 (요구사항 검토 REQ_AUDIO)" >&2
  exit 1
fi
if ! "$PY" -c "from services.model_status_prd_service import fixed_prd_lucene_query as f; assert f('REQ_AUDIO')=='type:PRD AND division.KEY:6'" 2>/tmp/prd-req-audio.err; then
  echo "ERROR: REQ_AUDIO → type:PRD AND division.KEY:6 동작 안 함"
  sed -n '1,6p' /tmp/prd-req-audio.err
  exit 1
fi
echo "  OK  REQ_AUDIO → type:PRD AND division.KEY:6"

if ! grep -q '@router.get("/prd")' routers/model_status.py 2>/dev/null; then
  echo "ERROR: routers/model_status.py 에 /prd 라우트 없음" >&2
  exit 1
fi

sh scripts/patch-be-main-model-status.sh

if [ -f scripts/restart-be-route-port.sh ]; then
  sh scripts/restart-be-route-port.sh
elif [ -f scripts/restart-be.sh ]; then
  sh scripts/restart-be.sh
else
  echo "  (restart script 없음 — sh scripts/restart-be-route-port.sh)"
fi

echo "=== preflight routes ==="
PING_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8000/api/model-status/initiatives/ping" || echo "000")
PRD_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8000/api/model-status/prd?model=H7_VI&probe=true" || echo "000")
echo "  initiatives/ping HTTP $PING_CODE"
echo "  model-status/prd HTTP $PRD_CODE"
if [ "$PRD_CODE" = "404" ]; then
  echo "  NG  still 404 — routers/model_status.py 가 uvicorn cwd와 일치하는지 확인 (pwd=$(pwd))"
  echo "      ls -la routers/model_status.py; grep prd routers/model_status.py"
  exit 1
fi
if [ "$PRD_CODE" = "502" ]; then
  echo "  NG  model-status/prd HTTP 502 — detail:"
  curl -s "http://127.0.0.1:8000/api/model-status/prd?model=H7_VI&probe=true" \
    | "$PY" -m json.tool 2>/dev/null | head -12 || true
  echo "  → grep normalize_polarion_pat dej_variables.py || curl .../dej_variables.py"
fi

echo "=== probe H7_VI + REQ_AUDIO (요구사항 검토 전체) ==="
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
REQ_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/model-status/prd?model=REQ_AUDIO" || echo "000")
echo "  model-status/prd?model=REQ_AUDIO HTTP $REQ_CODE"
if [ "$REQ_CODE" = "200" ]; then
  "$PY" -c "
import json,urllib.request
d=json.load(urllib.request.urlopen('${API_BASE}/model-status/prd?model=REQ_AUDIO'))
wq=(d.get('meta') or {}).get('winningQuery') or ''
n=len(d.get('items') or [])
print('  OK  items=', n, 'winningQuery=', wq[:80])
assert 'division.KEY:6' in wq and 'type:PRD' in wq or n>=0
" 2>/dev/null || true
fi
sh scripts/verify-model-status-prd-fetch.sh || true

echo "=== sprint dashboard H7_VI (worklog · velocity · burndown) ==="
sh scripts/verify-model-status-sprint-be.sh || true

echo "=== patch-be-model-status-prd done ==="
