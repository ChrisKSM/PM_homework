#!/bin/sh
# BE pod 시작 실패 진단 + quality 모듈 누락 시 github에서 복구
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="${1:-github/webpack-migration}"

echo "=== BE quality startup diagnose ==="

echo "[1] main.py import line:"
grep "from routers import" main.py || echo "  MISSING import line"

echo "[2] main.py quality router:"
grep "quality.router" main.py || echo "  MISSING include_router(quality.router)"

echo "[3] files:"
for f in routers/quality.py services/quality_service.py config.py; do
  [ -f "$f" ] && echo "  OK $f" || echo "  MISSING $f"
done

echo "[4] config response_plan_field:"
grep -n "response_plan_field" config.py 2>/dev/null || echo "  MISSING in config.py — sync config from github"

if ! python3 -c "from routers import quality" 2>/dev/null && ! python -c "from routers import quality" 2>/dev/null; then
  echo ""
  echo "[5] import FAILED — github에서 quality 파일 복구 시도..."
  if git rev-parse "$REF" >/dev/null 2>&1; then
    mkdir -p routers services
    git show "$REF:backend/routers/quality.py" > routers/quality.py
    git show "$REF:backend/services/quality_service.py" > services/quality_service.py
    git show "$REF:backend/config.py" > config.py
    echo "  restored quality.py, quality_service.py, config.py"
    sh scripts/patch-be-main-quality.sh
  else
    echo "  Run: git fetch github webpack-migration"
    exit 1
  fi
fi

python3 -c "
from routers import quality
from services import quality_service
print('OK import quality, prefix=', quality.router.prefix)
" 2>/dev/null || python -c "
from routers import quality
from services import quality_service
print('OK import quality, prefix=', quality.router.prefix)
"

echo "=== diagnose OK ==="
