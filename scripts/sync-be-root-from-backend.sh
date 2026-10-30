#!/bin/sh
# Worker pod — flat /workspace/project 를 repo backend/ 와 맞춤 (uvicorn cwd=project 루트)
#
#   cd /workspace/project && sh scripts/sync-be-root-from-backend.sh
#   sh scripts/sync-be-root-from-backend.sh --check   # diff 만
#
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"

if [ ! -f backend/main.py ] || [ ! -f main.py ]; then
  echo "NG: backend/main.py 와 루트 main.py 필요 (cwd=$ROOT)"
  exit 1
fi

if [ "${1:-}" = "--check" ]; then
  echo "=== diff (backend → root) ==="
  diff -qr backend/routers routers 2>/dev/null | head -20 || true
  diff -qr backend/services services 2>/dev/null | head -20 || true
  for f in main.py config.py jira_client.py tvjira_client.py dej_variables.py polarion_client.py cache.py; do
    if [ -f "backend/$f" ] && [ -f "$f" ]; then
      if ! diff -q "backend/$f" "$f" >/dev/null 2>&1; then
        echo "  differ: $f"
      fi
    fi
  done
  exit 0
fi

echo "=== sync backend/ → project root (flat) ==="
for f in main.py config.py jira_client.py tvjira_client.py dej_variables.py polarion_client.py cache.py; do
  if [ -f "backend/$f" ]; then
    cp "backend/$f" "$f"
    echo "  + $f"
  fi
done
if [ -d backend/routers ]; then
  mkdir -p routers
  cp backend/routers/*.py routers/ 2>/dev/null || true
  echo "  + routers/*.py"
fi
if [ -d backend/services ]; then
  mkdir -p services
  cp backend/services/*.py services/ 2>/dev/null || true
  echo "  + services/*.py"
fi

echo ""
echo "OK  루트 = backend 복사 완료 — sh scripts/be-restart-uvicorn-standalone.sh"
echo "    public(dpl) 반영은 Publish/Rollout (이 스크립트는 Worker pod 만)"
