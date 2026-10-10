#!/bin/sh
# BE pod — 모델현황 Initiative Jira API (TVPLAT · H7 VI)
#
# curl (GitLab에 브랜치 없을 때):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/be-model-status-initiative-patch.sh" | sh
#
# git (pod에 remote 있을 때):
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   sh scripts/be-model-status-initiative-patch.sh github/cursor/model-schedule-bar-label-fix-b14b
#
# BE 표준 port: 8000 (8200 아님)
# 이후: uvicorn 8000 재시작 → sh scripts/verify-model-status-initiative-be.sh
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"
REF="${1:-}"
BASE="${PATCH_BASE:-https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b}"

mkdir -p routers services scripts

if [ -n "$REF" ] && git rev-parse "$REF" >/dev/null 2>&1; then
  echo "=== BE Initiative patch from git $REF ==="
  show() { git show "$REF:$1"; }
  show backend/services/model_status_initiative_service.py > services/model_status_initiative_service.py
  show backend/services/release_gantt_service.py > services/release_gantt_service.py
  show backend/services/release_sprint_calendar_2026.py > services/release_sprint_calendar_2026.py
  show backend/routers/model_status.py > routers/model_status.py
  show backend/tvjira_client.py > tvjira_client.py
  show backend/jira_client.py > jira_client.py
  show backend/config.py > config.py
  for f in \
    scripts/patch-be-main-model-status.sh \
    scripts/patch-config-initiative-fields.sh \
    scripts/verify-model-status-initiative-be.sh \
    scripts/be-jira-token-setup.sh \
    scripts/be-model-status-initiative-patch.sh
  do
    show "$f" > "$f"
    chmod +x "$f"
  done
else
  echo "=== BE Initiative patch from raw $BASE ==="
  fetch() {
    if ! curl -fsSL "$BASE/$1" -o "$2"; then
      echo "ERROR: fetch failed — $BASE/$1" >&2
      exit 1
    fi
    echo "  + $2"
  }
  fetch backend/services/model_status_initiative_service.py services/model_status_initiative_service.py
  fetch backend/services/release_gantt_service.py services/release_gantt_service.py
  fetch backend/services/release_sprint_calendar_2026.py services/release_sprint_calendar_2026.py
  fetch backend/routers/model_status.py routers/model_status.py
  fetch backend/tvjira_client.py tvjira_client.py
  fetch backend/jira_client.py jira_client.py
  fetch backend/config.py config.py
  fetch scripts/patch-be-main-model-status.sh scripts/patch-be-main-model-status.sh
  fetch scripts/patch-config-initiative-fields.sh scripts/patch-config-initiative-fields.sh
  fetch scripts/verify-model-status-initiative-be.sh scripts/verify-model-status-initiative-be.sh
  fetch scripts/be-model-status-initiative-patch.sh scripts/be-model-status-initiative-patch.sh
  fetch scripts/be-jira-token-setup.sh scripts/be-jira-token-setup.sh
  chmod +x scripts/patch-be-main-model-status.sh \
    scripts/patch-config-initiative-fields.sh \
    scripts/verify-model-status-initiative-be.sh \
    scripts/be-jira-token-setup.sh \
    scripts/be-model-status-initiative-patch.sh
fi

test -f tvjira_client.py || { echo "ERROR: tvjira_client.py missing"; exit 1; }

sh scripts/patch-config-initiative-fields.sh
sh scripts/patch-be-main-model-status.sh

test -f services/model_status_initiative_service.py
test -f services/release_gantt_service.py
test -f services/release_sprint_calendar_2026.py
test -f routers/model_status.py
grep -q 'model-status' routers/model_status.py
grep -q 'release/gantt' routers/model_status.py

if [ ! -f scripts/be-jira-token-setup.sh ]; then
  curl -fsSL "$BASE/scripts/be-jira-token-setup.sh" -o scripts/be-jira-token-setup.sh
  chmod +x scripts/be-jira-token-setup.sh
fi

echo ""
echo "=== tvjira_client.py (project root — uvicorn import 필수) ==="
test -f tvjira_client.py && wc -c tvjira_client.py | awk '{print "  OK  tvjira_client.py "$1" bytes"}'

echo ""
echo "=== Jira PAT (Initiative → TVJIRA_API_TOKEN) ==="
if sh scripts/be-jira-token-setup.sh; then
  echo "  token OK"
else
  echo "  WARN: TVJIRA_API_TOKEN 설정 후 restart-be-route-port.sh 실행"
fi

echo ""
echo "=== BE 파일 OK — uvicorn port 8000 재시작 후 ==="
echo "  sh scripts/restart-be-route-port.sh"
echo "  sh scripts/verify-model-status-initiative-be.sh"
echo "=== Done ==="
