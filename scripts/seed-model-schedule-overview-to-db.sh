#!/bin/sh
# 전 모델 일정 seed → Milvus overview/save API
#
# BE pod 또는 curl 가능 환경:
#   API_BASE=http://127.0.0.1:8200/api sh scripts/seed-model-schedule-overview-to-db.sh

set -e
cd "$(dirname "$0")/.."

API_BASE="${API_BASE:-http://127.0.0.1:8200/api}"
SEED="${SEED_FILE:-scripts/seed-model-schedule-overview.json}"

if [ ! -f "$SEED" ]; then
  echo "Error: $SEED not found"
  exit 1
fi

COUNT=$(python3 -c "import json; print(len(json.load(open('$SEED'))['models']))")
echo "=== Seed overview → $API_BASE/model-schedule/overview/save ==="
echo "  models: $COUNT"

curl -sf -X POST "$API_BASE/model-schedule/overview/save" \
  -H "Content-Type: application/json" \
  -d @"$SEED" | python3 -m json.tool

echo ""
echo "=== Verify overview/load ==="
curl -sf "$API_BASE/model-schedule/overview/load" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('count:', d.get('count', len(d.get('models', []))))
models = [m.get('model','') for m in d.get('models', [])]
print('models:', ', '.join(models[:10]), '...' if len(models)>10 else '')
"

echo "=== Done ==="
