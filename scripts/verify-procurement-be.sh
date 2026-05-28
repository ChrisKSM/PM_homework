#!/bin/sh
# be-audio-test pod — procurement API 동작 확인
# 사용: sh scripts/verify-procurement-be.sh [BASE_URL]
# 예: sh scripts/verify-procurement-be.sh http://127.0.0.1:8000

set -e
BASE="${1:-http://127.0.0.1:8000}"

echo "=== Procurement BE verify @ $BASE ==="
echo ""

echo "--- 1) 파일 / main.py ---"
ERR=0
for f in routers/procurement.py services/procurement_service.py; do
  if [ -f "$f" ]; then
    echo "  OK $f"
  else
    echo "  MISSING $f  → sh scripts/add-procurement-be-only.sh github/webpack-migration"
    ERR=1
  fi
done

if [ -f main.py ]; then
  if grep -q "procurement.router" main.py 2>/dev/null; then
    echo "  OK main.py includes procurement.router"
  else
    echo "  MISSING procurement in main.py  → sh scripts/patch-be-main-procurement.sh"
    ERR=1
  fi
else
  echo "  WARN main.py not in cwd (pod root에서 실행?)"
fi

python3 - <<'PY' 2>/dev/null || python - <<'PY'
try:
    from services.quality_service import _board_jql_clause, _issue_browse_url
    print("  OK quality_service (_board_jql_clause import)")
except ImportError as e:
    print("  FAIL quality_service:", e)
    print("       → quality_service.py 최신 hub 버전 필요")
    raise SystemExit(1)
try:
    from routers import procurement
    print("  OK import routers.procurement prefix:", procurement.router.prefix)
except Exception as e:
    print("  FAIL import procurement:", e)
    raise SystemExit(1)
PY

if [ "$ERR" -ne 0 ]; then
  echo ""
  echo "=== 파일 누락 — HTTP 테스트 생략 ==="
  exit 1
fi

echo ""
echo "--- 2) HTTP ---"
for path in \
  "/api/procurement/ping" \
  "/api/procurement/filters" \
  "/api/procurement/dashboard?vendor=all"
do
  code=$(curl -s -o /tmp/pbody.json -w "%{http_code}" "$BASE$path" || echo "000")
  echo "  $path → HTTP $code"
  if [ "$code" = "404" ]; then
    echo "  → 404: main.py 패치 후 uvicorn/ pod 재시작 필요"
    cat /tmp/pbody.json 2>/dev/null | head -c 200
    echo ""
    exit 1
  fi
  if [ "$code" != "200" ]; then
    cat /tmp/pbody.json 2>/dev/null | head -c 400
    echo ""
    exit 1
  fi
done

echo "  filters vendors:" 
python3 - <<'PY' 2>/dev/null || python - <<'PY'
import json
d=json.load(open("/tmp/pbody.json"))
print("   ", [v["id"] for v in d.get("vendors", [])[:5]])
PY

echo ""
echo "=== OK ==="
