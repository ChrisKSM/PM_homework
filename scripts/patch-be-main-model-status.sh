#!/bin/sh
# be-audio-test pod — main.py에 model_status import + router 등록
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f main.py ] && [ -f /workspace/project/main.py ]; then
  ROOT=/workspace/project
  cd "$ROOT"
fi

if [ ! -f main.py ]; then
  echo "Error: main.py not found (cwd: $(pwd))"
  exit 1
fi

python3 - <<'PY' 2>/dev/null || python - <<'PY'
import re
from pathlib import Path

p = Path("main.py")
t = p.read_text(encoding="utf-8")
changed = False

if "model_status.router" in t:
    print("  main.py already has model_status.router")
else:
    m = re.search(r"^from routers import \(([\s\S]*?)\)\s*$", t, re.M)
    if m:
        block = m.group(1)
        if "model_status" not in block:
            if block.strip().endswith(","):
                new_block = block.rstrip() + "\n    model_status,\n"
            else:
                new_block = block.rstrip() + ",\n    model_status,\n"
            t = t[: m.start(1)] + new_block + t[m.end(1) :]
            changed = True
            print("  + added model_status to routers import (parens)")
    else:
        m2 = re.search(r"^from routers import (.+)$", t, re.M)
        if m2:
            names = [x.strip() for x in m2.group(1).split(",")]
            if "model_status" not in names:
                names.append("model_status")
                t = t[: m2.start()] + "from routers import " + ", ".join(names) + t[m2.end() :]
                changed = True
                print("  + added model_status to routers import")

    if "app.include_router(model_status.router)" not in t:
        if "app.include_router(mr_quality.router)" in t:
            t = t.replace(
                "app.include_router(mr_quality.router)",
                "app.include_router(mr_quality.router)\napp.include_router(model_status.router)",
            )
        elif "app.include_router(sprint_plan.router)" in t:
            t = t.replace(
                "app.include_router(sprint_plan.router)",
                "app.include_router(sprint_plan.router)\napp.include_router(model_status.router)",
            )
        else:
            t = t.rstrip() + "\napp.include_router(model_status.router)\n"
        changed = True
        print("  + added app.include_router(model_status.router)")

if changed:
    p.write_text(t, encoding="utf-8")
PY

echo "=== patch-be-main-model-status done ==="
