#!/bin/sh
# be-audio-test pod — 모델 현황 MongoDB 직접 연결 API 추가
#
# /workspace/project (be-audio-test):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/add-model-schedule-be-only.sh github/webpack-migration
#
# .env 예시:
#   MONGO_HOST=dify-mv-audiojdmtask-milvus.milvus.svc
#   MONGO_PORT=27017
#   MONGO_USER=dify-mv-audiojdmtask-admin
#   MONGO_PASSWORD=<비밀번호>
#   MONGO_DB=dify-mv-audiojdmtask

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Add 모델 현황 MongoDB (pymongo) from $REF ==="
mkdir -p routers services scripts

for f in \
  backend/services/mongo_helper.py:services/mongo_helper.py \
  backend/routers/model_schedule.py:routers/model_schedule.py \
  scripts/patch-be-main-model-schedule.sh:scripts/patch-be-main-model-schedule.sh \
  scripts/verify-model-schedule-mongo.sh:scripts/verify-model-schedule-mongo.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  echo "  + $dst"
done

# requirements.txt 에 pymongo 추가 (없으면)
grep -q pymongo requirements.txt 2>/dev/null || echo "pymongo==4.7.2" >> requirements.txt
echo "  + requirements.txt (pymongo)"

sh scripts/patch-be-main-model-schedule.sh

grep -q MONGO_HOST .env 2>/dev/null || cat >> .env <<'EOF'

# ── MongoDB (모델 현황) ──────────────────────────────────────────────────────
MONGO_HOST=dify-mv-audiojdmtask-milvus.milvus.svc
MONGO_PORT=27017
MONGO_USER=dify-mv-audiojdmtask-admin
MONGO_PASSWORD=
MONGO_DB=dify-mv-audiojdmtask
EOF

echo ""
pip install pymongo==4.7.2 -q 2>/dev/null || pip install pymongo==4.7.2 -q || true

echo ""
echo "  config.py / jira_client.py / .env 기존 Jira 값은 유지"
echo "  .env 에 MONGO_PASSWORD 설정 후:"
echo "    pip install -r requirements.txt"
echo "    sh scripts/verify-model-schedule-mongo.sh"
echo "    uvicorn main:app 재시작"
echo "=== Done ==="
