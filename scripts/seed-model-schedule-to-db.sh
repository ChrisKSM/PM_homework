#!/bin/sh
# 모델현황 스프레드시트 seed → Milvus save API
#
# 사용 (BE pod 또는 curl 가능한 곳):
#   cd /workspace/project
#   sh scripts/seed-model-schedule-to-db.sh
#
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/seed-model-schedule-to-db.sh

set -e
cd "$(dirname "$0")/.."

API_BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}"
SEED="${SEED_FILE:-scripts/seed-model-schedule-data.json}"

if [ ! -f "$SEED" ]; then
  echo "Error: $SEED not found"
  exit 1
fi

ROWS=$(python3 -c "import json; print(len(json.load(open('$SEED'))['rows']))")
echo "=== Seed model schedule → $API_BASE/model-schedule/save ==="
echo "  rows: $ROWS"

curl -sf -X POST "$API_BASE/model-schedule/save" \
  -H "Content-Type: application/json" \
  -d @"$SEED" | python3 -m json.tool

echo ""
echo "=== Verify load ==="
curl -sf "$API_BASE/model-schedule/load" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('count:', d.get('count', len(d.get('rows', []))))
models = sorted({r.get('model','') for r in d.get('rows', [])})
print('models:', ', '.join(models[:8]), '...' if len(models)>8 else '')
"

echo "=== Done ==="
