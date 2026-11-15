#!/bin/sh
# FE pod — git/CI 없이 pod build/ 미리보기 (공용 URL ≠ pod build 일 때)
#   sh scripts/preview-fe-build-in-pod.sh
# AxStudio: 포트 8888 포워드 또는 "Open Port" → http://127.0.0.1:8888/model-schedule/status
set -e
cd "${ROOT:-/workspace/project}"
PORT="${PORT:-8888}"
if ! ls build/main.*.js >/dev/null 2>&1; then
  echo "NG  npm run build 먼저"
  exit 1
fi
echo "=== FE build preview ==="
echo "  build-version: $(cat build/build-version.txt 2>/dev/null || echo '?')"
echo "  main: $(ls build/main.*.js | sed 's|.*/||' | head -1)"
echo "  serving: build/ on 0.0.0.0:$PORT"
echo "  SPA: /model-schedule/status (404 on hard refresh — 루트 / 먼저 열고 이동)"
echo ""
exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory build
