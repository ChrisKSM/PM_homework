#!/bin/sh
# 전 모델 일정 BE/FE 진단 (BE pod 또는 curl 가능 환경)
#
#   API_BASE=http://127.0.0.1:8200/api sh scripts/verify-model-schedule-overview.sh
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/verify-model-schedule-overview.sh

set -e
API_BASE="${API_BASE:-http://127.0.0.1:8200/api}"

echo "=== Overview API 진단 ==="
echo "API_BASE=$API_BASE"
echo ""

echo "--- GET /health ---"
curl -sf "$API_BASE/../health" 2>/dev/null || curl -sf "${API_BASE%/api}/health" 2>/dev/null || echo "(health skip)"
echo ""

echo "--- GET /model-schedule/overview/load ---"
HTTP=$(curl -sS -o /tmp/overview-load.json -w "%{http_code}" "$API_BASE/model-schedule/overview/load" || echo "000")
echo "HTTP $HTTP"
if [ "$HTTP" = "200" ]; then
  python3 - <<'PY'
import json
d = json.load(open("/tmp/overview-load.json"))
models = d.get("models") or []
print("count:", d.get("count", len(models)))
if models:
    m0 = models[0]
    print("sample model:", m0.get("model"), "| events:", len(m0.get("events") or []))
    print("first 5:", ", ".join(m.get("model", "?") for m in models[:5]))
else:
    print("⚠️ models 비어 있음 — seed 필요:")
    print("  API_BASE=http://127.0.0.1:8200/api sh scripts/seed-model-schedule-overview-to-db.sh")
PY
else
  echo "⚠️ overview/load 실패 — BE 배포·uvicorn 8200 재시작·main.py router 확인"
  cat /tmp/overview-load.json 2>/dev/null || true
fi

echo ""
echo "=== FE 확인 ==="
echo "  react-audio FE pod에서 apply-model-schedule-overview-fe.sh + npm run build + push"
echo "  화면: /model-schedule/overview (구버전은 '준비 중' placeholder)"
echo "=== Done ==="
