#!/bin/sh
# 모델현황 릴리즈 · Epic — FE + BE pod 원클릭 패치 (2026-03 최신)
#
# FE pod (react-audio):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/apply-model-status-release-fe-be-patch.sh" | FE_ONLY=1 sh
#
# BE pod (be-audio-test flat):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/apply-model-status-release-fe-be-patch.sh" | BE_ONLY=1 sh
#
# FE+BE 각 pod 에서 한 번씩:
#   curl -fsSL ".../apply-model-status-release-fe-be-patch.sh" | sh
#
set -e
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
# CDN stale 방지 — 커밋 핀: REF_SHA=abc1234 또는 최신 브랜치
REF_SHA="${REF_SHA:-$REF}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
ROOT="${ROOT:-/workspace/project}"
PATCH_BUNDLE="2026-03-11-release-gantt-3"

raw_fetch() {
  # shellcheck disable=SC2086
  curl -fsSL -H "Cache-Control: no-cache" -H "Pragma: no-cache" "$1" -o "$2"
}

run_fe() {
  cd "$ROOT"
  mkdir -p scripts src/utils src/api src/hooks src/types src/mocks src/data src/components/modelStatus
  curl -fsSL "$BASE/scripts/fe-model-status-release-gantt-patch.sh" -o scripts/fe-model-status-release-gantt-patch.sh
  chmod +x scripts/fe-model-status-release-gantt-patch.sh
  REF="$REF" ROOT="$ROOT" sh scripts/fe-model-status-release-gantt-patch.sh
}

run_be() {
  cd "$ROOT"
  echo "=== BE patch bundle $PATCH_BUNDLE (ref $REF_SHA) ==="
  mkdir -p scripts services routers
  raw_fetch "$BASE/scripts/fix-release-gantt-missing.sh" scripts/fix-release-gantt-missing.sh
  chmod +x scripts/fix-release-gantt-missing.sh
  REF="$REF" REF_SHA="$REF_SHA" sh scripts/fix-release-gantt-missing.sh

  echo ""
  echo "=== helper scripts (direct fetch — fix 스크립트 CDN 구버전 대비) ==="
  for helper in diagnose-release-gantt-jira.sh verify-release-gantt-be.sh; do
    raw_fetch "$BASE/scripts/$helper" "scripts/$helper"
    chmod +x "scripts/$helper"
    echo "  + scripts/$helper"
  done
  test -f scripts/diagnose-release-gantt-jira.sh || {
    echo "NG  scripts/diagnose-release-gantt-jira.sh download failed"
    exit 1
  }

  if [ -x scripts/restart-be-route-port.sh ]; then
    sh scripts/restart-be-route-port.sh
  else
    echo "  → uvicorn 8000 재시작 (restart-be-route-port.sh 없으면 수동)"
  fi
}

if [ -n "$FE_ONLY" ]; then
  run_fe
  exit 0
fi
if [ -n "$BE_ONLY" ]; then
  run_be
  exit 0
fi

if [ -d "$ROOT/services" ] && [ -f "$ROOT/routers/model_status.py" ]; then
  echo "=== BE pod detected ==="
  run_be
  exit 0
fi
if [ -f "$ROOT/package.json" ] && [ -d "$ROOT/src" ]; then
  echo "=== FE pod detected ==="
  run_fe
  exit 0
fi

echo "NG  FE 또는 BE pod (/workspace/project) 에서 FE_ONLY=1 또는 BE_ONLY=1 로 실행"
exit 1
