#!/bin/sh
# react-audio FE — 전 모델 일정 Snapshot 메일 수신자 = SW 담당(개발) 자동
#
# FE pod (/workspace/project) — backend/ 폴더 있어도 여기서 실행
#
# ⚠️ scripts/ 가 pod에 없으면 (최초 1회):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
#     scripts/pod-detect.sh \
#     scripts/cleanup-be-from-fe.sh \
#     scripts/apply-model-schedule-dev-recipients-fe.sh \
#     scripts/verify-model-schedule-dev-recipients-fe.sh
#   chmod +x scripts/*.sh
#
#   sh scripts/cleanup-be-from-fe.sh          # BE 실수 반영 정리 (1회)
#   sh scripts/apply-model-schedule-dev-recipients-fe.sh
#   sh scripts/verify-model-schedule-dev-recipients-fe.sh
#   npm run build && git push origin master

set -e
cd "$(dirname "$0")/.."
. "$(dirname "$0")/pod-detect.sh"
require_fe_project

REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github cursor/model-schedule-bar-label-fix-b14b 먼저"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply overview dev recipients FE from $REF ==="
mkdir -p src/utils src/components/modelSchedule scripts

for f in \
  src/utils/modelScheduleDevRecipients.ts \
  src/components/modelSchedule/OverviewSnapshotDialog.tsx \
  scripts/pod-detect.sh \
  scripts/cleanup-be-from-fe.sh \
  scripts/apply-model-schedule-dev-recipients-fe.sh \
  scripts/verify-model-schedule-dev-recipients-fe.sh
do
  show "$f" > "$f"
  echo "  + $f"
done

chmod +x scripts/pod-detect.sh \
  scripts/cleanup-be-from-fe.sh \
  scripts/apply-model-schedule-dev-recipients-fe.sh \
  scripts/verify-model-schedule-dev-recipients-fe.sh 2>/dev/null || true

if [ ! -f src/utils/modelScheduleDevRecipients.ts ]; then
  echo "Error: modelScheduleDevRecipients.ts 복사 실패"
  exit 1
fi

echo ""
echo "  다음: sh scripts/verify-model-schedule-dev-recipients-fe.sh && npm run build → git push"
echo "  화면: /model-schedule/overview → Snapshot → 개발 수신자 = SW 담당 메일"
echo "=== Done ==="
