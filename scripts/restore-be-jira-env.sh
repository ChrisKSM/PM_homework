#!/bin/sh
# Jira 502 복구 — token 있는 .env 찾기 + uvicorn 재시작 안내 (덮어쓰기 없음)
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."

echo "=== Jira .env 복구 점검 ==="

_token_len() {
  f="$1"
  [ -f "$f" ] || { echo 0; return; }
  python3 - "$f" <<'PY'
import re, sys
from pathlib import Path
text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="ignore")
for line in text.splitlines():
    m = re.match(r"^\s*JIRA_API_TOKEN\s*=\s*(.*)$", line)
    if not m:
        continue
    val = m.group(1).strip().strip('"').strip("'")
    print(len(val))
    raise SystemExit
print(0)
PY
}

for f in /usr/app/src/.env /workspace/project/.env .env; do
  n=$(_token_len "$f")
  if [ "$n" -gt 0 ] 2>/dev/null; then
    echo "  OK  $f  token_length=$n"
  else
    echo "  --  $f  (없거나 token 비어 있음)"
  fi
done

echo ""
echo "=== uvicorn / diagnose ==="
for p in 8200 8000; do
  if curl -sf "http://127.0.0.1:${p}/health" >/dev/null 2>&1; then
    echo "  uvicorn port $p UP"
    curl -s "http://127.0.0.1:${p}/api/jira/diagnose" 2>/dev/null | python3 -m json.tool 2>/dev/null || true
    exit 0
  fi
done

echo "  uvicorn 미기동 — 재시작:"
echo "  sh scripts/start-be-route-port.sh   # FE 외부 URL (port 8000)"
echo "  uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8200  # dev"
echo ""
echo "  local8200 OK + external 502 → Route는 8000. start-be-route-port.sh 실행"
echo "=== Done ==="
