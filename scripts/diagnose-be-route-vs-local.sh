#!/bin/sh
# BE pod — localhost:8000 vs be-audio-test Route 가 같은 프로세스/같은 .env 인지
#   sh scripts/diagnose-be-route-vs-local.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
PORT="${BE_ROUTE_PORT:-8000}"
EXT="${BE_EXTERNAL_URL:-https://be-audio-test.apps.axstudio.lge.com}"

echo "=== Pod identity ==="
hostname
echo "  cwd: $(pwd)"

echo ""
echo "=== Who listens on :$PORT ==="
ss -tlnp 2>/dev/null | grep ":${PORT} " || netstat -tlnp 2>/dev/null | grep ":${PORT} " || echo "  (nothing on $PORT)"

echo ""
echo "=== Local ping (127.0.0.1:$PORT) ==="
curl -sf "http://127.0.0.1:${PORT}/api/model-status/initiatives/ping" 2>/dev/null \
  | python3 -m json.tool || echo "  NG local ping"

echo ""
echo "=== External ping ($EXT) ==="
curl -sf "${EXT}/api/model-status/initiatives/ping" 2>/dev/null \
  | python3 -m json.tool || echo "  NG external ping"

echo ""
echo "=== Compare (5x external — replica / 다른 BE pool) ==="
i=1
while [ "$i" -le 5 ]; do
  curl -sf "${EXT}/api/model-status/initiatives/ping" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
tv=d.get('tvjira') or {}
pod=d.get('pod') or {}
print('  hostname=%s tokenLength=%s source=%s' % (
  pod.get('hostname','(no pod field — 구 BE)'),
  tv.get('tokenLength'),
  tv.get('tokenSource'),
))
" || echo "  ext ping $i failed"
  i=$((i + 1))
done

echo ""
echo "=== .env TVJIRA length (this pod only) ==="
python3 <<'PY'
import re
from pathlib import Path
for p in (Path("/workspace/project/.env"), Path("/usr/app/src/.env"), Path(".env")):
    if not p.is_file():
        print(f"  {p}: (missing)")
        continue
    n = 0
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = re.match(r"^\s*TVJIRA_API_TOKEN\s*=\s*(.*)$", line)
        if m:
            n = len(m.group(1).strip().strip('"').strip("'"))
            break
    print(f"  {p}: TVJIRA_API_TOKEN length={n}")
PY

echo ""
echo "=== Interpretation ==="
cat <<'TXT'
· local tokenLength>0 이고 external tokenLength=0 이면
  브라우저/FE 가 치는 Route 는 **이 pod 의 uvicorn 이 아님**
  (다른 replica · 다른 Deployment · Platform 기본 BE).

· 조치
  1) AX Studio Deployment Variables 에 TVJIRA_API_TOKEN (+ TVJIRA_BASE_URL)
  2) Deployment **Rollout restart** (모든 replica 동일 env)
  3) exec 로 한 pod 만 .env 수정 + 수동 uvicorn → **Route 트래픽과 무관**할 수 있음
  4) replica 수 확인 후 **각 pod** 에서 external ping 또는 Variables 로 통일

· pod.hostname 이 ping JSON 에 없으면 Route 가 **구 BE 이미지** 를 가리킴
  → be-model-status-initiative-patch.sh + fix-tvjira-missing.sh 후 **Deployment 단위** 재배포
TXT
