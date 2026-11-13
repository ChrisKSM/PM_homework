#!/bin/sh
# Alias — 최신 모델현황 FE 패치 (summary-kpi 스크립트와 동일)
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fe-model-status-latest-patch.sh" | sh
set -e
ROOT="${ROOT:-/workspace/project}"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
curl -fsSL -H "Cache-Control: no-cache" "$BASE/scripts/fe-model-status-summary-kpi-patch.sh" \
  | ROOT="$ROOT" REF="$REF" sh
