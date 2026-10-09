#!/bin/sh
# 모델 검증 일정 seed → Milvus save API (전체 교체)
#
# BE pod (/workspace/project):
#   API_BASE=http://127.0.0.1:8000/api sh scripts/seed-model-schedule-to-db.sh
#
# seed JSON 이 구버전(56행, H7_VI 없음)이면 GitHub 에서 받기:
#   REF=cursor/model-schedule-bar-label-fix-b14b
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts/seed-model-schedule-data.json" \
#     -o scripts/seed-model-schedule-data.json
#   python3 scripts/append-sound-suite-verification-rows.py scripts/seed-model-schedule-data.json

set -e
cd "$(dirname "$0")/.."

API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
SEED="${SEED_FILE:-scripts/seed-model-schedule-data.json}"

if [ ! -f "$SEED" ]; then
  echo "Error: $SEED not found"
  exit 1
fi

PAYLOAD=$(python3 - <<PY
import json
from pathlib import Path
data = json.loads(Path("$SEED").read_text(encoding="utf-8"))
rows = data.get("rows") if isinstance(data, dict) else data
if not isinstance(rows, list):
    raise SystemExit("seed JSON must contain rows[]")
print(json.dumps({"rows": rows}, ensure_ascii=False))
PY
)

ROWS=$(python3 -c "import json,sys; print(len(json.load(sys.stdin)['rows']))" <<< "$PAYLOAD")
H7=$(python3 -c "import json,sys; r=json.load(sys.stdin)['rows']; print(sum(1 for x in r if x.get('model')=='H7_VI'))" <<< "$PAYLOAD")

echo "=== Seed model schedule → ${API_BASE}/model-schedule/save ==="
echo "  rows: $ROWS (H7_VI: $H7)"
if [ "$ROWS" -lt 100 ] 2>/dev/null; then
  echo "  ⚠️  행 수가 적습니다 — Sound Suite merge 전 seed 일 수 있습니다."
  echo "     python3 scripts/append-sound-suite-verification-rows.py $SEED"
fi

echo "$PAYLOAD" | curl -sf -X POST "${API_BASE}/model-schedule/save" \
  -H "Content-Type: application/json" \
  -d @- | python3 -m json.tool

echo ""
echo "=== Verify load (flush 반영까지 2초 대기) ==="
sleep 2
LOAD=$(curl -sf "${API_BASE}/model-schedule/load" || echo '{"rows":[],"count":0}')
echo "$LOAD" | python3 -c "
import json, sys
d = json.load(sys.stdin)
rows = d.get('rows') or []
print('count:', d.get('count', len(rows)))
print('H7_VI:', sum(1 for r in rows if r.get('model')=='H7_VI'))
models = sorted({r.get('model','') for r in rows})
print('models:', ', '.join(models[:12]), '...' if len(models)>12 else '')
if not rows:
    print('')
    print('ERROR: load count 0 — services/mongo_helper.py flush 패치 + uvicorn 재시작 후 재시도')
    sys.exit(1)
"

echo "=== Done ==="
