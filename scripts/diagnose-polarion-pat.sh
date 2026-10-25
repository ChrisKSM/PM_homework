#!/bin/sh
# Polarion PAT / Bearer 토큰이 REST customs API 에서 통하는지 진단 (BE pod).
# UI(브라우저)로 PRD 목록이 보여도 REST 403 일 수 있음 — 토큰 종류·프로젝트 역할이 다름.
#
#   sh scripts/diagnose-polarion-pat.sh
#
# POLARION_PAT 는 .env 또는 export 로만 주입 (채팅/로그에 붙여넣지 마세요).
set -e
ROOT="${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

if [ -f .env ] && [ -z "${POLARION_PAT:-}" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env 2>/dev/null || true
  set +a
fi

BASE="${POLARION_BASE_URL:-https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1}"
BASE="${BASE%/}"
VERIFY="${POLARION_VERIFY_SSL:-false}"
CURL_K=""
[ "$VERIFY" = "false" ] || [ "$VERIFY" = "0" ] && CURL_K="-k"

if [ -z "${POLARION_PAT:-}" ]; then
  echo "ERROR: POLARION_PAT 없음 (.env 또는 export)" >&2
  exit 1
fi

echo "=== Polarion REST token smoke (토큰 값은 출력하지 않음) ==="
echo "base: $BASE"
echo ""

probe() {
  LABEL=$1
  PROJECT=$2
  PATH=$3
  QUERY=$4
  RESP=$(curl $CURL_K -sS -w "\n__HTTP__%{http_code}" \
    -H "Authorization: Bearer ${POLARION_PAT}" \
    -H "Accept: application/json" \
    --get "${BASE}/projects/${PROJECT}/${PATH}" \
    --data-urlencode "query=${QUERY}" \
    --data-urlencode "page=1" \
    --data-urlencode "pageSize=3" 2>/dev/null || echo "__HTTP__000")
  HTTP=$(echo "$RESP" | sed -n 's/^__HTTP__//p' | tail -1)
  BODY=$(echo "$RESP" | sed '/^__HTTP__/d')
  echo "--- $LABEL ---"
  echo "GET .../projects/${PROJECT}/${PATH}"
  echo "query: ${QUERY}"
  BODY_LEN=$(printf '%s' "$BODY" | wc -c | tr -d ' ')
  echo "HTTP: ${HTTP}  body_bytes: ${BODY_LEN}"
  if [ "$BODY_LEN" -eq 0 ]; then
    echo "(empty body — \$POLARION_PAT 미설정이거나 게이트웨이가 본문 없이 끊음)"
    echo "  → set -a && . ./.env && set +a  후 sh scripts/curl-polarion-prd-verbose.sh"
    echo ""
    return 0
  fi
  if [ "$HTTP" = "200" ]; then
    echo "$BODY" | python3 -c "
import json, sys
raw = sys.stdin.read()
d = json.loads(raw)
print('OK JSON keys:', list(d.keys())[:8])
if 'errors' in d:
    for e in d.get('errors') or []:
        print('error:', e.get('status'), e.get('detail'))
" 2>/dev/null || echo "(non-JSON body)" && printf '%s' "$BODY" | head -c 200 && echo ""
  else
    echo "$BODY" | python3 -c "
import json, sys
raw = sys.stdin.read()
try:
    d = json.loads(raw)
    for e in d.get('errors') or []:
        print('error:', e.get('status'), e.get('title'), '-', e.get('detail'))
except json.JSONDecodeError:
    print(raw[:400])
" 2>/dev/null || echo "$BODY" | head -c 400
  fi
  echo ""
}

# MR 품질 기본 프로젝트 (보통 testDefect — 이게 200이면 토큰 자체는 유효)
probe "MR default (RelProj/workitems + type:testDefect)" \
  "${POLARION_PROJECT_KEY:-AVSWRelProjMgmt}" \
  "${POLARION_LIST_PATH:-workitems}" \
  "type:testDefect"

# PRD 프로젝트 (ReqMgmt workitems — 여기서 403이면 프로젝트/역할 이슈)
probe "PRD REST default (ReqMgmt/workitems)" \
  "${POLARION_PRD_PROJECT_KEY:-AVSWReqMgmt}" \
  "${POLARION_PRD_REST_LIST_PATH:-workitems}" \
  "components:(H7_VI)"

probe "PRD REST alt path (ReqMgmt/workitems/PRD)" \
  "${POLARION_PRD_PROJECT_KEY:-AVSWReqMgmt}" \
  "workitems/PRD" \
  "components:(H7_VI)"

echo "=== 해석 ==="
echo "1) MR 200 + PRD 403 → seokmin.koh 계정에 AVSWReqMgmt REST 읽기 역할 없음 (UI SSO 와 Bearer PAT 역할 다름)."
echo "   Polarion 관리자: AVSWReqMgmt 프로젝트 Reader + REST/customs API 사용 권한 요청."
echo "2) 둘 다 403 Administration → 토큰이 Polarion Personal Access Token 이 아니거나 만료/잘못된 JWT."
echo "   Polarion: User Settings → Personal Access Token 발급 후 POLARION_PAT 교체."
echo "3) MR 도 403 → .env POLARION_PAT 와 curl 에 넣은 Bearer 가 동일한지 확인 (pod 재시작)."
echo ""
echo "BE 경유 (동일 PAT): curl -s http://127.0.0.1:8000/api/model-status/prd?model=H7_VI | python3 -m json.tool | head"
