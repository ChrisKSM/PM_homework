#!/bin/sh
# 검증 일정 Mongo — Excel 상세 시트 기준으로만 복구 (FC1/QP1 overview 이벤트 제거)
#
# BE pod:
#   cd /workspace/project
#   sh scripts/restore-model-schedule-mongo-xlsx-only.sh
#   # 또는 xlsx 경로:
#   sh scripts/restore-model-schedule-mongo-xlsx-only.sh scripts/data/SW검증현황261008.xlsx
#
set -e
cd "$(dirname "$0")/.."

XLSX="${1:-scripts/data/verification-schedule-detail.xlsx}"
echo "=== 1) Excel → seed JSON (Sound Suite auto-merge 없음) ==="
sh scripts/sync-verification-schedule-from-xlsx.sh "$XLSX"

echo ""
echo "=== 2) Mongo save (전체 교체) ==="
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}" sh scripts/seed-model-schedule-to-db.sh

echo ""
echo "=== 3) FE — 브라우저 localStorage 삭제 후 새로고침 ==="
echo "  DevTools → Application → Local Storage → model-schedule-data 삭제"
echo "=== 복구 완료 ==="
