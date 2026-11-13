#!/bin/sh
# BE pod — Polarion 진단 스크립트만 GitHub에서 받기 (전체 PRD 패치 없이)
#
#   REF=cursor/model-schedule-bar-label-fix-b14b sh scripts/fetch-polarion-diagnose-scripts.sh
#
set -e
ROOT="${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
mkdir -p scripts

for name in diagnose-polarion-pat.sh curl-polarion-prd-verbose.sh probe-polarion-prd-rest.sh; do
  echo "  + scripts/$name"
  curl -fsSL "$BASE/scripts/$name" -o "scripts/$name"
  chmod +x "scripts/$name"
done

echo "=== done — run: set -a && . ./.env && set +a && sh scripts/diagnose-polarion-pat.sh ==="
