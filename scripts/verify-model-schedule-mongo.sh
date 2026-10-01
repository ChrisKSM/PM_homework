#!/bin/sh
# BE pod — MongoDB API 연결 진단 (be-audio-test / workspace)
#
# 사용법:
#   cd /workspace/project
#   sh scripts/verify-model-schedule-mongo.sh
#
# .env 에 MONGO_API_BASE, MONGO_API_TOKEN 필요

set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

BASE="${MONGO_API_BASE:-https://delivery-portal-db-watcher.apps.hedej.lge.com}"
TOKEN="${MONGO_API_TOKEN:-}"
COL="model_schedule_data"

echo "=== MongoDB API 진단 ==="
echo "MONGO_API_BASE=$BASE"
echo "MONGO_API_TOKEN=${TOKEN:+설정됨 (${#TOKEN} chars)}${TOKEN:-❌ 미설정}"

if [ -z "$TOKEN" ]; then
  echo "Error: MONGO_API_TOKEN 이 .env 에 없습니다"
  exit 1
fi

echo ""
echo "--- JWT api_permissions (토큰 권한 확인) ---"
python3 - <<'PY' 2>/dev/null || python - <<'PY'
import base64, json, os
token = os.environ.get("MONGO_API_TOKEN", "")
try:
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    data = json.loads(base64.urlsafe_b64decode(payload))
    perms = data.get("api_permissions") or data.get("permissions") or []
    print(json.dumps(perms, indent=2, ensure_ascii=False))
    endpoints = [p.get("endpoint", "") for p in perms if isinstance(p, dict)]
    mongo_ok = any("mongo" in e for e in endpoints)
    if perms and not mongo_ok:
        print("\n⚠️  WARNING: 이 토큰에 mongo-collections / mongo-documents 권한이 없습니다!")
        print("    delivery-portal-db-watcher MongoDB API용 토큰을 별도 발급받으세요.")
except Exception as e:
    print(f"(JWT decode skip: {e})")
PY

echo ""
echo "--- 1) GET /api/mongo-collections/ ---"
curl -s -w "\nHTTP:%{http_code}\n" \
  "$BASE/api/mongo-collections/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | head -40

echo ""
echo "--- 2) POST /api/mongo-collections/ (create $COL) ---"
curl -s -w "\nHTTP:%{http_code}\n" -X POST \
  "$BASE/api/mongo-collections/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"collection_name\":\"$COL\"}" | head -20

echo ""
echo "--- 3) GET /api/mongo-documents/$COL/ ---"
curl -s -w "\nHTTP:%{http_code}\n" \
  "$BASE/api/mongo-documents/$COL/?use_cache=false" \
  -H "Authorization: Bearer $TOKEN" | head -40

echo ""
echo "--- 4) BE model-schedule API (로컬 uvicorn) ---"
curl -s -w "\nHTTP:%{http_code}\n" http://127.0.0.1:8000/api/model-schedule/load 2>/dev/null | head -20 || echo "(uvicorn 미실행 — skip)"

echo ""
echo "--- 5) BE model-schedule API (배포) ---"
curl -s -w "\nHTTP:%{http_code}\n" https://be-audio-test.apps.hedej.lge.com/api/model-schedule/load 2>/dev/null | head -20 || echo "(외부 접근 불가 — skip)"

echo ""
echo "=== 기대 결과 ==="
echo "  mongo-collections: HTTP 200"
echo "  mongo-documents:   HTTP 200 (빈 배열 가능)"
echo "  model-schedule/load: HTTP 200"
echo "  HTTP 401/403 → 토큰 권한 문제"
echo "  HTTP 404 → API 경로 또는 collection 미존재"
echo "=== Done ==="
