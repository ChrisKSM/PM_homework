#!/bin/sh
# 모델 검증 일정 상세 — FE + BE 패치 일괄 반영 (GitHub raw, pod에 scripts 없어도 동작)
#
# FE pod (/tmp 에 받아도 됨):
#   cd /workspace/project
#   REF=cursor/model-schedule-bar-label-fix-b14b
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts/apply-model-schedule-verification-patch.sh" -o /tmp/apply-patch.sh
#   ROOT=/workspace/project sh /tmp/apply-patch.sh --fe-only
#
# BE pod:
#   ROOT=/workspace/project API_BASE=http://127.0.0.1:8000/api sh /tmp/apply-patch.sh --be-only
#
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
BE_ONLY=0
FE_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --be-only) BE_ONLY=1 ;;
    --fe-only) FE_ONLY=1 ;;
  esac
done

if [ ! -d "$ROOT" ]; then
  echo "Error: ROOT not found: $ROOT" >&2
  exit 1
fi
cd "$ROOT"

gh_fetch() {
  src="$1"
  dst="$2"
  mkdir -p "$(dirname "$dst")"
  curl -fsSL "$BASE/$src" -o "$dst"
  echo "  + $dst"
}

apply_fe() {
  echo "=== FE: Verification UI + mock JSON @ ${REF} ==="
  mkdir -p src/pages src/api src/utils src/components/modelSchedule public scripts

  gh_fetch src/utils/modelScheduleMonth.ts src/utils/modelScheduleMonth.ts
  gh_fetch src/utils/modelScheduleDiff.ts src/utils/modelScheduleDiff.ts
  gh_fetch src/utils/modelScheduleRows.ts src/utils/modelScheduleRows.ts
  gh_fetch src/pages/ModelSchedulePage.tsx src/pages/ModelSchedulePage.tsx
  gh_fetch src/api/modelScheduleApi.ts src/api/modelScheduleApi.ts
  gh_fetch src/components/modelSchedule/ScheduleSnapshotDialog.tsx src/components/modelSchedule/ScheduleSnapshotDialog.tsx
  gh_fetch public/model-schedule-verification-mock.json public/model-schedule-verification-mock.json
  gh_fetch scripts/prepare_model_schedule_seed.py scripts/prepare_model_schedule_seed.py

  echo ""
  echo "=== 검증 ==="
  grep -q 'daysInMonth' src/pages/ModelSchedulePage.tsx && echo "  OK  month view"
  grep -q 'ensureSoundSuiteDetailRows' src/utils/modelScheduleRows.ts && echo "  OK  Sound Suite 4모델"
  grep -q 'displayModelName' src/pages/ModelSchedulePage.tsx && echo "  OK  H7 VI 표기"
  grep -q '사운드바(Wi-Fi)' src/utils/modelScheduleRows.ts && echo "  OK  Wi-Fi/사운드바 분리"

  if [ -f package.json ]; then
    echo ""
    echo "=== npm run build ==="
    npm run build
  else
    echo ""
    echo "=== package.json 없음 — build 스킵 ==="
  fi
}

apply_be() {
  echo "=== BE: seed JSON (72행) @ ${REF} ==="
  mkdir -p scripts
  gh_fetch scripts/seed-model-schedule-data.json scripts/seed-model-schedule-data.json
  gh_fetch scripts/seed-model-schedule-to-db.sh scripts/seed-model-schedule-to-db.sh
  gh_fetch scripts/prepare_model_schedule_seed.py scripts/prepare_model_schedule_seed.py
  chmod +x scripts/seed-model-schedule-to-db.sh 2>/dev/null || true
  python3 scripts/prepare_model_schedule_seed.py scripts/seed-model-schedule-data.json
  API_BASE="${API_BASE:-http://127.0.0.1:8000/api}" sh scripts/seed-model-schedule-to-db.sh
}

if [ "$BE_ONLY" = 1 ]; then
  apply_be
elif [ "$FE_ONLY" = 1 ]; then
  apply_fe
else
  apply_fe
  apply_be || echo "WARN: BE seed 실패 — BE pod 에서 --be-only 재실행"
fi

echo ""
echo "=== 패치 반영 완료 ==="
echo "  브라우저 localStorage 'model-schedule-data' 삭제 후 새로고침"
echo "=== Done ==="
