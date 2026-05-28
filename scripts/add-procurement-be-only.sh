#!/bin/sh
# 회사 BE — config/jira_client/.env 건드리지 않고 procurement만 추가
#
# /workspace/project (be-audio-test pod):
#   git fetch github webpack-migration
#   sh scripts/add-procurement-be-only.sh github/webpack-migration
#   sh scripts/patch-be-main-procurement.sh

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Add procurement ONLY (config/.env 유지) ==="

mkdir -p routers services scripts

for f in \
  backend/routers/procurement.py:routers/procurement.py \
  backend/services/procurement_service.py:services/procurement_service.py \
  scripts/patch-be-main-procurement.sh:scripts/patch-be-main-procurement.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  echo "  + $dst"
done

sh scripts/patch-be-main-procurement.sh

echo ""
echo "=== import 사전 검사 ==="
python3 - <<'PY' 2>/dev/null || python - <<'PY'
try:
    from services.quality_service import _board_jql_clause
    print("  OK quality_service._board_jql_clause")
except ImportError as e:
    print("  FAIL:", e)
    print("  → quality BE 먼저 배포: sh scripts/add-quality-be-only.sh github/webpack-migration")
    raise SystemExit(1)
from routers import procurement
print("  OK routers.procurement prefix:", procurement.router.prefix)
PY

echo ""
echo "=== 전제 조건 ==="
echo "  quality_service.py (_board_jql_clause) 이미 있어야 함"
echo "  jira_client.get_board_filter_jql() — quality와 동일"
echo ""
echo "=== 확인 (파일 배포 후 uvicorn/pod 재시작 필수) ==="
echo "  sh scripts/verify-procurement-be.sh http://127.0.0.1:8000"
echo "=== Done ==="
