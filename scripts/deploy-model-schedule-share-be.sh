#!/bin/sh
# be-audio-test pod — 모델 검증 일정 Snapshot 메일 공유 BE 배포
# (Milvus load/save + POST /api/model-schedule/share, Audio DL 발신)
#
# BE pod (/workspace/project) 에서:
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   sh scripts/deploy-model-schedule-share-be.sh
#
# 또는 ref 지정:
#   sh scripts/deploy-model-schedule-share-be.sh github/cursor/model-schedule-bar-label-fix-b14b

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' 없음. 먼저 실행:"
  echo "  git fetch github cursor/model-schedule-bar-label-fix-b14b"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Deploy Snapshot mail share BE from $REF ==="
mkdir -p routers services scripts

for f in \
  backend/services/mongo_helper.py:services/mongo_helper.py \
  backend/services/email_service.py:services/email_service.py \
  backend/services/schedule_snapshot_email.py:services/schedule_snapshot_email.py \
  backend/routers/model_schedule.py:routers/model_schedule.py \
  scripts/patch-be-main-model-schedule.sh:scripts/patch-be-main-model-schedule.sh \
  scripts/patch-config-snapshot-smtp.sh:scripts/patch-config-snapshot-smtp.sh \
  scripts/patch-env-snapshot-smtp.sh:scripts/patch-env-snapshot-smtp.sh \
  scripts/verify-model-schedule-mongo.sh:scripts/verify-model-schedule-mongo.sh \
  scripts/deploy-model-schedule-share-be.sh:scripts/deploy-model-schedule-share-be.sh \
  scripts/verify-model-schedule-share-be.sh:scripts/verify-model-schedule-share-be.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  echo "  + $dst"
done

# pymilvus (모델 현황 Milvus)
grep -q pymilvus requirements.txt 2>/dev/null || echo "pymilvus==2.5.8" >> requirements.txt
grep -q setuptools requirements.txt 2>/dev/null || echo "setuptools>=69.0.0,<82" >> requirements.txt

echo ""
echo "=== main.py / config.py 패치 ==="
sh scripts/patch-be-main-model-schedule.sh
sh scripts/patch-config-snapshot-smtp.sh

# .env — Milvus + SMTP (기존 값 유지, 없을 때만 append)
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

show scripts/patch-env-snapshot-smtp.sh > scripts/patch-env-snapshot-smtp.sh
chmod +x scripts/patch-env-snapshot-smtp.sh
sh scripts/patch-env-snapshot-smtp.sh .env

# python
if [ -x .venv/bin/python ]; then
  PY=".venv/bin/python"
elif [ -x venv/bin/python ]; then
  PY="venv/bin/python"
else
  PY="python3"
fi

"$PY" -m pip install "setuptools>=69.0.0,<82" "pymilvus>=2.5.0" -q 2>/dev/null || true

echo ""
echo "=== 배포 검증 ==="
sh scripts/verify-model-schedule-share-be.sh http://127.0.0.1:8000 || true

echo ""
echo "=== 배포 완료 — 다음 단계 ==="
echo ""
echo "1) .env 확인 (MONGO_PASSWORD 등):"
echo "   grep -E 'MONGO_|SMTP_|MODEL_SCHEDULE' .env"
echo ""
echo "2) uvicorn 재시작 (기존 프로세스 종료 후):"
echo "   $PY -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo ""
echo "3) Milvus 연결 확인:"
echo "   sh scripts/verify-model-schedule-mongo.sh"
echo "   curl -s http://127.0.0.1:8000/api/model-schedule/diagnose | python3 -m json.tool"
echo ""
echo "4) 메일 공유 API 테스트 (DQA+개발, seokmin.koh@lge.com):"
cat <<'CURL'

curl -s -X POST http://127.0.0.1:8000/api/model-schedule/share \
  -H "Content-Type: application/json" \
  -d '{
    "period_label": "9/15 ~ 10/26",
    "dates": ["2026-09-15","2026-09-16"],
    "rows": [{
      "category": "사운드바(Wi-Fi)",
      "model": "H7",
      "event": "MR8",
      "testType": "일반성능",
      "status": "예정",
      "changes": "테스트",
      "bars": [{"start": "2026-09-15", "end": "2026-09-16", "type": "planned", "label": ""}]
    }],
    "audiences": ["DQA", "개발"],
    "recipients": ["seokmin.koh@lge.com"]
  }' | python3 -m json.tool

CURL
echo ""
echo "   성공 시: {\"message\":\"메일 발송 완료\", \"subject\":\"[YYYY-MM-DD] 현재 달 QA 모델별 검증 일정\", ...}"
echo "   발신: DL-webOS_PMO-AudioSWPO@lge.com"
echo ""
echo "=== Done ==="
