#!/bin/sh
# BE pod — 전체 seed 데이터로 share 메일 테스트 (seokmin.koh@lge.com)
set -e
cd "$(dirname "$0")/.."
PORT="${BE_PORT:-8000}"
BASE="http://127.0.0.1:${PORT}"
SEED="${1:-scripts/seed-model-schedule-data.json}"

if [ ! -f "$SEED" ]; then
  echo "Error: $SEED not found"
  exit 1
fi

python3 <<PY
import json
from pathlib import Path
data = json.loads(Path("$SEED").read_text(encoding="utf-8"))
rows = data.get("rows") or data
dates = sorted({d for r in rows for b in (r.get("bars") or []) for d in (b.get("start","")[:10], b.get("end","")[:10]) if d})
if not dates:
    dates = ["2026-09-15", "2026-09-16"]
payload = {
    "period_label": "9/15 ~ 10/26",
    "dates": dates,
    "rows": rows,
    "audiences": ["DQA"],
    "recipients": ["seokmin.koh@lge.com"],
}
Path("/tmp/share_payload.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
print(f"rows={len(rows)} dates={len(dates)}")
PY

curl -s -w "\n--- HTTP %{http_code} ---\n" -X POST "${BASE}/api/model-schedule/share" \
  -H "Content-Type: application/json" \
  -d @/tmp/share_payload.json | python3 -m json.tool 2>/dev/null || cat /tmp/share_test.out
