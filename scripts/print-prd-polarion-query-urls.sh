#!/bin/sh
# BE pod — PRD Polarion Lucene URL 출력 (브라우저 테스트용)
#   API_BASE=http://127.0.0.1:8000/api MODEL=H7_VI sh scripts/print-prd-polarion-query-urls.sh
set -e
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
MODEL="${MODEL:-H7_VI}"
URL="${API_BASE}/model-status/prd/query-catalog?model=${MODEL}"

echo "GET $URL"
echo ""

curl -fsS "$URL" | python3 -c '
import json, sys
d = json.load(sys.stdin)
meta = d.get("meta") or {}
print("model:", meta.get("model"), "project:", meta.get("projectKey"))
print("terms:", ", ".join(meta.get("terms") or []))
print("hitCount:", meta.get("hitCount"), "/", meta.get("probed"))
print("")
print("=== recommended (Polarion UI — 브라우저에 url 붙여넣기) ===")
for i, row in enumerate(d.get("recommended") or [], 1):
    print("%d. count=%s priority=%s" % (i, row.get("count"), row.get("priority")))
    print("   query:", row.get("query"))
    print("   url:", row.get("polarionUrl"))
    print("")
'
