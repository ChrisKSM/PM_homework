#!/bin/sh
# BE pod — PRD ALM fetch smoke (적용모델 Sound Suite H7 / Sound suite_H7)
set -e
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
MODEL="${MODEL:-H7_VI}"

PING_URL="${API_BASE%/}/model-status/initiatives/ping"
LIST_URL="${API_BASE%/}/model-status/prd?model=${MODEL}"
URL="${API_BASE%/}/model-status/prd?model=${MODEL}&probe=true&discover=true"
PING_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PING_URL" 2>/dev/null || echo "000")
echo "GET $PING_URL → HTTP $PING_CODE"
if [ "$PING_CODE" = "404" ]; then
  echo "NG  model-status router 미등록 — sh scripts/patch-be-main-model-status.sh 후 restart"
  exit 1
fi
echo "GET $LIST_URL  (UI — probe 없음)"
LIST_HEAD=$(curl -s -o /dev/null -w "%{http_code}" "$LIST_URL" 2>/dev/null || echo "000")
echo "  HTTP $LIST_HEAD"
echo "GET $URL"
PRD_HEAD=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
if [ "$PRD_HEAD" = "404" ]; then
  echo "NG  /prd 404 — PRD 패치가 routers/model_status.py 가 아닌 backend/routers/ 에 들어갔을 수 있음"
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  curl -fsS "$URL"
  exit 0
fi

curl -fsS "$URL" | python3 -c '
import json, sys
d = json.load(sys.stdin)
meta = d.get("meta") or {}
items = d.get("items") or []
probe = d.get("probe") or []
hits = [p for p in probe if (p.get("count") or 0) > 0 and not p.get("error")]
print("model:", meta.get("model"))
print("source:", meta.get("source"))
print("projectKey:", meta.get("projectKey"))
print("listPath:", meta.get("listPath"))
print("polarionComponent:", meta.get("polarionComponent"))
print("winningQuery:", meta.get("winningQuery"))
print("items:", len(items))
print("probe hits:", len(hits), "/", len(probe))
disc = d.get("discovery") or {}
if disc:
    print("discovery hits:", disc.get("hits"))
    best = disc.get("bestProbe") or {}
    if best:
        print("discovery best:", best.get("count"), best.get("query"))
if items:
    print("sample:", items[0].get("id"), "| applyModel=", items[0].get("applyModel"))
if meta.get("polarionUrl"):
    print("polarionUrl:", meta.get("polarionUrl"))
'

echo ""
echo "--- UI list (no probe) ---"
curl -fsS "$LIST_URL" | python3 -c '
import json, sys
d = json.load(sys.stdin)
m = d.get("meta") or {}
print("items:", len(d.get("items") or []))
print("source:", m.get("source"))
print("winningQuery:", m.get("winningQuery"))
print("filterMode:", m.get("filterMode"))
if m.get("polarionUrl"):
    print("polarionUrl:", m.get("polarionUrl"))
'
