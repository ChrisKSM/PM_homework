#!/bin/sh
# 모델 검증 일정 상세 — FE + BE 패치 일괄 반영 (GitHub raw)
#
# FE pod:
#   cd /workspace/project
#   sh scripts/apply-model-schedule-verification-patch.sh
#
# BE pod (package.json 없음 — FE fetch/build 스킵, seed 만):
#   cd /workspace/project
#   sh scripts/apply-model-schedule-verification-patch.sh --be-only
#
# FE 만:
#   sh scripts/apply-model-schedule-verification-patch.sh --fe-only
#
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BE_ONLY=0
FE_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --be-only) BE_ONLY=1 ;;
    --fe-only) FE_ONLY=1 ;;
  esac
done

cd "$ROOT"

apply_fe() {
  echo "=== FE: Verification UI + mock JSON @ ${REF} ==="
  sh scripts/apply-model-schedule-verification-ui-fe.sh
  BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
  mkdir -p public scripts
  curl -fsSL "$BASE/public/model-schedule-verification-mock.json" \
    -o public/model-schedule-verification-mock.json
  echo "  + public/model-schedule-verification-mock.json"
  curl -fsSL "$BASE/scripts/prepare_model_schedule_seed.py" \
    -o scripts/prepare_model_schedule_seed.py
  echo "  + scripts/prepare_model_schedule_seed.py"
  if [ -f package.json ]; then
    echo "=== npm run build ==="
    npm run build
  else
    echo "=== package.json 없음 — build 스킵 (FE pod 에서 npm run build) ==="
  fi
}

apply_be() {
  echo "=== BE: seed JSON (72행, Sound Suite + H7 VI) @ ${REF} ==="
  mkdir -p scripts
  BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
  curl -fsSL "$BASE/scripts/seed-model-schedule-data.json" \
    -o scripts/seed-model-schedule-data.json
  curl -fsSL "$BASE/scripts/seed-model-schedule-to-db.sh" \
    -o scripts/seed-model-schedule-to-db.sh
  curl -fsSL "$BASE/scripts/prepare_model_schedule_seed.py" \
    -o scripts/prepare_model_schedule_seed.py
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
echo "  브라우저: DevTools → Application → localStorage → 'model-schedule-data' 삭제 후 새로고침"
echo "  확인: 사운드스위트(Wi-Fi) H7→W7→M7/M5→H7 VI, 사운드바 S80C/Connect Box/S95TR"
echo "=== Done ==="
