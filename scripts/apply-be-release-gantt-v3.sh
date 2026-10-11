#!/bin/sh
# BE pod — 릴리즈 Gantt 패치 (CDN 구버전 apply/fix 스크립트 우회)
# 커밋 핀 URL — raw cache miss:
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/7dce6f1/scripts/apply-be-release-gantt-v3.sh" | sh
#
# 또는 pod:
#   REF_SHA=7dce6f1 sh scripts/apply-be-release-gantt-v3.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
REF_SHA="${REF_SHA:-e49a70d}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"

echo "=== apply-be-release-gantt-v3 (git $REF_SHA) ==="

fetch() {
  curl -fsSL -H "Cache-Control: no-cache" -H "Pragma: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

mkdir -p scripts services routers
fetch backend/jira_client.py jira_client.py
fetch backend/tvjira_client.py tvjira_client.py
fetch backend/services/release_gantt_service.py services/release_gantt_service.py
fetch backend/services/release_sprint_calendar_2026.py services/release_sprint_calendar_2026.py
fetch backend/routers/model_status.py routers/model_status.py
fetch scripts/patch-config-release-gantt-fixversion.sh scripts/patch-config-release-gantt-fixversion.sh
chmod +x scripts/patch-config-release-gantt-fixversion.sh 2>/dev/null || true
sh scripts/patch-config-release-gantt-fixversion.sh
fetch scripts/diagnose-release-gantt-jira.sh scripts/diagnose-release-gantt-jira.sh
fetch scripts/verify-release-gantt-be.sh scripts/verify-release-gantt-be.sh
chmod +x scripts/diagnose-release-gantt-jira.sh scripts/verify-release-gantt-be.sh

PY="uv run --frozen python"
command -v uv >/dev/null 2>&1 || PY="python3"
$PY -c "from services import release_gantt_service; import main; print('  OK  import main')"

grep -q 'diagnose-counts' routers/model_status.py && echo "  OK  diagnose-counts route" || echo "  !!  router missing diagnose-counts"

if [ -x scripts/restart-be-route-port.sh ]; then
  sh scripts/restart-be-route-port.sh
else
  echo "  → sh scripts/restart-be-route-port.sh 수동 실행"
fi

echo ""
echo "=== next ==="
echo "  sh scripts/diagnose-release-gantt-jira.sh"
echo "  curl -sG http://127.0.0.1:8000/api/model-status/release/gantt/diagnose-counts --data-urlencode model=H7_VI --data-urlencode label=SoundSuite_H7\\(VI\\) | python3 -m json.tool"
