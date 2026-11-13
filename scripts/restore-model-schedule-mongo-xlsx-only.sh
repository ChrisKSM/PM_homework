#!/bin/sh
# 검증 일정 Mongo — Excel 상세 시트 기준으로만 복구 (FC1/QP1 overview 이벤트 제거)
#
# BE pod (package.json 없음 — npm/build 하지 말 것):
#   cd /workspace/project
#   REF=cursor/model-schedule-bar-label-fix-b14b
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts/seed-model-schedule-data.json" \
#     -o scripts/seed-model-schedule-data.json
#   API_BASE=http://127.0.0.1:8000/api sh scripts/seed-model-schedule-to-db.sh
#
# FE pod (Excel 있을 때):
#   sh scripts/restore-model-schedule-mongo-xlsx-only.sh scripts/data/SW검증현황261008.xlsx
#
# seed JSON 만 Mongo 반영:
#   sh scripts/restore-model-schedule-mongo-xlsx-only.sh --seed-only
#
set -e
cd "$(dirname "$0")/.."

MODE="${1:-}"
XLSX=""

if [ "$MODE" = "--seed-only" ] || [ "$MODE" = "seed-only" ]; then
  echo "=== seed JSON → Mongo (--seed-only, Excel 스킵) ==="
elif [ -n "$MODE" ] && [ -f "$MODE" ]; then
  XLSX="$MODE"
elif [ -f "scripts/data/verification-schedule-detail.xlsx" ]; then
  XLSX="scripts/data/verification-schedule-detail.xlsx"
elif [ -f "scripts/data/SW검증현황261008.xlsx" ]; then
  XLSX="scripts/data/SW검증현황261008.xlsx"
fi

if [ -n "$XLSX" ]; then
  echo "=== 1) Excel → seed JSON: $XLSX ==="
  sh scripts/sync-verification-schedule-from-xlsx.sh "$XLSX"
else
  echo "=== 1) Excel 없음 — 기존 scripts/seed-model-schedule-data.json 사용 ==="
  if [ ! -f scripts/seed-model-schedule-data.json ]; then
    echo "Error: seed JSON 없음. BE pod 에서 GitHub 에서 받으세요:" >&2
    echo '  curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/seed-model-schedule-data.json" -o scripts/seed-model-schedule-data.json' >&2
    exit 1
  fi
  python3 -c "
import json
from pathlib import Path
rows = json.loads(Path('scripts/seed-model-schedule-data.json').read_text())['rows']
fc = sum(1 for r in rows if str(r.get('event','')).strip() in ('FC 1','FC 2','FC 3'))
print(f'  seed rows: {len(rows)}, FC-event rows: {fc}')
if len(rows) > 120 or fc > 0:
    raise SystemExit('  ERROR: seed 가 overview(FC1) 데이터입니다. GitHub eeb69b5 이후 seed 를 다시 curl 하세요.')
"
fi

echo ""
echo "=== 2) Mongo save (전체 교체) ==="
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}" sh scripts/seed-model-schedule-to-db.sh

echo ""
echo "=== 3) FE pod — npm run build + 브라우zer localStorage(model-schedule-data) 삭제 ==="
echo "=== 복구 완료 ==="
