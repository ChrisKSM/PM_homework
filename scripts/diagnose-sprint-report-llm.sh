#!/bin/sh
# BE pod (/workspace/project) — 개발자 대시보드 "이번 주차 스프린트 요약" LLM 연결 진단
#
#   sh scripts/diagnose-sprint-report-llm.sh
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-sprint-report-llm.sh
#
set -e
cd "$(dirname "$0")/.."
[ -f main.py ] || cd "$(dirname "$0")/../.." 2>/dev/null || true

API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
ROOT="${API_BASE%/api}"

PY="python3"
[ -x venv/bin/python ] && PY="venv/bin/python"

echo "=== Sprint report LLM 진단 ==="
echo "  API_BASE=$API_BASE"
echo ""

echo "=== 1) FE가 호출하는 BE (참고) ==="
echo "  react-audio (axstudio/hedej) FE → 기본 공용 BE:"
echo "    https://be-audio-test.apps.axstudio.lge.com/api"
echo "  Worker pod만 패치했는데 FE가 공용 BE를 쓰면 LLM/라우트가 pod와 다를 수 있음."
echo "  workspace dev → proxy .../8000/api 또는 REACT_APP_API_BASE_URL 로 Worker BE 지정."
echo ""

echo "=== 2) .env LLM (민감값은 마스킹) ==="
if [ -f .env ]; then
  grep -E '^LLM_' .env 2>/dev/null | sed 's/=.*/=***/' || echo "  (LLM_* 없음)"
else
  echo "  WARN .env 없음"
fi
echo ""

echo "=== 3) Python / dej_sdk ==="
echo -n "  uvicorn 후보 $PY → dej_sdk: "
if "$PY" -c "from dej_sdk import llm" 2>/tmp/dej.err; then
  echo "OK"
else
  echo "NG"
  head -2 /tmp/dej.err | sed 's/^/    /'
  for alt in python3 /usr/bin/python3; do
    [ -x "$alt" ] || continue
    [ "$alt" = "$PY" ] && continue
    echo -n "  대안 $alt → dej_sdk: "
    if "$alt" -c "from dej_sdk import llm" 2>/dev/null; then
      echo "OK  (be-restart가 LLM_ENABLED=true 일 때 이 인터프리터 우선 사용)"
    else
      echo "NG"
    fi
  done
fi
echo ""

echo "=== 4) GET $API_BASE/llm/diagnostics ==="
curl -sf "$API_BASE/llm/diagnostics" -o /tmp/llm_diag.json 2>/dev/null || true
if [ -s /tmp/llm_diag.json ]; then
  "$PY" -m json.tool /tmp/llm_diag.json 2>/dev/null || cat /tmp/llm_diag.json
else
  echo "  FAIL (연결 불가 또는 404 — uvicorn/라우트 확인)"
fi
echo ""

echo "=== 5) GET $API_BASE/sprints/current/report?refresh=true ==="
CODE=$(curl -s -o /tmp/sprint_report.json -w "%{http_code}" \
  "$API_BASE/sprints/current/report?refresh=true" 2>/dev/null || echo "000")
echo "  HTTP $CODE"
if [ "$CODE" = "200" ] && [ -s /tmp/sprint_report.json ]; then
  "$PY" <<'PY'
import json
from pathlib import Path
p = Path("/tmp/sprint_report.json")
data = json.loads(p.read_text())
src = data.get("source", "?")
print(f"  source={src!r}  (llm=AI 연결 OK, rule=규칙 폴백)")
if data.get("llmDebug"):
    d = data["llmDebug"]
    print(f"  llmDebug.phase={d.get('phase')}")
    print(f"  llmDebug.reason={d.get('reason', '')[:200]}")
PY
else
  head -c 400 /tmp/sprint_report.json 2>/dev/null
  echo ""
fi
echo ""

echo "=== 6) 조치 요약 ==="
echo "  • source=rule + llmDebug → 카드 하단 amber 박스와 동일 원인"
echo "  • dej_sdk NG → AxStudio/dej wheel 설치 또는 dej_sdk 있는 python으로 uvicorn"
echo "  • LLM_ENABLED / LLM_USER_ID → .env + /usr/app/src/.env 동기화 후 재시작"
echo "  • Pod 패치 후 FE가 공용 BE면: 공용 BE 배포 또는 REACT_APP_API_BASE_URL=Worker BE"
echo ""
echo "=== Done ==="
