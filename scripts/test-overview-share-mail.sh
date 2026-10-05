#!/bin/sh
# BE pod — 전 모델 overview Snapshot 메일 테스트 (seokmin.koh@lge.com)
set -e
cd "$(dirname "$0")/.."

API_BASE="${API_BASE:-http://127.0.0.1:8200/api}"
SEED="${SEED_FILE:-scripts/seed-model-schedule-overview.json}"

if [ ! -f "$SEED" ]; then
  echo "Error: $SEED not found"
  exit 1
fi

echo "=== POST $API_BASE/model-schedule/overview/share ==="

python3 <<PY
import json
seed = json.load(open("$SEED"))
models = seed["models"][:4]
rows = []
for m in models:
    for e in m.get("events") or []:
        if e.get("kind") == "sw" or str(e.get("name","")).lower().startswith("fc"):
            rows.append({
                "modelId": m["id"],
                "category": m.get("category",""),
                "model": m.get("model",""),
                "variant": m.get("variant",""),
                "swPm": m.get("swPm",""),
                "timelineKind": "sw",
                "lineIndex": 0,
                "bars": [{
                    "start": e["start"], "end": e.get("end", e["start"]),
                    "label": e["name"], "barType": "fc", "kind": "sw"
                }]
            })
            break
payload = {
    "period_label": "26/10월",
    "dates": ["2026-10-01","2026-10-02","2026-10-03","2026-10-04","2026-10-05"],
    "models": models,
    "display_rows": rows or [{
        "modelId": models[0]["id"],
        "category": models[0].get("category",""),
        "model": models[0].get("model",""),
        "variant": models[0].get("variant",""),
        "swPm": models[0].get("swPm",""),
        "timelineKind": "sw", "lineIndex": 0,
        "bars": []
    }],
    "audiences": ["개발"],
    "recipients": ["seokmin.koh@lge.com"]
}
open("/tmp/overview-share-payload.json","w").write(json.dumps(payload, ensure_ascii=False))
print("models:", len(models), "display_rows:", len(payload["display_rows"]))
PY

curl -sf -X POST "$API_BASE/model-schedule/overview/share" \
  -H "Content-Type: application/json" \
  -d @/tmp/overview-share-payload.json | python3 -m json.tool

echo "=== Done ==="
