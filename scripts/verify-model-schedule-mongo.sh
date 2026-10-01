#!/bin/sh
# BE pod — Milvus(DB) 연결 진단
#
# 사용법:
#   cd /workspace/project
#   sh scripts/verify-model-schedule-mongo.sh

set -e
cd "$(dirname "$0")/.."

# uvicorn 과 동일 venv 사용 (.venv 우선)
if [ -x .venv/bin/python ]; then
  PY=".venv/bin/python"
elif [ -x venv/bin/python ]; then
  PY="venv/bin/python"
else
  PY="python3"
fi

echo "Python: $PY ($($PY -V 2>&1))"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

echo "=== Milvus DB 연결 진단 ==="
echo "MONGO_DB=${MONGO_DB:-dify-mv-audiojdmtask}"
echo "MONGO_HOST=${MONGO_HOST:-dify-mv-audiojdmtask-milvus.milvus.svc}"
echo "MONGO_PORT=${MONGO_PORT:-19530}"
echo "MONGO_USER=${MONGO_USER:-(미설정)}"
echo "MONGO_PASSWORD=${MONGO_PASSWORD:+설정됨}${MONGO_PASSWORD:-❌ 미설정}"

if [ -z "$MONGO_PASSWORD" ] && [ -z "$MONGO_URI" ] && [ -z "$MILVUS_URI" ]; then
  echo "Error: MONGO_PASSWORD 또는 URI 가 .env 에 필요합니다"
  exit 1
fi

echo ""
echo "--- deps (같은 venv에 setuptools + pymilvus) ---"
# setuptools 82+ 는 pkg_resources 제거 → pymilvus 2.4.x import 실패
"$PY" -m pip install "setuptools>=69.0.0,<82" "pymilvus>=2.5.0" -q

echo ""
echo "--- pkg_resources 확인 ---"
if ! "$PY" -c "import pkg_resources; import pymilvus; print('OK pymilvus', pymilvus.__version__)" 2>/dev/null; then
  echo "FAIL: pkg_resources 또는 pymilvus import 실패"
  echo "수동 실행: $PY -m pip install setuptools pymilvus"
  exit 1
fi

echo ""
echo "--- Milvus diagnose ---"
"$PY" -c "
import sys, json
sys.path.insert(0, '.')
from services import mongo_helper
d = mongo_helper.diagnose('model_schedule_data')
print(json.dumps(d, indent=2, ensure_ascii=False))
sys.exit(0 if d.get('ok') else 1)
"

echo ""
echo "--- BE /api/model-schedule/diagnose ---"
if curl -sf http://127.0.0.1:8000/api/model-schedule/diagnose >/tmp/diag.json 2>/dev/null; then
  "$PY" -m json.tool /tmp/diag.json
else
  echo "(uvicorn 미실행 — skip)"
fi

echo ""
echo "=== 참고 ==="
echo "  Milvus 포트: 19530"
echo "  uvicorn 도 같은 venv 로 실행: $PY -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo "=== Done ==="
