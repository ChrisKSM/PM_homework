#!/bin/sh
# BE pod (be-audio-test, /workspace/project) — overview Snapshot 개발 수신자 = SW 담당(개발)
#
# ⚠️ FE pod(project-react-audio-*) 에서 실행 금지 — backend/ 폴더 있어도 FE임
#
# BE pod (최초 1회):
#   cd /workspace/project
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
#     scripts/pod-detect.sh \
#     scripts/apply-model-schedule-dev-recipients-be.sh \
#     scripts/verify-model-schedule-dev-recipients-be.sh \
#     scripts/test-overview-share-mail.sh \
#     scripts/patch-be-main-model-schedule.sh \
#     scripts/restart-be-route-port.sh
#   chmod +x scripts/*.sh
#
#   sh scripts/apply-model-schedule-dev-recipients-be.sh
#   sh scripts/verify-model-schedule-dev-recipients-be.sh
#   sh scripts/restart-be-route-port.sh

set -e
cd "$(dirname "$0")/.."
. "$(dirname "$0")/pod-detect.sh"

ROOT="$(be_project_root)"
cd "$ROOT"
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' 없음. 먼저:"
  echo "  git fetch github cursor/model-schedule-bar-label-fix-b14b"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply overview dev recipients BE from $REF (cwd: $ROOT) ==="
mkdir -p routers services scripts tests

for f in \
  backend/services/model_schedule_recipients.py:services/model_schedule_recipients.py \
  backend/routers/model_schedule.py:routers/model_schedule.py \
  backend/tests/test_model_schedule_share.py:tests/test_model_schedule_share.py \
  scripts/pod-detect.sh:scripts/pod-detect.sh \
  scripts/apply-model-schedule-dev-recipients-be.sh:scripts/apply-model-schedule-dev-recipients-be.sh \
  scripts/verify-model-schedule-dev-recipients-be.sh:scripts/verify-model-schedule-dev-recipients-be.sh \
  scripts/test-overview-share-mail.sh:scripts/test-overview-share-mail.sh \
  scripts/patch-be-main-model-schedule.sh:scripts/patch-be-main-model-schedule.sh \
  scripts/restart-be-route-port.sh:scripts/restart-be-route-port.sh
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

chmod +x scripts/pod-detect.sh \
  scripts/apply-model-schedule-dev-recipients-be.sh \
  scripts/verify-model-schedule-dev-recipients-be.sh \
  scripts/test-overview-share-mail.sh \
  scripts/patch-be-main-model-schedule.sh \
  scripts/restart-be-route-port.sh 2>/dev/null || true

echo ""
echo "=== main.py 라우터 확인 ==="
if [ -f main.py ] && [ -f scripts/patch-be-main-model-schedule.sh ]; then
  sh scripts/patch-be-main-model-schedule.sh || echo "  ⚠️ main.py 패치 스킵/실패 — model_schedule.router 수동 확인"
else
  echo "  ⚠️ main.py 없음"
fi

echo ""
echo "=== 다음 단계 ==="
echo "1) uvicorn 재시작:"
echo "   sh scripts/restart-be-route-port.sh"
echo ""
echo "2) 검증:"
echo "   sh scripts/verify-model-schedule-dev-recipients-be.sh"
echo ""
echo "3) 메일 테스트:"
echo "   API_BASE=http://127.0.0.1:8000/api sh scripts/test-overview-share-mail.sh"
echo "=== Done ==="
