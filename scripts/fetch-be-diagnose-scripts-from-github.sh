#!/bin/sh
# GitLab pod에 없는 BE 진단/배포 스크립트만 GitHub에서 받기
#   curl -fsSL ".../fetch-be-diagnose-scripts-from-github.sh" | sh
set -e
cd /workspace/project 2>/dev/null || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts"
mkdir -p scripts
for f in \
  diagnose-public-be-overview-404.sh \
  publish-be-overview-worker-to-gitlab.sh \
  fetch-be-diagnose-scripts-from-github.sh
do
  curl -fsSL "$BASE/$f" -o "scripts/$f"
  chmod +x "scripts/$f"
  echo "  + scripts/$f"
done
echo "OK  run: sh scripts/diagnose-public-be-overview-404.sh"
