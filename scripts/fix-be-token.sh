#!/bin/sh
# jira_client.py 교체 + .env 안전 동기화 (빈 token으로 덮어쓰기 방지)
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

echo "=== fix BE token (jira_client + safe .env) ==="

git fetch github cursor/model-schedule-bar-label-fix-b14b 2>/dev/null || \
  git fetch github webpack-migration 2>/dev/null || true

if git rev-parse "$REF" >/dev/null 2>&1; then
  git show "$REF:backend/jira_client.py" > jira_client.py
  echo "  updated jira_client.py from $REF"
else
  echo "  WARN ref $REF 없음 — jira_client.py 유지"
fi

_token_len() {
  python3 - "$1" <<'PY'
import re, sys
from pathlib import Path
p = Path(sys.argv[1])
if not p.is_file():
    print(0)
    raise SystemExit
for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
    m = re.match(r"^\s*JIRA_API_TOKEN\s*=\s*(.*)$", line)
    if m:
        print(len(m.group(1).strip().strip('"').strip("'")))
        raise SystemExit
print(0)
PY
}

SRC="/workspace/project/.env"
DEST="/usr/app/src/.env"

if [ -d /usr/app/src ]; then
  src_len=$(_token_len "$SRC")
  dest_len=$(_token_len "$DEST")

  if [ "$src_len" -gt 0 ]; then
    cp "$SRC" "$DEST"
    echo "  copied .env → /usr/app/src/.env (workspace token length=$src_len)"
  elif [ "$dest_len" -gt 0 ]; then
    echo "  SKIP .env copy — workspace token 없음, /usr/app/src/.env 유지 (length=$dest_len)"
    if [ -f "$SRC" ] && ! grep -q '^[[:space:]]*JIRA_API_TOKEN[[:space:]]*=' "$SRC" 2>/dev/null; then
      grep '^[[:space:]]*JIRA_API_TOKEN[[:space:]]*=' "$DEST" >> "$SRC"
      echo "  appended JIRA_API_TOKEN from /usr/app/src/.env → workspace .env"
    fi
  elif [ -f "$SRC" ]; then
    cp "$SRC" "$DEST"
    echo "  WARN .env copied but JIRA_API_TOKEN 없음 — 토큰 설정 필요"
  else
    echo "  WARN workspace .env 없음"
  fi
else
  echo "  SKIP /usr/app/src 없음 (로컬 dev)"
fi

python3 -c "
from jira_client import _token_source_info
s, n = _token_source_info()
print(f'  token_source={s}  length={n}')
if n == 0:
    raise SystemExit(1)
" || {
  echo ""
  echo "  ❌ JIRA_API_TOKEN 없음 — .env 설정 후 uvicorn 재시작"
  exit 1
}

echo ""
echo "  sh scripts/restore-be-jira-env.sh"
echo "=== Done ==="
