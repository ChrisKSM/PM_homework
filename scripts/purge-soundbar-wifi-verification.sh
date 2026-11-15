#!/bin/sh
# Mongo 검증 일정에서 사운드바(Wi-Fi) 제품군 전체 삭제 후 save
#
# BE pod:
#   API_BASE=http://127.0.0.1:8000/api sh scripts/purge-soundbar-wifi-verification.sh
#
set -e
cd "$(dirname "$0")/.."
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"

echo "=== Load Mongo ==="
curl -sf "${API_BASE}/model-schedule/load" -o /tmp/ms-load.json
python3 - <<'PY'
import json, sys, urllib.request
from pathlib import Path

api = __import__("os").environ.get("API_BASE", "http://127.0.0.1:8000/api")
raw = json.loads(Path("/tmp/ms-load.json").read_text(encoding="utf-8"))
rows = raw.get("rows") or []
before = len(rows)
drop_cat = "사운드바(Wi-Fi)"
kept = [r for r in rows if drop_cat not in str(r.get("category", "")).replace(" ", "")]
removed = before - len(kept)
print(f"  rows before: {before}, remove {drop_cat}: {removed}, after: {len(kept)}")
if removed == 0:
    print("  nothing to purge")
    sys.exit(0)
payload = json.dumps({"rows": kept}, ensure_ascii=False).encode("utf-8")
req = urllib.request.Request(
    f"{api}/model-schedule/save",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    print(resp.read().decode())
print("=== Purge done ===")
PY
