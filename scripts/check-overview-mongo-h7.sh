#!/bin/sh
# overview/load — H7/H5 SIT1·FC1 (JSON 파서 실패 시 grep fallback)
API_BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}"
set -e
TMP="${TMPDIR:-/tmp}/overview-load-$$.json"
curl -sf --connect-timeout 10 "$API_BASE/model-schedule/overview/load" -o "$TMP" || {
  echo "NG  overview/load failed: $API_BASE"
  exit 1
}

python3 <<PY
import json, re
raw = open("$TMP", encoding="utf-8", errors="replace").read()

def sit1_for(model: str):
    try:
        d = json.loads(raw, strict=False)
        m = next((x for x in d.get("models", []) if x.get("model") == model), None)
        if not m:
            return None, "not_in_db"
        for e in m.get("events") or []:
            if e.get("kind") != "sw":
                continue
            n = (e.get("name") or "").replace(" ", "").upper()
            if "SIT" in n and "1" in n:
                return (e.get("start"), e.get("end")), "json"
        return None, "no_sit1"
    except json.JSONDecodeError:
        pass
    # fallback: model block rough scan
    idx = raw.find(f'"model": "{model}"')
    if idx < 0:
        idx = raw.find(f'"model":"{model}"')
    if idx < 0:
        return None, "not_in_raw"
    chunk = raw[idx : idx + 12000]
    for name in ("S I T1", "SIT 1", "SIT1"):
        p = re.search(
            rf'"name"\s*:\s*"{re.escape(name)}"[\s\S]{{0,400}}?"start"\s*:\s*"(\d{{4}}-\d{{2}}-\d{{2}})"[\s\S]{{0,200}}?"end"\s*:\s*"(\d{{4}}-\d{{2}}-\d{{2}})"',
            chunk,
        )
        if p:
            return (p.group(1), p.group(2)), "regex"
    if "2026-08-13" in chunk and ("S I T1" in chunk or "SIT 1" in chunk):
        return ("2026-08-13", "?"), "grep_loose"
    if "2026-09-04" in chunk and ("S I T1" in chunk or "SIT" in chunk):
        return ("2026-09-04", "(old)"), "grep_old"
    return None, "parse_fail"

expect = ("2026-08-13", "2026-08-21")
for model in ("H7_VI", "H5"):
    pair, how = sit1_for(model)
    print(f"{model}: SIT1 = {pair} ({how})")
    if pair == expect:
        print(f"  OK  expected {expect[0]} ~ {expect[1]}")
    elif pair and pair[0] == "2026-09-04":
        print("  NG  구 일정 — push-overview-seed-from-github.sh 실행")
    elif pair:
        print(f"  NG  expected {expect[0]} ~ {expect[1]}")
    else:
        print("  NG  SIT1 not found")
PY
