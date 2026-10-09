#!/bin/sh
# 모델 검증 일정 seed → Milvus save API (전체 교체)
#
# BE pod (/workspace/project):
#   API_BASE=http://127.0.0.1:8000/api sh scripts/seed-model-schedule-to-db.sh
#
# seed JSON (56행, FC1 없음):
#   REF=cursor/model-schedule-bar-label-fix-b14b
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts/seed-model-schedule-data.json" \
#     -o scripts/seed-model-schedule-data.json

set -e
cd "$(dirname "$0")/.."

API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
SEED="${SEED_FILE:-scripts/seed-model-schedule-data.json}"

if [ ! -f "$SEED" ]; then
  echo "Error: $SEED not found"
  exit 1
fi

export SEED FORCE_BAD_SEED="${FORCE_BAD_SEED:-}"
PAYLOAD=$(python3 - <<'PY'
import json, os, sys
from pathlib import Path
seed = Path(os.environ["SEED"])
data = json.loads(seed.read_text(encoding="utf-8"))
rows = data.get("rows") if isinstance(data, dict) else data
if not isinstance(rows, list):
    sys.exit("seed JSON must contain rows[]")
n = len(rows)
fc = sum(1 for r in rows if str(r.get("event", "")).strip() in ("FC 1", "FC 2", "FC 3", "QP 1"))
h7 = sum(1 for r in rows if r.get("model") == "H7_VI")
suite = sum(
    1 for r in rows
    if "사운드스위트" in str(r.get("category", "")).replace(" ", "")
)
print(f"  rows: {n} (사운드스위트: {suite}, H7_VI: {h7}, FC-event rows: {fc})", file=sys.stderr)
if os.environ.get("FORCE_BAD_SEED") != "1" and h7 < 4:
    print("ERROR: seed에 H7_VI(개발모델) 4구분 없음 — scripts/prepare_model_schedule_seed.py 실행", file=sys.stderr)
    sys.exit(1)
if os.environ.get("FORCE_BAD_SEED") != "1" and (n > 120 or fc > 0):
    print("ERROR: overview(FC1) seed — GitHub에서 eeb69b5+ seed JSON 다시 받으세요.", file=sys.stderr)
    sys.exit(1)
print(json.dumps({"rows": rows}, ensure_ascii=False))
PY
)

echo "=== Seed model schedule → ${API_BASE}/model-schedule/save ==="
echo "$PAYLOAD" | python3 -c "import json,sys; print('  posting', len(json.load(sys.stdin)['rows']), 'rows')" 2>/dev/null || true

echo "$PAYLOAD" | curl -sf -X POST "${API_BASE}/model-schedule/save" \
  -H "Content-Type: application/json" \
  -d @- | python3 -m json.tool

echo ""
echo "=== Verify load (2s) ==="
sleep 2
curl -sf "${API_BASE}/model-schedule/load" | python3 -c "
import json, sys
d = json.load(sys.stdin)
rows = d.get('rows') or []
fc = sum(1 for r in rows if str(r.get('event','')).strip() in ('FC 1','FC 2','FC 3'))
print('count:', len(rows))
print('FC-event rows:', fc)
if fc:
    print('ERROR: Mongo still has FC events — flush patch + uvicorn 재시작 확인')
    sys.exit(1)
if not rows:
    print('ERROR: load=0 — mongo_helper flush + uvicorn 8000')
    sys.exit(1)
print('OK')
"

echo "=== Done ==="
