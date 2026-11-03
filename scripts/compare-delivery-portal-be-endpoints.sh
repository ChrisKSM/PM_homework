#!/bin/sh
# 로컬 uvicorn vs 공개 Route — diagnose 비교 (401 = Pod/토큰 불일치)
#   sh scripts/compare-delivery-portal-be-endpoints.sh
#   PUBLIC_API=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/compare-delivery-portal-be-endpoints.sh
set -u
LOCAL="${LOCAL_API:-http://127.0.0.1:8000/api}"
PUBLIC="${PUBLIC_API:-https://be-audio-test.apps.axstudio.lge.com/api}"
PY="python3"
[ -x .venv/bin/python ] && PY=".venv/bin/python"

_pick() {
  _url="$1"
  _label="$2"
  echo "=== $_label: $_url/delivery-portal/diagnose ==="
  if ! curl -sf --max-time 60 "${_url%/}/delivery-portal/diagnose" -o "/tmp/dp-diag-${_label}.json"; then
    echo "  NG  curl failed"
    return 1
  fi
  "$PY" <<PY
import json
from pathlib import Path
d = json.loads(Path("/tmp/dp-diag-${_label}.json").read_text())
print("  hostname:", d.get("hostname"))
print("  tokenFingerprint:", d.get("tokenFingerprint"))
print("  tokenLength:", d.get("tokenLength"))
print("  baseUrl:", d.get("baseUrl"))
pr = (d.get("portalProbeProgramReport") or {}).get("httpStatus")
ad = (d.get("portalProbeAllDeliveries") or {}).get("httpStatus")
print("  probe program-report:", pr, " all_deliveries:", ad)
PY
}

_pick "$LOCAL" "local"
echo ""
_pick "$PUBLIC" "public" || true
echo ""
echo "local 과 public 의 hostname·fingerprint·probe 가 다르면 Route 가 다른 Pod/구 BE 를 탑니다."
