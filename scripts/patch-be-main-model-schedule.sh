#!/bin/sh
# be-audio-test pod — main.py에 model_schedule import + router 등록
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

# try/except 블록이 이미 있으면 스킵
if "model_schedule.router" in t:
    print("  main.py already has model_schedule.router")
else:
    block = """
try:
    from routers import model_schedule
    app.include_router(model_schedule.router)
except ImportError:
    pass
"""
    if "app.include_router(mr_quality.router)" in t:
        t = t.replace(
            "app.include_router(mr_quality.router)",
            "app.include_router(mr_quality.router)" + block,
        )
    elif "app.include_router(sprint_plan.router)" in t:
        t = t.replace(
            "app.include_router(sprint_plan.router)",
            "app.include_router(sprint_plan.router)" + block,
        )
    else:
        t = t.rstrip() + "\n" + block.strip() + "\n"
    changed = True
    print("  + added model_schedule router block")

if changed:
    p.write_text(t, encoding="utf-8")
PY

echo "=== Done — uvicorn main:app 재시작 ==="
