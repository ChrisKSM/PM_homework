#!/bin/sh
# Pod — Delivery Portal Variables 길이만 (값 노출 없음). shell curl 과 BE(dej) 불일치 확인.
#   sh scripts/probe-dej-delivery-portal-vars.sh
set -u
cd /workspace/project 2>/dev/null || true
PY=".venv/bin/python"
[ -x venv/bin/python ] && PY="venv/bin/python"
[ -x "$PY" ] || PY="python3"

"$PY" <<'PY'
from dej_variables import dej_get, dej_sdk_variables_available, variables_get_length_detail

if not dej_sdk_variables_available():
    print("NG  dej_sdk variables not available (Worker pod?)")
    raise SystemExit(1)

for key in (
    "DELIVERY_PORTAL_BASE_URL",
    "DELIVERY_PORTAL_API_TOKEN",
    "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN",
):
    raw = dej_get(key)
    print(f"{key}: len={len(raw)}  detail={variables_get_length_detail(key)}")

print("")
print("Note: shell 에서 curl 할 때 export 가 없으면")
print('  Authorization: Bearer $DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN → Bearer (empty)')
print('  → 401 "Authorization header must contain two space-delimited values"')
print("BE/uvicorn 은 variables.get 를 씁니다 — sh scripts/diagnose-delivery-portal.sh 로 확인.")
PY
