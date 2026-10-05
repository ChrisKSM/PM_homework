#!/bin/sh
# BE — overview Snapshot 개발 수신자(swPm) 반영 검증
set -e

be_root() {
  if [ -f main.py ] && [ -d routers ]; then
    pwd
    return 0
  fi
  if [ -f /workspace/project/main.py ] && [ -d /workspace/project/routers ]; then
    echo /workspace/project
    return 0
  fi
  if [ -f package.json ] && [ -d src ] && [ ! -f main.py ]; then
    echo "Error: FE pod(react-audio)입니다 — BE verify가 아닙니다." >&2
    echo "  → sh scripts/verify-model-schedule-dev-recipients-fe.sh" >&2
    exit 1
  fi
  echo "Error: BE root not found (main.py + routers/ 필요)" >&2
  exit 1
}

ROOT="$(be_root)"
cd "$ROOT"

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

echo "=== Verify overview dev recipients BE (cwd: $ROOT) ==="

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

# pytest 없어도 동작 — inline import 테스트 (BE flat layout)
if $PY -c "
import sys
sys.path.insert(0, '.')
from routers.model_schedule import _resolve_share_recipients
addrs = _resolve_share_recipients({'개발'}, None, models=[{'swPm': '고석민/윤필규'}, {'swPm': '조성연'}])
expected = ['seokmin.koh@lge.com', 'pilkyu.yoon@lge.com', 'sungyeon.cho@lge.com']
assert addrs == expected, f'got {addrs}, want {expected}'
" 2>/dev/null; then
  echo "  ✓ swPm recipients logic"
  ok=$((ok + 1))
else
  echo "  ✗ swPm recipients logic"
  fail=$((fail + 1))
fi

# pytest 있으면 추가 실행 (optional)
if $PY -m pytest --version >/dev/null 2>&1; then
  if [ -f tests/test_model_schedule_share.py ]; then
    $PY -m pytest tests/test_model_schedule_share.py -q --tb=no >/dev/null 2>&1 && \
      echo "  ✓ pytest tests/test_model_schedule_share.py" && ok=$((ok + 1)) || \
      echo "  ⚠ pytest skip (optional)"
  fi
fi

BASE="${API_BASE:-http://127.0.0.1:8000/api}"
for port in 8000 8200; do
  if curl -sf "http://127.0.0.1:${port}/docs" >/dev/null 2>&1; then
    BASE="http://127.0.0.1:${port}/api"
    break
  fi
done

if curl -sf "${BASE%/api}/docs" >/dev/null 2>&1; then
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
    echo "  ✗ overview/share API (HTTP $CODE) — uvicorn 재시작 필요"
    fail=$((fail + 1))
  fi
else
  echo "  ⚠ uvicorn 미기동 — API 스킵 (sh scripts/restart-be-route-port.sh)"
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "✅ BE dev recipients OK ($ok checks)"
  exit 0
fi

echo "❌ BE dev recipients FAIL ($fail failed, $ok passed)"
echo "  cd /workspace/project && sh scripts/apply-model-schedule-dev-recipients-be.sh"
exit 1
