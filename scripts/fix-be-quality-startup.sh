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

echo "[5] jinja2 (report 모듈 의존성):"
if python3 -c "import jinja2" 2>/dev/null || python -c "import jinja2" 2>/dev/null; then
  echo "  OK jinja2 installed"
else
  echo "  MISSING jinja2 — installing..."
  pip install jinja2==3.1.4 -q || pip install -r requirements.txt -q
  echo "  installed"
fi

if ! python3 -c "import main" 2>/dev/null && ! python -c "import main" 2>/dev/null; then
  echo ""
  echo "[6] main import FAILED — github에서 quality 파일 복구 시도..."
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

python3 -c "import main; print('OK main.py load')" 2>/dev/null \
  || python -c "import main; print('OK main.py load')"

echo "=== diagnose OK ==="
