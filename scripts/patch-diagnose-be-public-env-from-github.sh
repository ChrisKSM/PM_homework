#!/bin/sh
# diagnose-be-public-env.sh 최신화 (curl|python heredoc 버그 수정본)
#
# Pod / 로컬 어디서든:
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-diagnose-be-public-env-from-github.sh" | sh
#
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-be-public-env.sh
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT" 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

mkdir -p scripts
fetch() {
  if ! curl -fsSL "$BASE/$1" -o "$2"; then
    echo "ERROR: fetch failed — $BASE/$1" >&2
    exit 1
  fi
  echo "  + $2"
}

echo "=== patch public env diagnose @ $REF ==="
fetch scripts/diagnose-be-public-env.sh scripts/diagnose-be-public-env.sh
fetch scripts/diagnose-be-env-loading.sh scripts/diagnose-be-env-loading.sh
chmod +x scripts/diagnose-be-public-env.sh scripts/diagnose-be-env-loading.sh 2>/dev/null || true

echo ""
echo "=== run ==="
API_BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}" \
  sh scripts/diagnose-be-public-env.sh
