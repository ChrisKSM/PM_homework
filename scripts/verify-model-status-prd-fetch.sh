#!/bin/sh
# BE pod — PRD ALM fetch smoke (적용모델 Sound Suite H7 / Sound suite_H7)
set -e
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
MODEL="${MODEL:-H7_VI}"

URL="${API_BASE}/model-status/prd?model=${MODEL}&probe=true"
echo "GET $URL"
if ! command -v python3 >/dev/null 2>&1; then
  curl -fsS "$URL"
  exit 0
fi

curl -fsS "$URL" | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except json.JSONDecodeError:
    print(raw[:2000])
    sys.exit(1)
meta = d.get("meta") or {}
items = d.get("items") or []
probe = d.get("probe") or []
hits = [p for p in probe if (p.get("count") or 0) > 0 and not p.get("error")]
print("model:", meta.get("model"))
print("source:", meta.get("source"))
print("terms:", ", ".join(meta.get("terms") or []))
print("polarionConfigured:", meta.get("polarionConfigured"))
print("davisConfigured:", meta.get("davisConfigured"))
print("winningQuery:", (meta.get("winningQuery") or "")[:120])
print("items:", len(items))
print("probe hits:", len(hits), "/", len(probe))
for p in hits[:8]:
    print("  +", p.get("count"), p.get("query", "")[:100])
if items:
    print("sample:", items[0].get("id"), "|", (items[0].get("title") or "")[:60], "| applyModel=", items[0].get("applyModel"))
if not meta.get("polarionConfigured") and not meta.get("davisConfigured"):
    print("WARN: POLARION_PAT 또는 DAVIS_DB_API_* 설정 필요")
    sys.exit(2)
if not hits and not items:
    print("WARN: 0 hits — Polarion 필드명(applyModel) 또는 project_key 확인")
    sys.exit(3)
'
