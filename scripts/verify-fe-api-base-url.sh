#!/bin/sh
# FE — 빌드/소스에 Worker Port BE URL이 박혀 있지 않은지
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1

echo "=== verify FE API base (no Worker Port in shared bundle) ==="
fail=0

grep -q "be-audio-test.apps.axstudio.lge.com" src/api/client.ts \
  && echo "  OK  client.ts BE_AXSTUDIO 공용 Route" || { echo "  NG  client.ts"; fail=1; }

if grep -q '\-\-8000\-\-' src/api/client.ts 2>/dev/null; then
  echo "  NG  client.ts contains Worker URL pattern"
  fail=1
fi

if [ -f public/workspace_env.js ]; then
  if grep -q '\-\-8000\-\-' public/workspace_env.js 2>/dev/null; then
    echo "  NG  public/workspace_env.js has Worker URL"
    fail=1
  else
    echo "  OK  workspace_env.js"
  fi
fi

if [ -d build ]; then
  if grep -rl '\-\-8000\-\-' build/*.js 2>/dev/null | head -1 | grep -q .; then
    echo "  NG  build/*.js contains Worker URL — npm run build after patch-fe-be-shared-url.sh"
    fail=1
  else
    echo "  OK  build/ no --8000-- in JS bundles"
  fi
fi

if [ -f .env ] && grep -q '\-\-8000\-\-' .env 2>/dev/null; then
  echo "  NG  .env still has Worker REACT_APP_API_BASE_URL"
  fail=1
fi

[ "$fail" -eq 0 ] && echo "=== OK ===" || exit 1
