#!/bin/sh
# BE pod — 전 모델 일정 overview API + seed
#
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   sh scripts/deploy-model-schedule-overview-be.sh
#   API_BASE=http://127.0.0.1:8200/api sh scripts/seed-model-schedule-overview-to-db.sh

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' 없음"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Deploy overview BE from $REF ==="
mkdir -p routers services scripts

for f in \
  backend/routers/model_schedule.py:routers/model_schedule.py \
  backend/services/mongo_helper.py:services/mongo_helper.py \
  scripts/seed-model-schedule-overview.json:scripts/seed-model-schedule-overview.json \
  scripts/seed-model-schedule-overview-to-db.sh:scripts/seed-model-schedule-overview-to-db.sh \
  scripts/deploy-model-schedule-overview-be.sh:scripts/deploy-model-schedule-overview-be.sh \
  scripts/patch-be-main-model-schedule.sh:scripts/patch-be-main-model-schedule.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  echo "  + $dst"
done

sh scripts/patch-be-main-model-schedule.sh

echo ""
echo "  uvicorn 8200 재시작 후:"
echo "  API_BASE=http://127.0.0.1:8200/api sh scripts/seed-model-schedule-overview-to-db.sh"
echo "=== Done ==="
