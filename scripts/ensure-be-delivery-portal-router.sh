#!/bin/sh
# main.py 에 delivery_portal router 블록이 없으면 append (pod 구버전 main)
set -e
cd /workspace/project 2>/dev/null || exit 1
[ -f main.py ] || { echo "NG main.py"; exit 1; }

if grep -q delivery_portal main.py 2>/dev/null; then
  echo "OK  main.py already has delivery_portal"
  exit 0
fi

cat >> main.py <<'PY'

try:
    from routers import delivery_portal
    app.include_router(delivery_portal.router)
except ImportError:
    pass
PY
echo "OK  appended delivery_portal block to main.py"
echo "    sh scripts/restart-be-route-port.sh"
