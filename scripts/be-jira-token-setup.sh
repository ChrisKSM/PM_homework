#!/bin/sh
# BE pod — Jira PAT 점검·동기화 (값은 출력하지 않음)
#
#   Harmony 보드: JIRA_API_TOKEN + JIRA_BASE_URL
#   TVPLAT Initiative: TVJIRA_API_TOKEN + TVJIRA_BASE_URL
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/be-jira-token-setup.sh" | sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

_token_len_key() {
  f="$1"
  key="$2"
  [ -f "$f" ] || { echo 0; return; }
  python3 - "$f" "$key" <<'PY'
import re, sys
from pathlib import Path
text = Path(sys.argv[1]).read_text(encoding="utf-8", errors="ignore")
key = sys.argv[2]
pat = re.compile(r"^\s*" + re.escape(key) + r"\s*=\s*(.*)$")
for line in text.splitlines():
    m = pat.match(line)
    if not m:
        continue
    val = m.group(1).strip().strip('"').strip("'")
    print(len(val))
    raise SystemExit
print(0)
PY
}

echo "=== Jira PAT 점검 (Harmony JIRA_* · TV TVJIRA_*) ==="

WS="/workspace/project/.env"
PROD="/usr/app/src/.env"
ws_jira=$(_token_len_key "$WS" "JIRA_API_TOKEN")
prod_jira=$(_token_len_key "$PROD" "JIRA_API_TOKEN")
ws_tv=$(_token_len_key "$WS" "TVJIRA_API_TOKEN")
prod_tv=$(_token_len_key "$PROD" "TVJIRA_API_TOKEN")

echo "  Harmony  /workspace/project/.env   JIRA_API_TOKEN length=$ws_jira"
echo "  Harmony  /usr/app/src/.env         JIRA_API_TOKEN length=$prod_jira"
echo "  TV Jira  /workspace/project/.env   TVJIRA_API_TOKEN length=$ws_tv"
echo "  TV Jira  /usr/app/src/.env         TVJIRA_API_TOKEN length=$prod_tv"

# TVJIRA 줄 없고 Harmony PAT만 있으면 workspace .env 에 TVJIRA 줄 추가 (값 복사)
if [ -f "$WS" ] && [ "$ws_tv" -eq 0 ] && [ "$ws_jira" -gt 0 ]; then
  if ! grep -q '^[[:space:]]*TVJIRA_API_TOKEN[[:space:]]*=' "$WS" 2>/dev/null; then
    python3 - "$WS" <<'PY'
import re, sys
from pathlib import Path
p = Path(sys.argv[1])
text = p.read_text(encoding="utf-8", errors="ignore")
pat = None
for line in text.splitlines():
    m = re.match(r"^\s*JIRA_API_TOKEN\s*=\s*(.*)$", line)
    if m:
        pat = m.group(1).strip().strip('"').strip("'")
        break
if pat:
    p.write_text(text.rstrip() + f"\nTVJIRA_API_TOKEN={pat}\n", encoding="utf-8")
    print("  → workspace .env: TVJIRA_API_TOKEN 추가 (JIRA_API_TOKEN 값 복사)")
PY
    ws_tv=$(_token_len_key "$WS" "TVJIRA_API_TOKEN")
  fi
fi

if [ -d /usr/app/src ]; then
  if [ "$ws_jira" -gt 0 ] || [ "$ws_tv" -gt 0 ]; then
    cp "$WS" "$PROD"
    echo "  → workspace .env 를 /usr/app/src/.env 에 복사함"
  elif [ "$prod_jira" -gt 0 ] || [ "$prod_tv" -gt 0 ]; then
    for key in JIRA_API_TOKEN TVJIRA_API_TOKEN; do
      if [ -f "$WS" ] && ! grep -q "^[[:space:]]*${key}[[:space:]]*=" "$WS" 2>/dev/null; then
        grep "^[[:space:]]*${key}[[:space:]]*=" "$PROD" >> "$WS" 2>/dev/null || true
        echo "  → /usr/app/src/.env 의 ${key} 줄을 workspace .env 에 추가"
      fi
    done
  fi
fi

# jira_client / tvjira_client 최신화
if [ ! -f scripts/fix-be-token.sh ]; then
  mkdir -p scripts
  curl -fsSL "$BASE/scripts/fix-be-token.sh" -o scripts/fix-be-token.sh 2>/dev/null && chmod +x scripts/fix-be-token.sh || true
fi
if [ -f scripts/fix-be-token.sh ] && git rev-parse "github/$REF" >/dev/null 2>&1; then
  sh scripts/fix-be-token.sh "github/$REF" || true
else
  for f in jira_client.py tvjira_client.py config.py; do
    curl -fsSL "$BASE/backend/$f" -o "$f" 2>/dev/null && echo "  + backend/$f (raw)" || true
  done
fi

harmony_ok=0
tv_ok=0
if python3 -c "from jira_client import _token_source_info; s,n=_token_source_info(); print(f'  Harmony runtime token_source={s} length={n}'); exit(0 if n>0 else 1)" 2>/dev/null; then
  harmony_ok=1
fi
if python3 -c "from tvjira_client import tvjira_token_source_info; s,n=tvjira_token_source_info(); print(f'  TV Jira runtime token_source={s} length={n}'); exit(0 if n>0 else 1)" 2>/dev/null; then
  tv_ok=1
fi

echo ""
if [ "$harmony_ok" -eq 1 ] && [ "$tv_ok" -eq 1 ]; then
  echo "=== OK — Harmony + TV Jira PAT 모두 설정됨 ==="
  echo "  sh scripts/restart-be-route-port.sh"
  echo "  curl -s http://127.0.0.1:8000/api/model-status/initiatives/ping | python3 -m json.tool"
  exit 0
fi
if [ "$tv_ok" -eq 1 ]; then
  echo "=== OK (TV Jira) — Initiative 탭용 TVJIRA_API_TOKEN 설정됨 ==="
  echo "  Harmony 보드 API 는 JIRA_API_TOKEN 도 필요할 수 있습니다."
  echo "  sh scripts/restart-be-route-port.sh"
  exit 0
fi
if [ "$harmony_ok" -eq 1 ]; then
  echo "=== WARN — Harmony JIRA_API_TOKEN 만 있음 (Initiative 는 TVJIRA_API_TOKEN 필요) ==="
  exit 1
fi

echo "=== ❌ JIRA_API_TOKEN / TVJIRA_API_TOKEN 없음 ==="
echo ""
echo "1) .env 예시:"
echo "     JIRA_BASE_URL=https://harmony.lge.com:8443/issue"
echo "     JIRA_API_TOKEN=<Harmony_PAT>"
echo "     TVJIRA_BASE_URL=http://jira.lge.com/issue"
echo "     TVJIRA_API_TOKEN=<TV_Jira_PAT>"
echo ""
echo "2) 동기화 + 재시작:"
echo "     sh scripts/be-jira-token-setup.sh"
echo "     sh scripts/restart-be-route-port.sh"
echo ""
echo "3) AX Studio Variables 에 빈 JIRA_* / TVJIRA_* 가 있으면 .env 를 덮어씁니다."
echo ""
exit 1
