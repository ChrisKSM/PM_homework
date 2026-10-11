#!/bin/sh
# BE pod — 전 모델 일정 overview API + seed
#
# ⚠️ scripts/ 가 pod에 없으면 (최초 1회):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
#     scripts/deploy-model-schedule-overview-be.sh \
#     scripts/seed-model-schedule-overview-to-db.sh \
#     scripts/seed-model-schedule-overview.json \
#     scripts/patch-be-main-model-schedule.sh
#   chmod +x scripts/*.sh
#
#   sh scripts/deploy-model-schedule-overview-be.sh
#   # uvicorn 8000 재시작
#   API_BASE=http://127.0.0.1:8000/api sh scripts/seed-model-schedule-overview-to-db.sh

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
  backend/services/email_service.py:services/email_service.py \
  backend/services/overview_snapshot_email.py:services/overview_snapshot_email.py \
  scripts/seed-model-schedule-overview.json:scripts/seed-model-schedule-overview.json \
  scripts/seed-model-schedule-overview-to-db.sh:scripts/seed-model-schedule-overview-to-db.sh \
  scripts/apply-model-schedule-overview-be.sh:scripts/apply-model-schedule-overview-be.sh \
  scripts/verify-overview-be-deployed.sh:scripts/verify-overview-be-deployed.sh \
  scripts/test-overview-share-mail.sh:scripts/test-overview-share-mail.sh \
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
echo "  uvicorn 8000 재시작 후:"
echo "  API_BASE=http://127.0.0.1:8000/api sh scripts/seed-model-schedule-overview-to-db.sh"
echo "=== Done ==="
