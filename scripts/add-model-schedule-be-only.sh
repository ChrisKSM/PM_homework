#!/bin/sh
# be-audio-test pod — 모델 현황 MongoDB API만 추가. config/jira_client/.env 덮어쓰지 않음.
#
# /workspace/project (be-audio-test):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/add-model-schedule-be-only.sh github/webpack-migration
#
# 수동 적용 (스크립트 없이):
#   git checkout github/webpack-migration -- backend/services/mongo_helper.py backend/routers/model_schedule.py
#   cp backend/services/mongo_helper.py services/mongo_helper.py
#   cp backend/routers/model_schedule.py routers/model_schedule.py
#   sh scripts/patch-be-main-model-schedule.sh

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Add 모델 현황 MongoDB API ONLY from $REF ==="
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

sh scripts/patch-be-main-model-schedule.sh

grep -q MONGO_API_TOKEN .env 2>/dev/null || cat >> .env <<'EOF'

# ── MongoDB (모델 현황 저장) ─────────────────────────────────────────────────
MONGO_API_BASE=https://delivery-portal-db-watcher.apps.hedej.lge.com
MONGO_API_TOKEN=
EOF

echo ""
echo "=== 건드리지 않은 파일 ==="
echo "  config.py / jira_client.py / .env 기존 값 유지"
echo ""
echo "=== 다음 ==="
echo "  .env 에 MONGO_API_TOKEN 설정"
echo "  uvicorn main:app 재시작 후:"
echo "    curl -s http://127.0.0.1:8000/api/model-schedule/load"
echo "    curl -s -X POST http://127.0.0.1:8000/api/model-schedule/save -H 'Content-Type: application/json' -d '{\"rows\":[]}'"
echo "=== Done ==="
