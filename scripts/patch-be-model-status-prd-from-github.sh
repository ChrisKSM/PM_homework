#!/bin/sh
# BE pod — 모델현황 PRD ALM 조회 (Polarion / davis-db-api)
#
# Pod layout: /workspace/project/{main.py, routers/, services/} — NOT backend/ subdir.
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/REF/scripts/patch-be-model-status-prd-from-github.sh" | REF=REF sh
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

echo "=== model-status PRD @ $REF (flat pod paths) ==="
fetch backend/services/model_status_prd_service.py services/model_status_prd_service.py
fetch backend/services/model_status_prd_labels.py services/model_status_prd_labels.py
fetch backend/services/model_status_prd_status.py services/model_status_prd_status.py
fetch backend/tests/test_model_status_prd.py tests/test_model_status_prd.py
fetch backend/routers/model_status.py routers/model_status.py
fetch backend/config.py config.py
fetch backend/polarion_client.py polarion_client.py
fetch scripts/patch-be-main-model-status.sh scripts/patch-be-main-model-status.sh
fetch scripts/verify-model-status-prd-fetch.sh scripts/verify-model-status-prd-fetch.sh
fetch scripts/print-prd-polarion-query-urls.sh scripts/print-prd-polarion-query-urls.sh
fetch scripts/probe-polarion-prd-rest.sh scripts/probe-polarion-prd-rest.sh
fetch scripts/diagnose-polarion-pat.sh scripts/diagnose-polarion-pat.sh
fetch scripts/curl-polarion-prd-verbose.sh scripts/curl-polarion-prd-verbose.sh
chmod +x scripts/print-prd-polarion-query-urls.sh scripts/probe-polarion-prd-rest.sh scripts/diagnose-polarion-pat.sh scripts/curl-polarion-prd-verbose.sh 2>/dev/null || true
chmod +x scripts/patch-be-main-model-status.sh scripts/verify-model-status-prd-fetch.sh 2>/dev/null || true

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

echo "=== probe H7_VI ==="
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
sh scripts/verify-model-status-prd-fetch.sh || true

echo "=== patch-be-model-status-prd done ==="
