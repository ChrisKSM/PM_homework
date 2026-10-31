#!/bin/sh
# curl 이 "아무 출력도 없을" 때 — HTTP 코드·본문 길이·PAT 로드·query 후보를 한 번에 출력 (BE pod).
#
#   sh scripts/curl-polarion-prd-verbose.sh
#
set -e
ROOT="${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env 2>/dev/null || true
  set +a
fi

BASE="${POLARION_BASE_URL:-https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1}"
BASE="${BASE%/}"
PROJECT="${POLARION_PRD_PROJECT_KEY:-AVSWReqMgmt}"
PATH_SEG="${POLARION_PRD_REST_LIST_PATH:-workitems}"
CURL_K="-k"

pat="${POLARION_PAT:-}"
pat_len=${#pat}
echo "=== Polarion PRD curl verbose ==="
echo "POLARION_PAT length: ${pat_len} (0 이면 .env 미로드 — 아래 export 필요)"
echo "URL base: ${BASE}/projects/${PROJECT}/${PATH_SEG}"
echo ""

if [ "$pat_len" -lt 20 ]; then
  echo "ERROR: POLARION_PAT 가 비어 있거나 너무 짧습니다." >&2
  echo "  set -a && . ./.env && set +a   후 재실행" >&2
  echo "  또는: export POLARION_PAT='(Polarion PAT)'" >&2
  exit 1
fi

export BASE PROJECT PATH_SEG pat CURL_K
python3 <<'PY'
import json
import os
import subprocess
import sys

base = os.environ["BASE"]
project = os.environ["PROJECT"]
path_seg = os.environ["PATH_SEG"]
pat = os.environ["pat"]
curl_k = os.environ.get("CURL_K", "")

queries = [
    ("UI v6 escaped", r"components:(SoundSuite_H7\(VI\) H7_VI)"),
    ("no escape", "components:(SoundSuite_H7(VI) H7_VI)"),
    ("H7_VI only", "components:(H7_VI)"),
    ("type PRD + v6", r"type:PRD AND components:(SoundSuite_H7\(VI\) H7_VI)"),
    ("minimal", "type:PRD"),
]

def one(query: str, path: str) -> None:
    url = f"{base}/projects/{project}/{path}"
    cmd = ["curl", "-sS", "-w", "\n__META__http=%{http_code} bytes=%{size_download} err=%{errormsg}\n"]
    if curl_k == "-k":
        cmd.append("-k")
    cmd += [
        "-H", f"Authorization: Bearer {pat}",
        "-H", "Accept: application/json",
        "--get", url,
        "--data-urlencode", f"query={query}",
        "--data-urlencode", "page=1",
        "--data-urlencode", "pageSize=5",
    ]
    try:
        out = subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        print(f"curl exit {e.returncode} query={query[:50]!r}")
        print((e.output or "")[:500])
        return
    if "__META__" not in out:
        print("unexpected curl output")
        print(out[:300])
        return
    body, _, meta = out.rpartition("__META__")
    meta = meta.strip()
    blen = len(body)
    print(f"--- path={path} | {meta} | body_len={blen} ---")
    print(f"    query: {query}")
    if blen == 0:
        print("    (empty body — PAT/403/게이트웨이 또는 연결 끊김. -v 로 재시도)")
        return
    snippet = body[:500]
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        print("    not JSON:", repr(snippet[:200]))
        return
    if "errors" in data:
        for e in data.get("errors") or []:
            print("    error:", e.get("status"), e.get("detail") or e.get("title"))
        return
    # parse total like polarion_client
    obj = None
    if isinstance(data, dict) and "data" in data:
        inner = data["data"]
        if isinstance(inner, list) and inner:
            obj = inner[0] if isinstance(inner[0], dict) else None
        elif isinstance(inner, dict):
            obj = inner
    elif isinstance(data, dict):
        obj = data
    total = listed = 0
    if obj:
        for key in ("workitems", "workItems", "items"):
            if isinstance(obj.get(key), list):
                listed = len(obj[key])
                break
        tr = obj.get("totalCount", obj.get("total"))
        try:
            total = int(tr) if tr is not None else listed
        except (TypeError, ValueError):
            total = listed
    print(f"    totalCount≈{total} listed={listed} top_keys={list(data.keys())[:6]}")
    print("")

for label, q in queries:
    one(q, path_seg)
    print("")

print("--- alt REST path workitems/PRD (first query only) ---")
one(queries[0][1], "workitems/PRD")
PY

echo ""
echo "수동 1줄 (HTTP·크기만):"
echo '  curl -k -sS -w "\nHTTP %{http_code} bytes %{size_download}\n" -o /tmp/pol.json -H "Authorization: Bearer $POLARION_PAT" ... && wc -c /tmp/pol.json && head -c 200 /tmp/pol.json'
