#!/bin/sh
# be-audio-test pod — main.py에 procurement import + router 등록 (안전 패치)
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
    if "procurement" not in names:
        names.append("procurement")
        new_line = "from routers import " + ", ".join(names)
        t = t[: m.start()] + new_line + t[m.end() :]
        changed = True
        print("  + added procurement to routers import")
else:
    print("  WARN: 'from routers import ...' not found — 수동 추가 필요")

if "procurement.router" not in t:
    if "app.include_router(quality.router)" in t:
        t = t.replace(
            "app.include_router(quality.router)",
            "app.include_router(quality.router)\napp.include_router(procurement.router)",
        )
    elif "app.include_router(planning.router)" in t:
        t = t.replace(
            "app.include_router(planning.router)",
            "app.include_router(planning.router)\napp.include_router(procurement.router)",
        )
    else:
        t = t.rstrip() + "\napp.include_router(procurement.router)\n"
    changed = True
    print("  + added app.include_router(procurement.router)")

if changed:
    p.write_text(t, encoding="utf-8")
else:
    print("  main.py already OK")
PY

echo ""
echo "=== 필수 파일 확인 ==="
for f in routers/procurement.py services/procurement_service.py; do
  if [ -f "$f" ]; then echo "  OK $f"; else echo "  MISSING $f"; fi
done

echo ""
echo "=== import 테스트 ==="
python3 -c "from routers import procurement; print('procurement.router prefix:', procurement.router.prefix)" 2>/dev/null \
  || python -c "from routers import procurement; print('procurement.router prefix:', procurement.router.prefix)"

echo "=== Done — uvicorn main:app 재시작 ==="
