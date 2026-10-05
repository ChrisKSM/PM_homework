#!/bin/sh
# BE pod — 전 모델 일정 overview + overview/share 배포 확인
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0

if [ -n "${1:-}" ]; then
  BASE="$1"
else
  BASE=""
  for p in 8200 8000; do
    if curl -sf "http://127.0.0.1:${p}/health" >/dev/null 2>&1; then
      BASE="http://127.0.0.1:${p}"
      break
    fi
  done
  [ -n "$BASE" ] || BASE="http://127.0.0.1:8200"
fi

check() {
  if eval "$2"; then
    echo "  OK  $1"
  else
    echo "  NG  $1"
    FAIL=1
  fi
}

echo "=== 전 모델 일정 BE 배포 검증 ($BASE) ==="

check "model_schedule.py" "[ -f routers/model_schedule.py ]"
check "overview_snapshot_email.py" "[ -f services/overview_snapshot_email.py ]"
check "email_service.py" "[ -f services/email_service.py ]"
check "overview/load route" "grep -q 'overview/load' routers/model_schedule.py"
check "overview/save route" "grep -q 'overview/save' routers/model_schedule.py"
check "overview/share route" "grep -q 'overview/share' routers/model_schedule.py"
check "seed JSON" "[ -f scripts/seed-model-schedule-overview.json ]"

if [ -f scripts/seed-model-schedule-overview.json ]; then
  SS=$(python3 -c "
import json
m = json.load(open('scripts/seed-model-schedule-overview.json'))['models']
ss = [x for x in m if x.get('category')=='Sound Suite']
print(len(ss))
" 2>/dev/null || echo 0)
  if [ "$SS" = "7" ]; then
    echo "  OK  seed Sound Suite 7모델"
  else
    echo "  NG  seed Sound Suite ${SS}/7 — apply 스크립트 재실행"
    FAIL=1
  fi
fi

echo ""
echo "=== HTTP ==="
for path in /api/model-schedule/overview/load; do
  CODE=$(curl -s -o /tmp/ov_load.json -w "%{http_code}" "${BASE}${path}" 2>/dev/null || echo "000")
  echo "  GET $path → HTTP $CODE"
done

CODE=$(curl -s -o /tmp/ov_share.json -w "%{http_code}" -X POST \
  "${BASE}/api/model-schedule/overview/share" \
  -H "Content-Type: application/json" \
  -d '{
    "period_label": "26/10월",
    "dates": ["2026-10-01","2026-10-02"],
    "models": [{
      "id": "t1", "category": "Sound Suite", "model": "TEST",
      "variant": "JDM B_HW", "soc": "", "swPm": "", "spec": "", "pv": "", "mp": "",
      "events": [{"name": "FC 1", "start": "2026-10-01", "end": "2026-10-02", "kind": "sw"}]
    }],
    "display_rows": [{
      "modelId": "t1", "category": "Sound Suite", "model": "TEST",
      "variant": "JDM B_HW", "swPm": "", "timelineKind": "sw", "lineIndex": 0,
      "bars": [{"start": "2026-10-01", "end": "2026-10-02", "label": "FC 1", "barType": "fc", "kind": "sw"}]
    }],
    "audiences": ["개발"],
    "recipients": ["seokmin.koh@lge.com"]
  }' 2>/dev/null || echo "000")
echo "  POST /api/model-schedule/overview/share → HTTP $CODE"
case "$CODE" in
  000) echo "       → BE 미기동 — uvicorn 8200 재시작" ;;
  404) echo "       → 404: 구버전 — sh scripts/apply-model-schedule-overview-be.sh" ;;
  503) echo "       → 503: SMTP 미설정" ;;
  200) echo "       → OK  메일 발송 성공" ;;
  *) head -c 180 /tmp/ov_share.json 2>/dev/null; echo "" ;;
esac

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ BE 소스 OK. uvicorn 재시작 + seed 후 FE에서 확인"
else
  echo "❌ 누락/구버전 — sh scripts/apply-model-schedule-overview-be.sh"
fi
echo "=== Done ==="
exit "$FAIL"
