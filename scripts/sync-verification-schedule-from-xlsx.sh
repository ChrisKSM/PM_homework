#!/bin/sh
# 모델 검증 일정 — Excel → JSON → FE mock (openpyxl)
#
#   pip install openpyxl
#   sh scripts/sync-verification-schedule-from-xlsx.sh
#   sh scripts/sync-verification-schedule-from-xlsx.sh /workspace/project/SW검증현황261008.xlsx
set -e
cd "$(dirname "$0")/.."

DEFAULT_XLSX="scripts/data/verification-schedule-detail.xlsx"
XLSX="${1:-$DEFAULT_XLSX}"
USER_PROVIDED=
if [ -n "$1" ]; then
  USER_PROVIDED=1
  # /workspace/project/파일.xlsx 만 넘긴 경우 → scripts/data/ 자동 탐색
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
    echo "" >&2
    echo "  1) AX Studio 파일 업로드로 pod /workspace/project/ 에 넣었는지 확인" >&2
    echo "  2) pod에서 확인:" >&2
    echo "       ls -la /workspace/project/*.xlsx" >&2
    echo "       ls -la /workspace/project/scripts/data/" >&2
    echo "  3) 업로드 후 다시:" >&2
    echo "       sh scripts/sync-verification-schedule-from-xlsx.sh \"\$PWD/파일명.xlsx\"" >&2
    exit 1
  fi
  echo "=== $DEFAULT_XLSX 없음 — seed JSON에서 템플릿 xlsx 생성 ==="
  python3 scripts/export-verification-schedule-to-xlsx.py
  XLSX="$DEFAULT_XLSX"
fi

echo "=== Import: $XLSX ==="
python3 scripts/import-verification-schedule-from-xlsx.py "$XLSX" \
  -o scripts/seed-model-schedule-data.json \
  --ts src/data/modelScheduleVerificationMock.ts

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
PY

echo "=== Done ==="
echo "  JSON: scripts/seed-model-schedule-data.json"
echo "  Mock: src/data/modelScheduleVerificationMock.ts"
echo "  Public: public/model-schedule-verification-mock.json (build 후 배포)"
echo "  UI:   https://react-audio.../model-schedule/verification?mock=1"
echo "  ⚠ URL 오타 금지: .../verification?mock=1 (verificationmodel-schedule X)"
