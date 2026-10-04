#!/bin/sh
# be-audio-test pod — main.py에 mr_quality import + router 등록
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
    if "mr_quality" not in names:
        names.append("mr_quality")
        new_line = "from routers import " + ", ".join(names)
        t = t[: m.start()] + new_line + t[m.end() :]
        changed = True
        print("  + added mr_quality to routers import")
else:
    print("  WARN: 'from routers import ...' not found — 수동 추가 필요")

if "mr_quality.router" not in t:
    if "app.include_router(sprint_plan.router)" in t:
        t = t.replace(
            "app.include_router(sprint_plan.router)",
            "app.include_router(sprint_plan.router)\napp.include_router(mr_quality.router)",
        )
    elif "app.include_router(quality.router)" in t:
        t = t.replace(
            "app.include_router(quality.router)",
            "app.include_router(quality.router)\napp.include_router(mr_quality.router)",
        )
    else:
        t = t.rstrip() + "\napp.include_router(mr_quality.router)\n"
    changed = True
    print("  + added app.include_router(mr_quality.router)")

if changed:
    p.write_text(t, encoding="utf-8")
else:
    print("  main.py already OK")
PY

echo "=== Done — uvicorn main:app 재시작 ==="
