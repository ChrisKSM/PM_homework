#!/bin/sh
# be-audio-test pod — config.py 에 effective_cors_origins() 추가/갱신
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="${1:-github/cursor/model-schedule-bar-label-fix-b14b}"

[ -f config.py ] || { echo "Error: config.py not found"; exit 1; }

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github cursor/model-schedule-bar-label-fix-b14b 먼저"
  exit 1
fi

echo "=== Patch config.py CORS from $REF ==="
git show "$REF:backend/config.py" > config.py
echo "  + config.py (from backend/config.py)"

grep -q 'effective_cors_origins' config.py && echo "  OK  effective_cors_origins present"
grep -q 'react-audio.apps.axstudio.lge.com' config.py && echo "  OK  axstudio in default cors_origins"

echo "=== Done ==="
