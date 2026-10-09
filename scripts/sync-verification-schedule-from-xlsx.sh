#!/bin/sh
# 모델 검증 일정 — Excel → JSON → FE mock (openpyxl)
#
#   pip install openpyxl
#   sh scripts/sync-verification-schedule-from-xlsx.sh
#   sh scripts/sync-verification-schedule-from-xlsx.sh path/to/your.xlsx
set -e
cd "$(dirname "$0")/.."

XLSX="${1:-scripts/data/verification-schedule-detail.xlsx}"

if ! python3 -c "import openpyxl" 2>/dev/null; then
  echo "Installing openpyxl..."
  pip install openpyxl
fi

if [ ! -f "$XLSX" ]; then
  echo "=== $XLSX 없음 — seed JSON에서 템플릿 xlsx 생성 ==="
  python3 scripts/export-verification-schedule-to-xlsx.py
fi

python3 scripts/import-verification-schedule-from-xlsx.py "$XLSX" \
  -o scripts/seed-model-schedule-data.json \
  --ts src/data/modelScheduleVerificationMock.ts

echo "=== Done ==="
echo "  JSON: scripts/seed-model-schedule-data.json"
echo "  Mock: src/data/modelScheduleVerificationMock.ts"
echo "  UI:   /model-schedule/verification?mock=1"
