#!/bin/sh
# Polarion PRD — REST customs API 로 Lucene query 후보를 curl 로 검증 (BE pod / 사내망).
#
# UI hash URL 과 REST URL 은 다릅니다:
#   UI:  .../polarion/#/project/AVSWReqMgmt/workitems/PRD?query=components%3A(SoundSuite_H7%5C(VI%5C)%20H7_VI)
#   REST: .../polarion/restful/customs/v1/projects/AVSWReqMgmt/workitems?query=...&page=1&pageSize=10
#
# REST 의 query 파라미터 값은 Lucene 문자열 그대로 (--data-urlencode 로 인코딩).
# UI v6 와 동일한 본문: components:(SoundSuite_H7\(VI\) H7_VI)
#
# 사용 (BE pod):
#   export POLARION_PAT='...'
#   sh scripts/probe-polarion-prd-rest.sh
#   MODEL=M7_VI sh scripts/probe-polarion-prd-rest.sh
#
# PAT 없이 localhost BE 가 이미 설정돼 있으면:
#   API_BASE=http://127.0.0.1:8000/api sh scripts/probe-polarion-prd-rest.sh --via-api
#
set -e

VIA_API=0
for arg in "$@"; do
  case "$arg" in
    --via-api) VIA_API=1 ;;
  esac
done

ROOT="${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

MODEL="${MODEL:-H7_VI}"
PROJECT="${POLARION_PRD_PROJECT_KEY:-AVSWReqMgmt}"
BASE="${POLARION_BASE_URL:-https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1}"
BASE="${BASE%/}"
VERIFY="${POLARION_VERIFY_SSL:-false}"
PAGE_SIZE="${PAGE_SIZE:-10}"
CURL_K=""
if [ "$VERIFY" = "false" ] || [ "$VERIFY" = "0" ]; then
  CURL_K="-k"
fi

if [ -f .env ] && [ -z "${POLARION_PAT:-}" ]; then
  # shellcheck disable=SC2046
  set -a
  # shellcheck disable=SC1091
  . ./.env 2>/dev/null || true
  set +a
fi

if [ "$VIA_API" = "1" ]; then
  API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
  echo "=== via BE API (Polarion PAT 는 pod .env) ==="
  echo "GET ${API_BASE}/model-status/prd/query-catalog?model=${MODEL}"
  echo ""
  curl -fsS "${API_BASE}/model-status/prd/query-catalog?model=${MODEL}" | python3 -c '
import json, sys
d = json.load(sys.stdin)
meta = d.get("meta") or {}
print("project:", meta.get("projectKey"), "restListPath:", meta.get("restListPath"))
print("hitCount:", meta.get("hitCount"), "probed:", meta.get("probed"))
print("")
for i, row in enumerate(d.get("recommended") or [], 1):
    print("%2d. count=%-4s priority=%s" % (i, row.get("count"), row.get("priority")))
    print("    query:", row.get("query"))
    print("    UI :", row.get("polarionUrl"))
    print("")
'
  echo "=== list fetch ==="
  curl -fsS "${API_BASE}/model-status/prd?model=${MODEL}" | python3 -c '
import json, sys
d = json.load(sys.stdin)
m = d.get("meta") or {}
print("prdFetchVersion:", m.get("prdFetchVersion"))
print("winningQuery:", m.get("winningQuery"))
print("polarionUrl:", m.get("polarionUrl"))
print("items:", len(d.get("items") or []))
for a in (m.get("polarionFetchAttempts") or [])[:8]:
    print("  try", a.get("restPath"), "total=", a.get("polarionTotal"), "listed=", a.get("listed"), a.get("error") or "")
'
  exit 0
fi

if [ -z "${POLARION_PAT:-}" ]; then
  echo "ERROR: POLARION_PAT 가 없습니다." >&2
  echo "  export POLARION_PAT='...' 후 재실행" >&2
  echo "  또는: API_BASE=http://127.0.0.1:8000/api sh $0 --via-api" >&2
  exit 1
fi

REST_PATHS="${REST_PATHS:-workitems workitems/PRD}"

echo "=== Polarion REST probe ==="
echo "project: $PROJECT"
echo "base:    $BASE"
echo "model:   $MODEL"
echo ""
echo "예시 curl (UI v6 쿼리 1건):"
echo "  curl $CURL_K -sS \\"
echo "    -H \"Authorization: Bearer \$POLARION_PAT\" \\"
echo "    -H \"Accept: application/json\" \\"
echo "    --get \"${BASE}/projects/${PROJECT}/workitems\" \\"
echo "    --data-urlencode 'query=components:(SoundSuite_H7\\(VI\\) H7_VI)' \\"
echo "    --data-urlencode 'page=1' \\"
echo "    --data-urlencode 'pageSize=${PAGE_SIZE}' | python3 -m json.tool | head"
echo ""

export PROJECT BASE PAGE_SIZE CURL_K POLARION_PAT MODEL REST_PATHS
python3 <<'PY'
import json
import os
import subprocess
import sys

model = os.environ.get("MODEL", "H7_VI")
project = os.environ["PROJECT"]
base = os.environ["BASE"]
page_size = os.environ.get("PAGE_SIZE", "10")
curl_k = os.environ.get("CURL_K", "")
pat = os.environ["POLARION_PAT"]
rest_paths = os.environ.get("REST_PATHS", "workitems workitems/PRD").split()

if model == "H7_VI":
    queries = [
        r"components:(SoundSuite_H7\(VI\) H7_VI)",
        "components:(SoundSuite_H7(VI) H7_VI)",
        'components:("SoundSuite_H7(VI)" OR H7_VI)',
        "components:(H7_VI)",
        r"components:(SoundSuite_H7\(VI\))",
        r"type:PRD AND components:(SoundSuite_H7\(VI\) H7_VI)",
    ]
else:
    queries = ["type:PRD"]


def parse_list(data):
    obj = None
    if isinstance(data, dict) and "data" in data:
        inner = data["data"]
        if isinstance(inner, list) and inner:
            obj = inner[0] if isinstance(inner[0], dict) else None
        elif isinstance(inner, dict):
            obj = inner
    elif isinstance(data, list) and data:
        obj = data[0]
    elif isinstance(data, dict):
        obj = data
    items = []
    total = 0
    if obj:
        for key in ("workitems", "workItems", "items"):
            if isinstance(obj.get(key), list):
                items = obj[key]
                break
        tr = obj.get("totalCount", obj.get("total", obj.get("totalItems")))
        try:
            total = int(tr) if tr is not None else len(items)
        except (TypeError, ValueError):
            total = len(items)
    return total, items


for rest_path in rest_paths:
    print(f"--- list_path: {rest_path} ---")
    for q in queries:
        url = f"{base}/projects/{project}/{rest_path}"
        cmd = ["curl", "-sS", "-w", "\n__HTTP__%{http_code}"]
        if curl_k.strip() == "-k":
            cmd.append("-k")
        cmd += [
            "-H",
            f"Authorization: Bearer {pat}",
            "-H",
            "Accept: application/json",
            "--get",
            url,
            "--data-urlencode",
            f"query={q}",
            "--data-urlencode",
            "page=1",
            "--data-urlencode",
            f"pageSize={page_size}",
        ]
        try:
            out = subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)
        except subprocess.CalledProcessError as e:
            print(f"curl failed query={q[:60]!r}")
            print((e.output or "")[:200])
            continue
        if "__HTTP__" not in out:
            print(f"bad curl output query={q[:60]!r}")
            continue
        body, _, http = out.rpartition("__HTTP__")
        http = http.strip()
        if http != "200":
            print(f"HTTP {http}  query={q}")
            print(body[:200])
            continue
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            print(f"HTTP 200 not JSON query={q}")
            print(body[:200])
            continue
        total, items = parse_list(data)
        ids = []
        for it in items[:5]:
            if isinstance(it, dict):
                wid = it.get("id") or (it.get("attributes") or {}).get("id") or "?"
                ids.append(str(wid))
        line = f"total={total:<4} listed={len(items):<2}  query={q[:72]}"
        print(line)
        if ids:
            print("       ids:", ", ".join(ids))
    print("")
PY

echo "=== 해석 ==="
echo "- total>0 인 query 가 REST 에서 이기는 쿼리입니다. BE winningQuery 는 보통 UI v6: components:(SoundSuite_H7\\(VI\\) H7_VI)"
echo "- workitems/PRD REST path 가 404 이면 workitems 만 사용 (POLARION_PRD_REST_LIST_PATH=workitems)."
echo "- UI polarionUrl 은 hash 인코딩만 다르고 Lucene 본문은 winningQuery 와 같아야 합니다."
