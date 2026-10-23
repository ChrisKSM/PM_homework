#!/bin/sh
# BE pod — 개발자 대시보드 "이번 주차 스프린트 요약" (LLM) + /api/llm/diagnostics
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-be-sprint-report-llm-from-github.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== BE sprint report + LLM @ $REF ==="
fetch backend/routers/devteam.py routers/devteam.py
fetch backend/services/sprint_report_service.py services/sprint_report_service.py
fetch backend/services/llm_client.py services/llm_client.py
fetch backend/services/jira_service.py services/jira_service.py
fetch backend/jira_client.py jira_client.py
fetch scripts/verify-sprint-report-be.sh scripts/verify-sprint-report-be.sh
fetch scripts/be-restart-uvicorn-standalone.sh scripts/be-restart-uvicorn-standalone.sh
chmod +x scripts/verify-sprint-report-be.sh scripts/be-restart-uvicorn-standalone.sh 2>/dev/null || true

# config LLM fields (append-only style via python)
PY="python3"
[ -x venv/bin/python ] && PY="venv/bin/python"
"$PY" <<'PY'
from pathlib import Path
p = Path("config.py")
if not p.is_file():
    print("  WARN config.py missing")
    raise SystemExit(0)
text = p.read_text(encoding="utf-8")
if "llm_enabled" in text:
    print("  OK  config.py llm_* fields")
else:
    block = """
    # LLM — 주간 스프린트 요약 (dej_sdk)
    llm_enabled: bool = False
    llm_model: str = "dej/gpt-5-nano"
    llm_user_id: str = ""

"""
    marker = "    model_config = SettingsConfigDict("
    if marker in text:
        p.write_text(text.replace(marker, block + marker, 1), encoding="utf-8")
        print("  + config.py llm fields patched")
    else:
        print("  WARN config.py — add llm_enabled manually")
PY

grep -q '^LLM_ENABLED=' .env 2>/dev/null || echo 'LLM_ENABLED=true' >> .env
grep -q '^LLM_MODEL=' .env 2>/dev/null || echo 'LLM_MODEL=dej/gpt-5-nano' >> .env
grep -q '^LLM_USER_ID=' .env 2>/dev/null || echo 'LLM_USER_ID=seokmin.koh' >> .env

echo ""
echo "=== dej_sdk import (venv) ==="
if "$PY" -c "from dej_sdk import llm" 2>/tmp/dej_import.err; then
  echo "  OK  dej_sdk"
else
  echo "  NG  dej_sdk — AxStudio/dej 환경 pip 또는 내부 wheel 설치 필요:"
  head -3 /tmp/dej_import.err
  echo "  (LLM 없으면 규칙기반 요약만 source=rule)"
fi

mkdir -p /usr/app/src 2>/dev/null || true
cp .env /usr/app/src/.env 2>/dev/null || true

echo ""
sh scripts/be-restart-uvicorn-standalone.sh || true

echo ""
sh scripts/verify-sprint-report-be.sh
