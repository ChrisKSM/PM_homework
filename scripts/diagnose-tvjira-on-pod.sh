#!/bin/sh
# 이 Pod 에 TVJIRA 가 실제로 보이는지 (AX Studio Variables UI ≠ 항상 process env)
#   sh scripts/diagnose-tvjira-on-pod.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."

echo "=== Pod ==="
hostname

echo ""
echo "=== Process env (length only) ==="
python3 <<'PY'
import os
for k in ("TVJIRA_API_TOKEN", "TVJIRA_BASE_URL", "JIRA_API_TOKEN", "JIRA_BASE_URL"):
    v = os.environ.get(k)
    if v is None:
        print(f"  {k}: (not set)")
    else:
        print(f"  {k}: length={len(v.strip())}")
PY

echo ""
echo "=== .env files (TVJIRA / JIRA length) ==="
python3 <<'PY'
import re
from pathlib import Path
for p in (Path("/workspace/project/.env"), Path("/usr/app/src/.env"), Path(".env")):
    if not p.is_file():
        print(f"  {p}: missing")
        continue
    tv = ji = 0
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = re.match(r"^\s*TVJIRA_API_TOKEN\s*=\s*(.*)$", line)
        if m:
            tv = len(m.group(1).strip().strip('"').strip("'"))
        m = re.match(r"^\s*JIRA_API_TOKEN\s*=\s*(.*)$", line)
        if m:
            ji = len(m.group(1).strip().strip('"').strip("'"))
    print(f"  {p}: TVJIRA len={tv}  JIRA len={ji}")
PY

echo ""
echo "=== Runtime tvjira_client ==="
if [ -f tvjira_client.py ]; then
  python3 -c "from tvjira_client import tvjira_token_source_info; s,n=tvjira_token_source_info(); print(f'  token_source={s}  length={n}')" 2>/dev/null \
    || echo "  NG import tvjira_client"
  if grep -q 'JIRA_API_TOKEN(fallback)' tvjira_client.py 2>/dev/null; then
    echo "  OK  JIRA fallback in tvjira_client.py"
  else
    echo "  WARN  구 tvjira_client — JIRA fallback 없음 → sh scripts/fix-tvjira-missing.sh"
  fi
else
  echo "  NG tvjira_client.py missing"
fi

echo ""
echo "=== Ping (local) ==="
curl -sf http://127.0.0.1:8000/api/model-status/initiatives/ping 2>/dev/null \
  | python3 -m json.tool || echo "  (uvicorn not on 8000)"

echo ""
cat <<'TXT'

해석:
· UI Variables 에 TVJIRA 가 있어도 이 Pod 의 printenv 가 (not set) / length=0 이면
  → Variables 가 **be-audio-test-dpl Pod 에 주입 안 됨** 또는 **재시작 전**
· hostname 이 be-audio-test-dpl-* 인 Pod 에서 위를 확인한 뒤 Deployment 재시작
· seokmin-koh Pod 만 .env 수정 → 공용 Route(5slp9) 와 무관

TXT
