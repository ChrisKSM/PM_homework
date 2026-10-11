#!/bin/sh
#   sh scripts/verify-story-sp-kpi-be.sh
set -e
BASE="${BE_LOCAL:-http://127.0.0.1:8000}"
URL="${BASE}/api/model-status/initiatives/story-sp-kpi"

CODE=$(curl -sS -o /tmp/sp_kpi.json -w '%{http_code}' -G "$URL" \
  --data-urlencode "model=H7_VI" \
  --data-urlencode "label=SoundSuite_H7(VI)")
echo "HTTP $CODE"
python3 <<'PY'
import json
d = json.load(open("/tmp/sp_kpi.json"))
if "plannedSpTotal" in d and d["plannedSpTotal"] is not None:
    print("plannedSpTotal", d["plannedSpTotal"])
    print("storySpDone", d.get("storySpDone"), "storySpTotal", d.get("storySpTotal"))
    print("completionPct", d.get("completionPct"))
    inits = [x for x in d.get("byInitiative") or [] if x.get("milestones")]
    print("initiativesWithMilestoneTable", len(inits))
    exit(0)
detail = d.get("detail")
if isinstance(detail, dict):
    print("ERROR", detail.get("message") or detail)
    print("hint:", detail.get("hint"))
elif detail:
    print("ERROR", detail)
else:
    print("unexpected body keys:", list(d.keys()))
    print(json.dumps(d, ensure_ascii=False)[:500])
exit(1)
PY
