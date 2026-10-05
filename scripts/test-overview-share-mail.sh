#!/bin/sh
# BE pod — 전 모델 overview Snapshot 메일 테스트 (SW 담당 → 개발 수신자)
set -e
cd "$(dirname "$0")/.."

API_BASE="${API_BASE:-http://127.0.0.1:8200/api}"
SEED="${SEED_FILE:-scripts/seed-model-schedule-overview.json}"

if [ ! -f "$SEED" ]; then
  echo "Error: $SEED not found"
  exit 1
fi

echo "=== POST $API_BASE/model-schedule/share (snapshot_type=overview) ==="

python3 <<PY
import json
import re
import sys

SW_PM = {
    "고석민": "seokmin.koh@lge.com",
    "김현자": "hyunja.kim@lge.com",
    "조성연": "sungyeon.cho@lge.com",
    "이홍순": "hongsoon.lee@lge.com",
    "박윤규": "yoonkyu.park@lge.com",
    "오제준": "jejun.oh@lge.com",
    "박시형": "sh12.park@lge.com",
    "나택수": "taeksu.la@lge.com",
    "조용승": "yongseung.cho@lge.com",
    "이마을": "maeul.lee@lge.com",
    "윤필규": "pilkyu.yoon@lge.com",
    "이재철": "jaecheol.lee@lge.com",
}

def dev_emails(models):
    seen = set()
    out = []
    for m in models:
        raw = str(m.get("swPm") or "")
        for part in re.split(r"[/,·|\\s]+", raw):
            name = part.strip()
            email = SW_PM.get(name)
            if email and email not in seen:
                seen.add(email)
                out.append(email)
    return out

seed = json.load(open("$SEED"))
models = seed["models"][:4]
recipients = dev_emails(models)
if not recipients:
    print("Error: SW 담당에서 수신자를 찾을 수 없음", file=sys.stderr)
    sys.exit(1)

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
    "snapshot_type": "overview",
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
    "recipients": recipients,
}
open("/tmp/overview-share-payload.json","w").write(json.dumps(payload, ensure_ascii=False))
print("models:", len(models), "display_rows:", len(payload["display_rows"]))
print("recipients:", ", ".join(recipients))
PY

curl -sf -X POST "$API_BASE/model-schedule/share" \
  -H "Content-Type: application/json" \
  -d @/tmp/overview-share-payload.json | python3 -m json.tool

echo "=== Done ==="
