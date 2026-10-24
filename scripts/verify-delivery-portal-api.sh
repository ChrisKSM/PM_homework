#!/bin/sh
# Delivery Portal API 연동 확인 (hedej / axstudio)
#
# BE .env:
#   DELIVERY_PORTAL_BASE_URL=https://delivery-portal-backend.apps.hedej.lge.com
#   DELIVERY_PORTAL_API_TOKEN=<JWT>
#
# 직접 Portal 호출:
#   sh scripts/verify-delivery-portal-api.sh direct
#
# BE 프록시 (uvicorn + 동일 .env):
#   sh scripts/verify-delivery-portal-api.sh proxy
#   API_BASE=http://127.0.0.1:8000/api sh scripts/verify-delivery-portal-api.sh proxy
#
set -e
cd "$(dirname "$0")/.."
[ -f main.py ] || cd backend 2>/dev/null || true

MODE="${1:-direct}"
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"

_load_env() {
  for f in /workspace/project/.env .env /usr/app/src/.env; do
    if [ -f "$f" ]; then
      # shellcheck disable=SC1090
      set -a
      . "$f"
      set +a
      echo "  env: $f"
      return 0
    fi
  done
  return 1
}

echo "=== Delivery Portal verify ($MODE) ==="
_load_env || echo "  WARN: .env not found — export DELIVERY_PORTAL_* manually"

BASE="${DELIVERY_PORTAL_BASE_URL:-https://delivery-portal-backend.apps.hedej.lge.com}"
BASE="${BASE%/}"
TOKEN="${DELIVERY_PORTAL_API_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "NG  DELIVERY_PORTAL_API_TOKEN empty"
  exit 1
fi
echo "  BASE=$BASE  token_len=${#TOKEN}"

PY="python3"
[ -x venv/bin/python ] && PY="venv/bin/python"

_fetch() {
  label="$1"
  url="$2"
  out="/tmp/dp_${label}.json"
  CODE=$(curl -sS -m 120 -o "$out" -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$url" 2>/dev/null || echo "000")
  echo "  $label HTTP $CODE size=$(wc -c <"$out" 2>/dev/null || echo 0)"
  if [ "$CODE" != "200" ]; then
    head -c 400 "$out" 2>/dev/null; echo
    return 1
  fi
  "$PY" <<PY
import json
from pathlib import Path
p = Path("$out")
data = json.loads(p.read_text(encoding="utf-8"))
if isinstance(data, dict):
    print("    keys:", list(data.keys())[:20])
    pd = data.get("platform_data")
    if isinstance(pd, list):
        print("    platform_data blocks:", len(pd))
        if pd:
            pi = pd[0].get("program_info") or []
            print("    sample platform:", pd[0].get("platform"), "programs:", len(pi))
    gd = data.get("global_data")
    if isinstance(gd, dict):
        print("    global_min_from:", gd.get("global_min_from"), "global_max_to:", gd.get("global_max_to"))
elif isinstance(data, list):
    print("    list length:", len(data))
else:
    print("    type:", type(data).__name__)
print("    preview:", json.dumps(data, ensure_ascii=False)[:280])
PY
}

_proxy() {
  label="$1"
  path="$2"
  out="/tmp/dp_${label}.json"
  CODE=$(curl -sS -m 120 -o "$out" -w "%{http_code}" "${API_BASE}${path}" 2>/dev/null || echo "000")
  echo "  $label (BE) HTTP $CODE"
  if [ "$CODE" != "200" ]; then
    head -c 500 "$out" 2>/dev/null; echo
    return 1
  fi
  head -c 200 "$out"; echo "..."
}

if [ "$MODE" = "proxy" ]; then
  echo ""
  echo "=== BE ping ==="
  curl -sf "${API_BASE}/delivery-portal/ping" | "$PY" -m json.tool 2>/dev/null || true
  echo ""
  _proxy "all_deliveries" "/delivery-portal/all-deliveries" || true
  _proxy "program_report" "/delivery-portal/program-report" || true
else
  echo ""
  _fetch "all_deliveries_data" "${BASE}/api/v1/all_deliveries_data/" || true
  echo ""
  _fetch "program_report" "${BASE}/api/v1/program-report/" || true
fi

echo ""
echo "=== Catalog (매칭 가이드용 TSV) ==="
echo "  python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json /tmp/dp_program_report.json"
echo "  → /tmp/delivery-portal-catalog.tsv , /tmp/delivery-portal-program-report.tsv"
echo ""
echo "=== Next (전 모델 일정 반영은 2단계) ==="
echo "  1) TSV + Mongo overview id(ov-h7-vi 등) 매칭表 작성"
echo "  2) delivery → OverviewModel import → overview/save"
echo "=== Done ==="
