#!/bin/sh
# 조달 납기 KPI(due date 제거) FE만 적용 — 3 files
# client.ts / .env / Sidebar / App.tsx 건드리지 않음
#
# react-audio pod (/workspace/project):
#   git fetch github webpack-migration
#   sh scripts/apply-procurement-delivery-fe-only.sh github/webpack-migration
#   npm run build

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저"
  exit 1
fi

show() { git show "$REF:$1"; }

FILES="
  src/types/procurement.ts
  src/mocks/mockProcurementData.ts
  src/pages/ProcurementDashboardPage.tsx
  src/components/procurement/ProcurementTables.tsx
"
echo "=== Procurement delivery FE only from $REF ==="
for f in $FILES; do
  show "$f" > "$f"
  echo "  + $f"
done
echo ""
echo "Done. npm run build 후 확인."
