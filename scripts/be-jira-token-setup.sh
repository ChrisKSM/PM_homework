#!/bin/sh
# BE pod — JIRA_API_TOKEN 점검·동기화 (값은 출력하지 않음)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/be-jira-token-setup.sh" | sh
#
# 토큰 최초 설정 (Pod 셸):
#   echo 'JIRA_API_TOKEN=여기에_PAT' >> /workspace/project/.env
#   sh scripts/be-jira-token-setup.sh
#   sh scripts/restart-be-route-port.sh   # port 8000 uvicorn
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

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

echo "=== JIRA_API_TOKEN 점검 ==="

WS="/workspace/project/.env"
PROD="/usr/app/src/.env"
ws_len=$(_token_len "$WS")
prod_len=$(_token_len "$PROD")

echo "  /workspace/project/.env     token_length=$ws_len"
echo "  /usr/app/src/.env           token_length=$prod_len"

if [ -d /usr/app/src ]; then
  if [ "$ws_len" -gt 0 ]; then
    cp "$WS" "$PROD"
    echo "  → workspace .env 를 /usr/app/src/.env 에 복사함"
  elif [ "$prod_len" -gt 0 ]; then
    if [ -f "$WS" ] && ! grep -q '^[[:space:]]*JIRA_API_TOKEN[[:space:]]*=' "$WS" 2>/dev/null; then
      grep '^[[:space:]]*JIRA_API_TOKEN[[:space:]]*=' "$PROD" >> "$WS"
      echo "  → /usr/app/src/.env 의 JIRA_API_TOKEN 줄을 workspace .env 에追加"
    fi
  fi
fi

# jira_client (token 읽기 로직) 최신화
if [ ! -f scripts/fix-be-token.sh ]; then
  mkdir -p scripts
  curl -fsSL "$BASE/scripts/fix-be-token.sh" -o scripts/fix-be-token.sh 2>/dev/null && chmod +x scripts/fix-be-token.sh || true
fi
if [ -f scripts/fix-be-token.sh ] && git rev-parse "github/$REF" >/dev/null 2>&1; then
  sh scripts/fix-be-token.sh "github/$REF" || true
elif [ -f scripts/fix-be-token.sh ]; then
  curl -fsSL "$BASE/backend/jira_client.py" -o jira_client.py 2>/dev/null && echo "  + jira_client.py (raw)" || true
fi

if python3 -c "from jira_client import _token_source_info; s,n=_token_source_info(); print(f'  runtime token_source={s} length={n}'); exit(0 if n>0 else 1)" 2>/dev/null; then
  echo ""
  echo "=== OK — uvicorn port 8000 재시작 후 diagnose ==="
  echo "  sh scripts/restart-be-route-port.sh"
  echo "  curl -s http://127.0.0.1:8000/api/jira/diagnose | python3 -m json.tool | head -15"
  exit 0
fi

echo ""
echo "=== ❌ JIRA_API_TOKEN 없음 ==="
echo ""
echo "1) Harmony/Jira PAT 발급 후 BE pod 에 설정:"
echo "     vi /workspace/project/.env"
echo "     JIRA_API_TOKEN=<PAT>   # 따옴표 없이 한 줄"
echo ""
echo "2) 동기화 + 재시작:"
echo "     sh scripts/be-jira-token-setup.sh"
echo "     sh scripts/restart-be-route-port.sh"
echo ""
echo "3) AX Studio Deployment Variables 에 JIRA_API_TOKEN 이 **빈 문자열**로 있으면"
echo "   .env 를 덮어씁니다. Variables 에 PAT 넣거나 해당 변수 삭제 후 **Pod 재시작**."
echo ""
exit 1
