#!/bin/sh
# be-audio-test pod — /api/model-schedule/share 배포 여부 확인
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# BE Route / pod: 8000
if [ -n "${1:-}" ]; then
  BASE="$1"
else
  BASE=""
  for p in 8000; do
    if curl -sf "http://127.0.0.1:${p}/health" >/dev/null 2>&1; then
      BASE="http://127.0.0.1:${p}"
      break
    fi
  done
  [ -n "$BASE" ] || BASE="http://127.0.0.1:8000"
fi

echo "=== BE base: $BASE ==="

echo "=== 1. 파일 ==="
for f in routers/model_schedule.py services/email_service.py services/schedule_snapshot_email.py; do
  if [ -f "$f" ]; then echo "  OK  $f"; else echo "  MISSING $f"; fi
done

if [ -f routers/model_schedule.py ]; then
  if grep -q '"/share"' routers/model_schedule.py || grep -q "@router.post(\"/share\")" routers/model_schedule.py; then
    echo "  OK  routers/model_schedule.py has /share route"
  else
    echo "  OLD routers/model_schedule.py — /share 없음 → deploy-model-schedule-share-be.sh 재실행"
  fi
fi

echo ""
echo "=== 2. main.py ==="
if grep -q model_schedule routers/model_schedule.py 2>/dev/null; then :; fi
if grep -q model_schedule main.py 2>/dev/null; then
  echo "  OK  main.py registers model_schedule"
else
  echo "  MISSING — sh scripts/patch-be-main-model-schedule.sh"
fi

echo ""
echo "=== 3. HTTP ==="
for path in /api/model-schedule/load /api/model-schedule/share; do
  if [ "$path" = "/api/model-schedule/share" ]; then
    CODE=$(curl -s -o /tmp/share_test.json -w "%{http_code}" -X POST \
      "${BASE}${path}" -H "Content-Type: application/json" \
      -d '{"period_label":"t","dates":["2026-01-01"],"rows":[{"category":"c","model":"m","event":"e","testType":"일반성능","status":"예정","changes":"","bars":[]}],"audiences":["DQA","개발"]}' \
      2>/dev/null || echo "000")
  else
    CODE=$(curl -s -o /tmp/share_test.json -w "%{http_code}" "${BASE}${path}" 2>/dev/null || echo "000")
  fi
  echo "  $path → HTTP $CODE"
  if [ "$path" = "/api/model-schedule/share" ]; then
    case "$CODE" in
      000) echo "       → 000: BE 미기동 — port 8000 · uvicorn 재시작" ;;
      404) echo "       → 404: 구버전 BE. deploy-model-schedule-share-be.sh 실행 후 uvicorn 재시작" ;;
      503) echo "       → 503: SMTP 미설정 (.env SMTP_HOST 확인)" ;;
      502) echo "       → 502: SMTP 발송 실패" ;;
      200) echo "       → OK  메일 발송 성공" ;;
    esac
    head -c 200 /tmp/share_test.json 2>/dev/null; echo ""
  fi
done

echo "=== Done ==="
