#!/bin/sh
# BE pod (be-audio-test, /workspace/project) — overview Snapshot 개발 수신자 = SW 담당(개발)
#
# ⚠️ scripts/ 가 pod에 없으면 (최초 1회):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
#     scripts/apply-model-schedule-dev-recipients-be.sh \
#     scripts/verify-model-schedule-dev-recipients-be.sh \
#     scripts/test-overview-share-mail.sh
#   chmod +x scripts/*.sh
#
#   sh scripts/apply-model-schedule-dev-recipients-be.sh
#   sh scripts/verify-model-schedule-dev-recipients-be.sh
#   sh scripts/restart-be-route-port.sh   # 또는 uvicorn 8200 재시작

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' 없음. 먼저:"
  echo "  git fetch github cursor/model-schedule-bar-label-fix-b14b"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply overview dev recipients BE from $REF ==="
mkdir -p routers services scripts backend/tests

for f in \
  backend/services/model_schedule_recipients.py:services/model_schedule_recipients.py \
  backend/routers/model_schedule.py:routers/model_schedule.py \
  backend/tests/test_model_schedule_share.py:backend/tests/test_model_schedule_share.py \
  scripts/apply-model-schedule-dev-recipients-be.sh:scripts/apply-model-schedule-dev-recipients-be.sh \
  scripts/verify-model-schedule-dev-recipients-be.sh:scripts/verify-model-schedule-dev-recipients-be.sh \
  scripts/test-overview-share-mail.sh:scripts/test-overview-share-mail.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  echo "  + $dst"
done

if [ ! -f services/model_schedule_recipients.py ]; then
  echo "Error: model_schedule_recipients.py 복사 실패"
  exit 1
fi

chmod +x scripts/apply-model-schedule-dev-recipients-be.sh \
  scripts/verify-model-schedule-dev-recipients-be.sh \
  scripts/test-overview-share-mail.sh 2>/dev/null || true

echo ""
echo "=== main.py 라우터 확인 ==="
if [ -f scripts/patch-be-main-model-schedule.sh ]; then
  sh scripts/patch-be-main-model-schedule.sh
else
  grep -q model_schedule main.py 2>/dev/null || echo "  ⚠️ patch-be-main-model-schedule.sh 없음 — main.py 수동 확인"
fi

echo ""
echo "=== 다음 단계 ==="
echo "1) uvicorn 재시작:"
echo "   sh scripts/restart-be-route-port.sh"
echo "   # 또는: uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8200"
echo ""
echo "2) 검증:"
echo "   sh scripts/verify-model-schedule-dev-recipients-be.sh"
echo ""
echo "3) 메일 테스트 (SW 담당 기준 수신자):"
echo "   sh scripts/test-overview-share-mail.sh"
echo "=== Done ==="
