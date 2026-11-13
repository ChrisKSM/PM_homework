#!/bin/sh
# 로컬 uvicorn vs 공개 Route — diagnose 비교
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cc06c5c/scripts/compare-delivery-portal-be-endpoints.sh" | sh
#   PUBLIC_API=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/compare-delivery-portal-be-endpoints.sh
set -u
cd /workspace/project 2>/dev/null || true
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
print("  hostname:", d.get("hostname", "(missing)"))
print("  tokenFingerprint:", d.get("tokenFingerprint"))
print("  tokenLength:", d.get("tokenLength"))
print("  looksLikeJwt:", (d.get("jwtHints") or {}).get("looksLikeJwt"))
print("  baseUrl:", d.get("baseUrl"))
print("  baseUrlSource:", (d.get("trace") or {}).get("baseUrlSource"))
pr = (d.get("portalProbeProgramReport") or {}).get("httpStatus")
ad = (d.get("portalProbeAllDeliveries") or {}).get("httpStatus")
print("  probe program-report:", pr, " all_deliveries:", ad)
if d.get("invalidJwtWarning"):
    print("  WARN:", d["invalidJwtWarning"][:200])
if d.get("baseUrlWarning"):
    print("  WARN:", d["baseUrlWarning"][:200])
PY
}

_pick "$LOCAL" "local"
echo ""
_pick "$PUBLIC" "public" || true
echo ""
echo "local=432/f029…/hedej/200 인데 public=576/axstudio/401 이면 Route 프로세스 Variables·BASE URL 수정 + BE Publish."
