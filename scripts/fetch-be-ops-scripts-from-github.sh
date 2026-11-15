#!/bin/sh
# BE pod — 503 복구/진단 스크립트 일괄 다운로드 (pod git pull 없을 때)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/fetch-be-ops-scripts-from-github.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  chmod +x "$2" 2>/dev/null || true
  echo "  + $2"
}

echo "=== BE ops scripts @ $REF ==="
for pair in \
  "scripts/diagnose-be-503.sh:scripts/diagnose-be-503.sh" \
  "scripts/diagnose-be-route-vs-local.sh:scripts/diagnose-be-route-vs-local.sh" \
  "scripts/restart-be-route-port.sh:scripts/restart-be-route-port.sh" \
  "scripts/be-restart-uvicorn-standalone.sh:scripts/be-restart-uvicorn-standalone.sh" \
  "scripts/scan-be-listeners.sh:scripts/scan-be-listeners.sh" \
  "scripts/restore-be-jira-env.sh:scripts/restore-be-jira-env.sh"
do
  src="${pair%%:*}"
  dst="${pair##*:}"
  fetch "$src" "$dst"
done

echo ""
echo "=== Next ==="
echo "  sh scripts/restart-be-route-port.sh"
echo "  sh scripts/diagnose-be-503.sh"
echo "=== Done ==="
