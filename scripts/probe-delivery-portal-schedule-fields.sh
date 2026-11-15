#!/bin/sh
# BE pod — Delivery Portal 원본에서 모델 일정의 "모든 필드"와 특정 날짜가 들어있는 위치 확인
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/probe-delivery-portal-schedule-fields.sh" | sh
#   MODEL=S90C FIND=2026-11-23 sh scripts/probe-delivery-portal-schedule-fields.sh
#
# 결과 전체를 그대로 붙여 주세요. 토큰/개인정보 값은 출력하지 않습니다.
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
MODEL="${MODEL:-S90C}"
FIND="${FIND:-2026-11-23}"
PY="${PY:-python3}"
command -v "$PY" >/dev/null 2>&1 || PY=python
ALL=/tmp/dp_all_deliveries_raw.json
PR=/tmp/dp_program_report_raw.json

echo "=== fetch all_deliveries_data (via BE) ==="
CODE=$(curl -s -o "$ALL" -w "%{http_code}" --max-time 180 "$API_BASE/delivery-portal/all-deliveries" || echo 000)
echo "  HTTP $CODE  size=$(wc -c < "$ALL" 2>/dev/null) bytes"
[ "$CODE" = "200" ] || { head -c 400 "$ALL"; echo; exit 1; }

echo "=== fetch program-report (via BE) ==="
CODE2=$(curl -s -o "$PR" -w "%{http_code}" --max-time 180 "$API_BASE/delivery-portal/program-report" || echo 000)
echo "  HTTP $CODE2  size=$(wc -c < "$PR" 2>/dev/null) bytes"

MODEL="$MODEL" FIND="$FIND" "$PY" - "$ALL" "$PR" "$CODE2" <<'EOF'
import json, os, re, sys
from collections import Counter

all_path, pr_path, pr_code = sys.argv[1], sys.argv[2], sys.argv[3]
model = os.environ["MODEL"].lower()
find = os.environ["FIND"]
y, m, d = find.split("-")
find_variants = {find, f"{y}/{m}/{d}", f"{y}.{m}.{d}", f"{y}/{int(m)}/{int(d)}", f"{y}{m}{d}"}

data = json.load(open(all_path, encoding="utf-8"))

print("\n=== 1) schedules[] 에 나오는 키 (전체 Portal) ===")
keys = Counter()
for pd in data.get("platform_data") or []:
    for pi in pd.get("program_info") or []:
        for de in pi.get("details") or []:
            for s in de.get("schedules") or []:
                keys.update(s.keys())
for k, n in keys.most_common():
    print(f"  {k:<28} {n}")

print("\n=== 2) global_data / platform 블록 키 ===")
print("  top:", list(data.keys()))
print("  global_data:", list((data.get("global_data") or {}).keys())[:30])
if data.get("platform_data"):
    print("  platform_data[0]:", list(data["platform_data"][0].keys()))

print(f"\n=== 3) '{os.environ['MODEL']}' program 원본 (모든 detail · 모든 schedule 필드) ===")
hit = 0
for pd in data.get("platform_data") or []:
    for pi in pd.get("program_info") or []:
        blob = f"{pi.get('program')} {pi.get('program_detail')}".lower()
        if model not in blob:
            continue
        hit += 1
        print(f"\n[{pd.get('platform')}] id={pi.get('id')} program={pi.get('program')!r} program_detail={pi.get('program_detail')!r}")
        print("  program_info keys:", [k for k in pi.keys() if k != "details"])
        for i, de in enumerate(pi.get("details") or []):
            meta = {k: v for k, v in de.items() if k != "schedules" and not isinstance(v, (list, dict))}
            print(f"  detail[{i}] {meta}")
            nested = [k for k, v in de.items() if k != "schedules" and isinstance(v, (list, dict))]
            if nested:
                print(f"    nested keys: {nested}")
            for s in de.get("schedules") or []:
                print("    -", json.dumps(s, ensure_ascii=False))
if not hit:
    print("  (매칭 program 없음 — MODEL 값을 바꿔 보세요)")

def walk(obj, path, out):
    if isinstance(obj, dict):
        for k, v in obj.items():
            walk(v, f"{path}.{k}", out)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, f"{path}[{i}]", out)
    elif isinstance(obj, str) and any(fv in obj for fv in find_variants):
        out.append((path, obj))

print(f"\n=== 4) '{find}' 가 들어있는 위치 — all_deliveries_data ===")
found = []
walk(data, "$", found)
for p, v in found[:40]:
    print(f"  {p} = {v!r}")
print(f"  총 {len(found)}건")

print(f"\n=== 5) '{find}' 가 들어있는 위치 — program-report (HTTP {pr_code}) ===")
if pr_code == "200":
    pr = json.load(open(pr_path, encoding="utf-8"))
    found2 = []
    walk(pr, "$", found2)
    for p, v in found2[:40]:
        print(f"  {p} = {v!r}")
    print(f"  총 {len(found2)}건")
    rows = pr if isinstance(pr, list) else pr.get("results") or pr.get("data") or []
    for r in rows if isinstance(rows, list) else []:
        if isinstance(r, dict) and model in json.dumps(r, ensure_ascii=False).lower():
            print("\n  program-report row (모델 포함) keys:", list(r.keys())[:60])
            break
else:
    print("  program-report 조회 실패 — 생략")
EOF
echo ""
echo "원본: $ALL , $PR"
