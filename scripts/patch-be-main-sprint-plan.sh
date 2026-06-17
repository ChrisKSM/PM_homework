#!/bin/sh
# be-audio-test pod — main.py에 sprint_plan import + router 등록 (안전 패치)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f main.py ]; then
  echo "Error: main.py not found"
  exit 1
fi

python3 - <<'PY' 2>/dev/null || python - <<'PY'
import re
from pathlib import Path

p = Path("main.py")
t = p.read_text(encoding="utf-8")
changed = False

m = re.search(r"^from routers import (.+)$", t, re.M)
if m:
    names = [x.strip() for x in m.group(1).split(",")]
    if "sprint_plan" not in names:
        names.append("sprint_plan")
        new_line = "from routers import " + ", ".join(names)
        t = t[: m.start()] + new_line + t[m.end() :]
        changed = True
        print("  + added sprint_plan to routers import")
else:
    print("  WARN: 'from routers import ...' not found — 수동 추가 필요")

if "sprint_plan.router" not in t:
    if "app.include_router(risk.router)" in t:
        t = t.replace(
            "app.include_router(risk.router)",
            "app.include_router(risk.router)\napp.include_router(sprint_plan.router)",
        )
    elif "app.include_router(procurement.router)" in t:
        t = t.replace(
            "app.include_router(procurement.router)",
            "app.include_router(procurement.router)\napp.include_router(sprint_plan.router)",
        )
    else:
        t = t.rstrip() + "\napp.include_router(sprint_plan.router)\n"
    changed = True
    print("  + added app.include_router(sprint_plan.router)")

if changed:
    p.write_text(t, encoding="utf-8")
else:
    print("  main.py already OK")
PY

echo ""
echo "=== 필수 파일 확인 ==="
for f in routers/sprint_plan.py services/sprint_plan_service.py; do
  if [ -f "$f" ]; then echo "  OK $f"; else echo "  MISSING $f"; fi
done

echo "=== Done — uvicorn main:app 재시작 ==="
