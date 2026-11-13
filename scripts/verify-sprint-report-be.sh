#!/bin/sh
# be-audio-test pod — sprint report API 404 여부 확인
set -e
cd "$(dirname "$0")/.."
[ -f main.py ] || cd "$(dirname "$0")/../.." 2>/dev/null || true

echo "=== 1. 파일 존재 ==="
for f in \
  routers/devteam.py \
  services/sprint_report_service.py \
  services/llm_client.py \
  services/jira_service.py
do
  if [ -f "$f" ]; then echo "  OK  $f"; else echo "  MISSING  $f"; fi
done

echo ""
echo "=== 2. devteam.py report 라우트 ==="
if grep -q 'sprints/current/report' routers/devteam.py 2>/dev/null; then
  echo "  OK  /api/sprints/current/report 등록됨"
else
  echo "  MISSING — sh scripts/add-sprint-report-be-only.sh 실행 필요"
fi

echo ""
echo "=== 3. 로컬 API (Pod 내부) ==="
echo -n "  /health → "
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/health 2>/dev/null || echo "fail"
echo ""
echo -n "  /api/sprints/current/report → "
CODE=$(curl -s -o /tmp/sprint_report.json -w "%{http_code}" \
  "http://127.0.0.1:8000/api/sprints/current/report?refresh=true" 2>/dev/null || echo "000")
echo "$CODE"
if [ "$CODE" = "200" ]; then
  PY="python3"
  [ -x venv/bin/python ] && PY="venv/bin/python"
  "$PY" <<'PY' 2>/dev/null || head -c 300 /tmp/sprint_report.json
import json
from pathlib import Path
data = json.loads(Path("/tmp/sprint_report.json").read_text())
print(f"  source={data.get('source')} sprint={data.get('sprintName')}")
if data.get("llmDebug"):
    d = data["llmDebug"]
    print(f"  llmDebug: {d.get('phase')} — {str(d.get('reason', ''))[:120]}")
PY
  echo ""
elif [ "$CODE" = "404" ]; then
  echo "  → 404: devteam.py 미반영 또는 uvicorn 재시작 필요"
elif [ "$CODE" = "502" ] || [ "$CODE" = "500" ]; then
  echo "  → 서버 오류 (Jira/내부). Response:"
  head -c 400 /tmp/sprint_report.json 2>/dev/null
  echo ""
fi

echo ""
echo -n "  /api/llm/diagnostics → "
curl -s http://127.0.0.1:8000/api/llm/diagnostics 2>/dev/null | head -c 600
echo ""

echo ""
echo "=== 4. 상세 LLM 진단 (선택) ==="
echo "  sh scripts/diagnose-sprint-report-llm.sh"
echo ""
echo "=== Done ==="
