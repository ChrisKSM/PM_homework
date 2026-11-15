#!/bin/sh
# GitHub seed JSON → BE overview/save (Mongo). FE mock만 바꿔도 화면은 mongo 우선이라 이 단계 필요.
#
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api \
#   REF=cursor/model-schedule-bar-label-fix-b14b \
#   sh scripts/push-overview-seed-from-github.sh
#
set -e
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
API_BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
SEED="/tmp/seed-model-schedule-overview-$$.json"

echo "=== Push overview seed → $API_BASE/model-schedule/overview/save ==="
echo "  ref: $REF"

curl -fsSL -H "Cache-Control: no-cache" "$BASE/scripts/seed-model-schedule-overview.json" -o "$SEED"
COUNT=$(python3 -c "import json; print(len(json.load(open('$SEED'))['models']))")
echo "  models in seed: $COUNT"

curl -sf -X POST "$API_BASE/model-schedule/overview/save" \
  -H "Content-Type: application/json" \
  -d @"$SEED" | python3 -m json.tool

echo ""
echo "=== Verify overview/load (H7_VI / H5 SW) ==="
curl -sf "$API_BASE/model-schedule/overview/load" | python3 -c "
import json, sys
d = json.load(sys.stdin, strict=False)
for model in ('H7_VI', 'H5'):
    m = next((x for x in d.get('models', []) if x.get('model') == model), None)
    if not m:
        print(model, 'NOT IN DB')
        continue
    print('---', model)
    for e in m.get('events') or []:
        if e.get('kind') != 'sw':
            continue
        n = (e.get('name') or '').upper().replace(' ', '')
        if 'SIT' in n or n.startswith('FC1') or (e.get('name') or '').strip() == 'FC 1':
            print(' ', e.get('name'), e.get('start'), e.get('end'))
"

rm -f "$SEED"
echo ""
echo "브라우저에 예전 overview가 남으면 DevTools → Application → localStorage →"
echo "  'model-schedule-overview-data' 삭제 후 강력 새로고침"
