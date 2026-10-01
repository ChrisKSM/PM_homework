#!/bin/sh
# BE pod — MongoDB 직접 연결 진단
#
# 사용법:
#   cd /workspace/project
#   sh scripts/verify-model-schedule-mongo.sh
#
# .env: MONGO_HOST / MONGO_PORT / MONGO_USER / MONGO_PASSWORD / MONGO_DB
#   또는 MONGO_URI

set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

echo "=== MongoDB 직접 연결 진단 ==="
echo "MONGO_DB=${MONGO_DB:-dify-mv-audiojdmtask}"
echo "MONGO_HOST=${MONGO_HOST:-dify-mv-audiojdmtask-milvus.milvus.svc}"
echo "MONGO_PORT=${MONGO_PORT:-27017}"
echo "MONGO_USER=${MONGO_USER:-(미설정)}"
echo "MONGO_PASSWORD=${MONGO_PASSWORD:+설정됨}${MONGO_PASSWORD:-❌ 미설정}"

if [ -z "$MONGO_PASSWORD" ] && [ -z "$MONGO_URI" ]; then
  echo "Error: MONGO_PASSWORD 또는 MONGO_URI 가 .env 에 필요합니다"
  exit 1
fi

echo ""
echo "--- pymongo ping (Python) ---"
python3 - <<'PY' 2>/dev/null || python - <<'PY'
import os, sys
sys.path.insert(0, ".")
try:
    from services import mongo_helper
    d = mongo_helper.diagnose("model_schedule_data")
    import json
    print(json.dumps(d, indent=2, ensure_ascii=False))
    sys.exit(0 if d.get("ok") else 1)
except Exception as e:
    print(f"FAIL: {e}")
    sys.exit(1)
PY

echo ""
echo "--- BE /api/model-schedule/diagnose (uvicorn) ---"
curl -s http://127.0.0.1:8000/api/model-schedule/diagnose 2>/dev/null | python3 -m json.tool || echo "(uvicorn 미실행)"

echo ""
echo "=== 기대 결과 ==="
echo "  ping: ok true"
echo "  collection_exists: true"
echo "  HTTP 502 / connection refused → MONGO_HOST/PORT 확인 (MongoDB 기본 포트 27017)"
echo "=== Done ==="
