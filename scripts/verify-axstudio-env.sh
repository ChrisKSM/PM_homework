#!/bin/sh
# AX Studio Variables / .env / uvicorn env 전달 확인
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."

echo "=== pod ==="
echo "  hostname: $(hostname)"
echo "  cwd:      $(pwd)"

echo ""
echo "=== shell env (AX Studio Variables → pod 재시작 후 반영) ==="
python3 - <<'PY'
import os
for k in ("JIRA_API_TOKEN", "JIRA_BASE_URL", "BOARD_ID"):
    v = os.getenv(k, "")
    print(f"  {k}: length={len(v.strip())}")
PY

echo ""
echo "=== .env files ==="
for f in /usr/app/src/.env /workspace/project/.env .env; do
  if [ -f "$f" ]; then
    n=$(grep -E '^JIRA_API_TOKEN=' "$f" 2>/dev/null | head -1 | cut -d= -f2- | tr -d ' "' | wc -c)
    echo "  OK  $f  (token chars ~$n)"
  else
    echo "  --  $f"
  fi
done

echo ""
echo "=== uvicorn 8000 process env ==="
PID=$(netstat -tlnp 2>/dev/null | grep ':8000 ' | awk '{print $7}' | cut -d/ -f1 | head -1)
if [ -n "$PID" ] && [ "$PID" != "-" ]; then
  echo "  pid $PID"
  tr '\0' '\n' < "/proc/$PID/environ" 2>/dev/null | grep -E '^JIRA_API_TOKEN=' | sed 's/=.*/=***/' || echo "  (JIRA_API_TOKEN not in process env)"
else
  echo "  port 8000 not listening"
fi

echo ""
echo "=== local diagnose ==="
curl -s http://127.0.0.1:8000/api/jira/diagnose 2>/dev/null | python3 -m json.tool 2>/dev/null | head -20

echo ""
echo "=== URLs to compare (browser) ==="
echo "  Worker Port (본인): https://be-audio-test--8000--seokmin-koh.apps.axstudio.lge.com/api/jira/diagnose"
echo "  FE default:         https://be-audio-test.apps.axstudio.lge.com/api/jira/diagnose"
echo ""
echo "  diagnose.hostname 이 다르면 **서로 다른 pod** — Variables는 FE URL pod에 없음"
echo "=== Done ==="
