#!/bin/sh
# BE pod — 전 모델 일정(저장본) SW 일정 ↔ Delivery Portal 날짜 비교표 (Mongo 변경 없음)
#
#   sh scripts/compare-overview-vs-delivery-portal.sh
#   ONLY_DIFF=1 sh scripts/compare-overview-vs-delivery-portal.sh   # 불일치만
#   MODEL=S90C sh scripts/compare-overview-vs-delivery-portal.sh    # 모델명/overview_id 부분일치
#
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
OUT="${OUT:-/tmp/overview-portal-compare.json}"
PY="${PY:-python3}"
command -v "$PY" >/dev/null 2>&1 || PY=python

CODE=$(curl -s -o "$OUT" -w "%{http_code}" --connect-timeout 5 --max-time 180 \
  "${API_BASE}/model-schedule/overview/compare-delivery-portal" || echo "000")
if [ "$CODE" != "200" ]; then
  echo "ERROR: compare API HTTP $CODE (404 = BE 패치 전, 502 = Portal 토큰/네트워크)" >&2
  head -c 600 "$OUT" 2>/dev/null >&2
  echo >&2
  exit 1
fi

ONLY_DIFF="${ONLY_DIFF:-0}" MODEL="${MODEL:-}" "$PY" - "$OUT" <<'EOF'
import json, os, sys

data = json.load(open(sys.argv[1], encoding="utf-8"))
only_diff = os.environ.get("ONLY_DIFF") == "1"
model_q = os.environ.get("MODEL", "").strip().lower()

LABEL = {
    "ok": "일치",
    "stale": "화면≠Portal (재동기화 필요)",
    "missing_on_screen": "화면에 없음 (재동기화 필요)",
    "not_in_portal": "Portal에 없음 (화면에만 있음)",
    "dropped_by_sync": "Portal에 있으나 sync에서 빠짐",
    "other_program_only": "확정 program 외 다른 program에만 있음",
    "multiple_portal_dates": "Portal에 날짜 여러 개",
    "seed_override": "Portal 대신 seed 날짜 사용(90일 초과)",
    "other_program_dates": "다른 program 날짜 다름",
}

print(f"sync_logic_version: {data.get('sync_logic_version')}")
counts = data.get("flag_counts") or {}
print("요약: " + ", ".join(f"{LABEL.get(k, k)} {v}" for k, v in sorted(counts.items())))
print("  * 화면 = 지금 전 모델 일정에 저장된 날짜 / sync후 = 지금 Portal 기준으로 다시 가져오면 들어갈 날짜")
print("  * Portal 실제 = Chart 막대·카드 굵은 줄(actual_*) / 계획 = 카드 회색 줄(plan_*). sync 는 실제 우선")

for m in data.get("models") or []:
    if model_q and model_q not in (m.get("model") or "").lower() and model_q not in m["overview_id"].lower():
        continue
    events = m.get("events") or []
    if only_diff:
        events = [e for e in events if e["flags"] != ["ok"]]
    if not events:
        continue
    print()
    print(f"■ {m.get('model') or '-'}  ({m['overview_id']})" + (f"  확정 program={m['linked_program_id']}" if m.get("linked_program_id") else ""))
    for p in m.get("programs") or []:
        print(f"    program: {p['program_detail']}" + ("" if p["used"] else "  [확정 program 있어 제외]"))
    print(f"    {'이벤트':<10} {'화면':<23} {'sync후':<23} 상태")
    for e in events:
        screen = ", ".join(e["screen"]) or "-"
        exp = ", ".join(e["expected"]) or "-"
        mark = "  " if e["flags"] == ["ok"] else "▶ "
        print(f"  {mark}{e['name']:<10} {screen:<23} {exp:<23} {' / '.join(LABEL.get(f, f) for f in e['flags'])}")
        for p in e["portal"]:
            tag = "" if p["used"] else " [제외]"
            actual = p.get("actual_span") or "-"
            plan = p.get("plan_span") or "-"
            soc = p.get("detail_soc") or p.get("detail_model") or "-"
            print(f"        Portal 실제 {actual:<23} 계획 {plan:<23} {p['program_detail']} · {soc}{tag}")
EOF
echo ""
echo "JSON 원본: $OUT"
