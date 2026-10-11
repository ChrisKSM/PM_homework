#!/bin/sh
# 모델 검증 일정 — Excel → JSON → FE mock (openpyxl)
# ※ 검증 상세 시트만 사용 (전 모델 overview 의 FC1/QP1 은 이벤트 열에 넣지 않음)
#
#   pip install openpyxl
#   sh scripts/sync-verification-schedule-from-xlsx.sh
#   sh scripts/sync-verification-schedule-from-xlsx.sh /workspace/project/SW검증현황261008.xlsx
set -e
cd "$(dirname "$0")/.."

FALLBACK_XLSX="scripts/data/verification-schedule-detail.xlsx"
PREFERRED_XLSX="scripts/data/SW검증현황261008.xlsx"
if [ -f "$PREFERRED_XLSX" ]; then
  DEFAULT_XLSX="$PREFERRED_XLSX"
else
  DEFAULT_XLSX="$FALLBACK_XLSX"
fi
XLSX="${1:-$DEFAULT_XLSX}"
USER_PROVIDED=
if [ -n "$1" ]; then
  USER_PROVIDED=1
  if [ ! -f "$XLSX" ]; then
    base="$(basename "$XLSX")"
    if [ -f "scripts/data/$base" ]; then
      echo "  → scripts/data/$base 사용"
      XLSX="scripts/data/$base"
    fi
  fi
fi

if ! python3 -c "import openpyxl" 2>/dev/null; then
  echo "Installing openpyxl..."
  pip install openpyxl
fi

if [ ! -f "$XLSX" ]; then
  if [ -n "$USER_PROVIDED" ]; then
    echo "Error: 지정한 Excel 파일이 pod에 없습니다:" >&2
    echo "  $XLSX" >&2
    exit 1
  fi
  echo "=== $DEFAULT_XLSX 없음 — seed JSON에서 템플릿 xlsx 생성 ==="
  python3 scripts/export-verification-schedule-to-xlsx.py
  XLSX="$DEFAULT_XLSX"
fi

echo "=== Import (Excel strict — 런타임 Sound Suite 보충 없음): $XLSX ==="
python3 scripts/import-verification-schedule-from-xlsx.py "$XLSX" \
  -o scripts/seed-model-schedule-data.json \
  --ts src/data/modelScheduleVerificationMock.ts

echo ""
python3 scripts/validate-verification-seed-groups.py scripts/seed-model-schedule-data.json

mkdir -p public
python3 - <<'PY'
import json
from pathlib import Path
seed = json.loads(Path("scripts/seed-model-schedule-data.json").read_text(encoding="utf-8"))
out = {"rows": seed["rows"], "timelineStart": seed.get("timelineStart")}
Path("public/model-schedule-verification-mock.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("  + public/model-schedule-verification-mock.json")
print("  rows:", len(seed["rows"]))
PY

echo "=== Done ==="
echo "  Mongo seed: API_BASE=http://127.0.0.1:8000/api sh scripts/seed-model-schedule-to-db.sh"
