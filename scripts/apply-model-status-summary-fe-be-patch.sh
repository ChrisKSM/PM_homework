#!/bin/sh
# 모델현황 요약 — HW/SW 타임라인 + KPI-1 SP (Initiative Description vs worklog/Story)
#
# FE pod (project-react-audio-*):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/apply-model-status-summary-fe-be-patch.sh" | FE_ONLY=1 sh
#
# BE pod (project-be-audio-test-*):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/apply-model-status-summary-fe-be-patch.sh" | BE_ONLY=1 sh
#
# REF_SHA=921809e 로 커밋 핀 (CDN stale 시)
#
set -e
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
REF_SHA="${REF_SHA:-$REF}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
ROOT="${ROOT:-/workspace/project}"
PATCH_ID="2026-03-11-summary-timeline-sp-kpi-v5"

run_fe() {
  cd "$ROOT"
  mkdir -p scripts
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/scripts/verify-model-status-summary-fe-deployed.sh" \
    -o scripts/verify-model-status-summary-fe-deployed.sh
  chmod +x scripts/verify-model-status-summary-fe-deployed.sh
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/scripts/fe-model-status-summary-kpi-patch.sh" \
    -o /tmp/fe-summary-patch.sh
  chmod +x /tmp/fe-summary-patch.sh
  REF="$REF" ROOT="$ROOT" sh /tmp/fe-summary-patch.sh
}

run_be() {
  cd "$ROOT"
  if [ ! -f config.py ] || [ ! -f main.py ]; then
    echo "NG: BE pod only (config.py + main.py). React pod 에서 BE_ONLY=1 실행 금지."
    exit 1
  fi
  echo "=== BE patch $PATCH_ID (story-sp-kpi standalone v5+) ==="
  curl -fsSL -H "Cache-Control: no-cache" \
    "$BASE/scripts/patch-be-story-sp-kpi-standalone.sh" -o /tmp/patch-sp-kpi.sh
  chmod +x /tmp/patch-sp-kpi.sh
  sh /tmp/patch-sp-kpi.sh
  if [ -x scripts/verify-story-sp-kpi-be.sh ]; then
    sh scripts/verify-story-sp-kpi-be.sh || true
  else
    curl -fsSL "$BASE/scripts/verify-story-sp-kpi-be.sh" -o scripts/verify-story-sp-kpi-be.sh
    chmod +x scripts/verify-story-sp-kpi-be.sh
    sh scripts/verify-story-sp-kpi-be.sh || true
  fi
}

if [ -n "$FE_ONLY" ]; then run_fe; exit 0; fi
if [ -n "$BE_ONLY" ]; then run_be; exit 0; fi

if [ -f "$ROOT/config.py" ] && [ -f "$ROOT/main.py" ]; then
  echo "=== auto: BE pod ==="
  run_be
  exit 0
fi
if [ -f "$ROOT/package.json" ] && [ -d "$ROOT/src" ]; then
  echo "=== auto: FE pod ==="
  run_fe
  exit 0
fi

echo "NG  /workspace/project 에서 FE_ONLY=1 또는 BE_ONLY=1 로 실행"
exit 1
