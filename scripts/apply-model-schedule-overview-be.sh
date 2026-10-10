#!/bin/sh
# BE pod (be-audio-test, /workspace/project) — 전 모델 일정 overview API + Snapshot 메일
#
# ⚠️ scripts/ 가 pod에 없으면 (최초 1회):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
#     scripts/apply-model-schedule-overview-be.sh \
#     scripts/verify-overview-be-deployed.sh \
#     scripts/seed-model-schedule-overview-to-db.sh \
#     scripts/seed-model-schedule-overview.json
#   chmod +x scripts/*.sh
#
#   sh scripts/apply-model-schedule-overview-be.sh
#   # uvicorn 8000 재시작
#   sh scripts/verify-overview-be-deployed.sh
#   API_BASE=http://127.0.0.1:8000/api sh scripts/seed-model-schedule-overview-to-db.sh

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' 없음. 먼저:"
  echo "  git fetch github cursor/model-schedule-bar-label-fix-b14b"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply 전 모델 일정 BE from $REF ==="
mkdir -p routers services scripts

for f in \
  backend/routers/model_schedule.py:routers/model_schedule.py \
  backend/services/mongo_helper.py:services/mongo_helper.py \
  backend/services/email_service.py:services/email_service.py \
  backend/services/schedule_snapshot_email.py:services/schedule_snapshot_email.py \
  backend/services/overview_snapshot_email.py:services/overview_snapshot_email.py \
  backend/config.py:config.py \
  scripts/seed-model-schedule-overview.json:scripts/seed-model-schedule-overview.json \
  scripts/seed-model-schedule-overview-to-db.sh:scripts/seed-model-schedule-overview-to-db.sh \
  scripts/apply-model-schedule-overview-be.sh:scripts/apply-model-schedule-overview-be.sh \
  scripts/verify-overview-be-deployed.sh:scripts/verify-overview-be-deployed.sh \
  scripts/patch-be-main-model-schedule.sh:scripts/patch-be-main-model-schedule.sh \
  scripts/patch-config-snapshot-smtp.sh:scripts/patch-config-snapshot-smtp.sh \
  scripts/patch-env-snapshot-smtp.sh:scripts/patch-env-snapshot-smtp.sh \
  scripts/patch-env-cors-axstudio.sh:scripts/patch-env-cors-axstudio.sh \
  scripts/patch-be-config-cors.sh:scripts/patch-be-config-cors.sh \
  scripts/patch-be-main-cors.sh:scripts/patch-be-main-cors.sh \
  scripts/apply-be-cors-axstudio.sh:scripts/apply-be-cors-axstudio.sh \
  backend/jira_client.py:jira_client.py \
  backend/routers/manager.py:routers/manager.py \
  scripts/apply-jira-be-fix.sh:scripts/apply-jira-be-fix.sh \
  scripts/verify-jira-be.sh:scripts/verify-jira-be.sh \
  scripts/fix-be-token.sh:scripts/fix-be-token.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  echo "  + $dst"
done

if [ ! -f services/overview_snapshot_email.py ]; then
  echo "Error: overview_snapshot_email.py 복사 실패"
  exit 1
fi

grep -q pymilvus requirements.txt 2>/dev/null || echo "pymilvus==2.5.8" >> requirements.txt
grep -q setuptools requirements.txt 2>/dev/null || echo "setuptools>=69.0.0,<82" >> requirements.txt

echo ""
echo "=== main.py / config / .env 패치 ==="
sh scripts/patch-be-main-model-schedule.sh
sh scripts/patch-be-main-cors.sh
sh scripts/patch-config-snapshot-smtp.sh

if [ ! -f .env ]; then
  touch .env
fi
grep -q MONGO_HOST .env 2>/dev/null || cat >> .env <<'EOF'

# ── Milvus (모델 현황) ───────────────────────────────────────────────────────
MONGO_HOST=dify-mv-audiojdmtask-milvus.milvus.svc
MONGO_PORT=19530
MONGO_USER=dify-mv-audiojdmtask-admin
MONGO_PASSWORD=
MONGO_DB=dify_mv_audiojdmtask
EOF

chmod +x scripts/patch-env-snapshot-smtp.sh 2>/dev/null || true
sh scripts/patch-env-snapshot-smtp.sh .env 2>/dev/null || true
chmod +x scripts/patch-env-cors-axstudio.sh 2>/dev/null || true
sh scripts/patch-env-cors-axstudio.sh .env 2>/dev/null || true

if [ -x .venv/bin/python ]; then
  PY=".venv/bin/python"
elif [ -x venv/bin/python ]; then
  PY="venv/bin/python"
else
  PY="python3"
fi
"$PY" -m pip install "setuptools>=69.0.0,<82" "pymilvus>=2.5.0" -q 2>/dev/null || true

echo ""
echo "=== 다음 단계 ==="
echo "1) uvicorn 재시작 (port 8000):"
echo "   uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo ""
echo "2) 검증:"
echo "   sh scripts/verify-overview-be-deployed.sh"
echo ""
echo "3) DB seed (Sound Suite 7 / 17모델):"
echo "   API_BASE=http://127.0.0.1:8000/api sh scripts/seed-model-schedule-overview-to-db.sh"
echo ""
echo "4) overview 메일 테스트 (seokmin.koh@lge.com):"
echo "   sh scripts/test-overview-share-mail.sh"
echo "=== Done ==="
