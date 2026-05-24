#!/bin/sh
# be-audio-test pod — main.py에 quality router 자동 등록
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f main.py ]; then
  echo "Error: main.py not found (BE flat root?)"
  exit 1
fi

python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path
p = Path("main.py")
t = p.read_text(encoding="utf-8")
changed = False

if "quality" not in t.split("from routers import")[1].split("\n")[0] if "from routers import" in t else "":
    if "from routers import" in t and "quality" not in t:
        import re
        t2 = re.sub(
            r"from routers import ([^\n]+)",
            lambda m: f"from routers import {m.group(1).strip()}, quality"
            if "quality" not in m.group(1) else m.group(0),
            t,
            count=1,
        )
        if t2 != t:
            t = t2
            changed = True

if "quality.router" not in t:
    if "app.include_router(planning.router)" in t:
        t = t.replace(
            "app.include_router(planning.router)",
            "app.include_router(planning.router)\napp.include_router(quality.router)",
        )
        changed = True
    elif "app.include_router(devteam.router)" in t:
        t = t.replace(
            "app.include_router(devteam.router)",
            "app.include_router(devteam.router)\napp.include_router(quality.router)",
        )
        changed = True

if changed:
    p.write_text(t, encoding="utf-8")
    print("  patched main.py (quality router)")
else:
    print("  main.py already has quality or manual edit needed")
PY
