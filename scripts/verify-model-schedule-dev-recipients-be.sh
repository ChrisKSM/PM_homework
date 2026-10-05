#!/bin/sh
# BE — overview Snapshot 개발 수신자(swPm) 반영 검증
set -e
cd "$(dirname "$0")/.."

ok=0
fail=0

check() {
  name="$1"
  shift
  if eval "$@"; then
    echo "  ✓ $name"
    ok=$((ok + 1))
  else
    echo "  ✗ $name"
    fail=$((fail + 1))
  fi
}

echo "=== Verify overview dev recipients BE ==="

check "model_schedule_recipients.py" "[ -f services/model_schedule_recipients.py ]"
check "dev_emails_from_models" "grep -q 'def dev_emails_from_models' services/model_schedule_recipients.py"
check "model_schedule imports recipients" "grep -q 'model_schedule_recipients' routers/model_schedule.py"
check "_resolve_share_recipients models kwarg" "grep -q 'models: list' routers/model_schedule.py"
check "overview share passes models" "grep -q 'models=req.models' routers/model_schedule.py"

if [ -x .venv/bin/python ]; then
  PY=".venv/bin/python"
elif [ -x venv/bin/python ]; then
  PY="venv/bin/python"
else
  PY="python3"
fi

check "pytest swPm recipients" "$PY -m pytest backend/tests/test_model_schedule_share.py -q --tb=no 2>/dev/null | grep -q passed || $PY -m pytest tests/test_model_schedule_share.py -q --tb=no 2>/dev/null | grep -q passed"

BASE="${API_BASE:-http://127.0.0.1:8000/api}"
if curl -sf "${BASE%/api}/docs" >/dev/null 2>&1 || curl -sf "http://127.0.0.1:8200/docs" >/dev/null 2>&1; then
  for port in 8000 8200; do
    if curl -sf "http://127.0.0.1:${port}/docs" >/dev/null 2>&1; then
      BASE="http://127.0.0.1:${port}/api"
      break
    fi
  done
  CODE=$(curl -s -o /tmp/dev_recip_test.json -w "%{http_code}" -X POST "${BASE}/model-schedule/overview/share" \
    -H "Content-Type: application/json" \
    -d '{
      "period_label": "test",
      "dates": ["2026-10-01"],
      "models": [{"id":"m1","swPm":"고석민/윤필규"}],
      "display_rows": [{"modelId":"m1","timelineKind":"sw","lineIndex":0,"bars":[]}],
      "audiences": ["개발"],
      "recipients": ["seokmin.koh@lge.com","pilkyu.yoon@lge.com"]
    }' 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ] || [ "$CODE" = "503" ]; then
    echo "  ✓ overview/share API reachable (HTTP $CODE)"
    ok=$((ok + 1))
  else
    echo "  ✗ overview/share API (HTTP $CODE)"
    fail=$((fail + 1))
  fi
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "✅ BE dev recipients OK ($ok checks)"
  exit 0
fi

echo "❌ BE dev recipients FAIL ($fail failed, $ok passed)"
echo "  sh scripts/apply-model-schedule-dev-recipients-be.sh"
exit 1
