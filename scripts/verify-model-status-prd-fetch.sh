#!/bin/sh
# BE pod — PRD ALM fetch smoke (H7_VI → components on AVSWReqMgmt/workitems/PRD)
set -e
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
MODEL="${MODEL:-H7_VI}"

PING_URL="${API_BASE%/}/model-status/initiatives/ping"
LIST_URL="${API_BASE%/}/model-status/prd?model=${MODEL}"
PROBE_URL="${API_BASE%/}/model-status/prd?model=${MODEL}&probe=true"
PING_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PING_URL" 2>/dev/null || echo "000")
echo "GET $PING_URL → HTTP $PING_CODE"
if [ "$PING_CODE" = "404" ]; then
  echo "NG  model-status router 미등록 — sh scripts/patch-be-main-model-status.sh 후 restart"
  exit 1
fi
echo "GET $LIST_URL  (모델현황 PRD 탭 — probe 없음)"
LIST_HEAD=$(curl -s -o /dev/null -w "%{http_code}" "$LIST_URL" 2>/dev/null || echo "000")
echo "  HTTP $LIST_HEAD"
echo "GET $PROBE_URL  (components probe — discover 사용 안 함)"
PRD_HEAD=$(curl -s -o /dev/null -w "%{http_code}" "$PROBE_URL" 2>/dev/null || echo "000")
if [ "$PRD_HEAD" = "404" ]; then
  echo "NG  /prd 404 — patch-be-model-status-prd-from-github.sh 재실행"
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  curl -fsS "$LIST_URL"
  exit 0
fi

curl -fsS "$LIST_URL" | python3 -c '
import json, sys
d = json.load(sys.stdin)
meta = d.get("meta") or {}
items = d.get("items") or []
print("=== UI list ===")
print("prdFetchVersion:", meta.get("prdFetchVersion"))
print("source:", meta.get("source"))
print("projectKey:", meta.get("projectKey"))
print("listPath:", meta.get("listPath"))
print("winningQuery:", meta.get("winningQuery"))
print("filterMode:", meta.get("filterMode"))
print("items:", len(items))
if meta.get("polarionUrl"):
    print("polarionUrl:", meta.get("polarionUrl"))
wq = meta.get("winningQuery") or ""
if "components:" not in wq:
    print("WARN: winningQuery에 components: 없음 — BE 패치/재시작 확인")
if meta.get("prdFetchVersion") != "components-or-merge-v4":
    print("WARN: 구버전 BE — curl ...patch-be-model-status-prd-from-github.sh | REF=최신 sh")
if len(items) < 1:
    print("WARN: 0건 — Polarion PAT / AVSWReqMgmt / workitems/PRD 확인")
'

echo ""
curl -fsS "$PROBE_URL" | python3 -c '
import json, sys
d = json.load(sys.stdin)
meta = d.get("meta") or {}
probe = d.get("probe") or []
hits = [p for p in probe if (p.get("count") or 0) > 0 and not p.get("error")]
print("=== probe (no discover) ===")
print("items:", len(d.get("items") or []))
print("probe hits:", len(hits), "/", len(probe))
if len(probe) > 12:
    print("WARN: probe 후보", len(probe), "개 — 구버전(title/type probe) 가능성")
for p in hits[:5]:
    print("  +", p.get("count"), p.get("query", "")[:90])
if d.get("discovery"):
    print("WARN: component-scoped 인데 discovery 응답 있음 — BE 구버전")
'
