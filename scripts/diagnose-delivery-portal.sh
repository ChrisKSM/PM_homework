#!/bin/sh
# BE pod / Worker — Delivery Portal Variables vs .env · Portal HTTP 프로브
#
#   sh scripts/diagnose-delivery-portal.sh
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-delivery-portal.sh
#
# 로컬 8000 Connection refused → Route용 uvicorn 미기동:
#   sh scripts/restart-be-route-port.sh
#   (또는 sh scripts/be-restart-uvicorn-standalone.sh)
set -u

PORT="${BE_ROUTE_PORT:-8000}"
LOCAL_API="http://127.0.0.1:${PORT}/api"
API_BASE="${API_BASE:-$LOCAL_API}"

PY="python3"
[ -x venv/bin/python ] && PY="venv/bin/python"
[ -x .venv/bin/python ] && PY=".venv/bin/python"

_health_ok() {
  _base="$1"
  curl -sf --max-time 3 "${_base%/api}/health" >/dev/null 2>&1 \
    || curl -sf --max-time 3 "${_base}/health" >/dev/null 2>&1
}

_fetch_diagnose() {
  _base="$1"
  _url="${_base%/}/delivery-portal/diagnose"
  echo "=== GET ${_url} ==="
  _body="/tmp/dp-diagnose-$$.json"
  _code=$(curl -sS -m 60 -o "$_body" -w "%{http_code}" "$_url" 2>/dev/null || echo "000")
  if [ "$_code" = "000" ]; then
    echo "NG  curl failed (connection refused / timeout)"
    rm -f "$_body"
    return 1
  fi
  echo "  HTTP $_code"
  if [ "$_code" = "404" ]; then
    head -c 400 "$_body" 2>/dev/null; echo
    echo ""
    echo "  → /delivery-portal/diagnose 없음: fetch 후 uvicorn 재시작 필요"
    echo "     REF=f62bcd2 sh scripts/fetch-delivery-portal-pod-scripts.sh"
    echo "     sh scripts/restart-be-route-port.sh"
    rm -f "$_body"
    return 1
  fi
  if [ "$_code" != "200" ]; then
    head -c 500 "$_body" 2>/dev/null; echo
    rm -f "$_body"
    return 1
  fi
  "$PY" -m json.tool <"$_body"
  rm -f "$_body"
  return 0
}

if [ -z "${API_BASE+x}" ] || [ "$API_BASE" = "$LOCAL_API" ]; then
  if ! _health_ok "$LOCAL_API"; then
    echo "NG  http://127.0.0.1:${PORT} 에 BE(uvicorn)가 없습니다 (Connection refused 예상)."
    echo ""
    echo "  Pod에서 Route 포트 uvicorn 기동:"
    echo "    sh scripts/restart-be-route-port.sh"
    echo "  또는:"
    echo "    sh scripts/be-restart-uvicorn-standalone.sh"
    echo ""
    echo "  기동 후 다시:"
    echo "    sh scripts/diagnose-delivery-portal.sh"
    echo ""
    echo "  (공개 Route만 보고 싶으면 — fetch 반영 전이면 404일 수 있음)"
    echo "    API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-delivery-portal.sh"
    exit 1
  fi
  API_BASE="$LOCAL_API"
fi

_fetch_diagnose "$API_BASE" || exit 1
