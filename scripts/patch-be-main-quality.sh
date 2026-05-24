#!/bin/sh
# be-audio-test pod — main.py에 quality import + router 등록 (안전 패치)
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

# 1) import line에 quality 추가 (import 줄만 검사)
m = re.search(r"^from routers import (.+)$", t, re.M)
if m:
    names = [x.strip() for x in m.group(1).split(",")]
    if "quality" not in names:
        names.append("quality")
        new_line = "from routers import " + ", ".join(names)
        t = t[: m.start()] + new_line + t[m.end() :]
        changed = True
        print("  + added quality to routers import")
else:
    print("  WARN: 'from routers import ...' not found — 수동 추가 필요")

# 2) include_router(quality.router) 없으면 추가
if "quality.router" not in t:
    if "app.include_router(planning.router)" in t:
        t = t.replace(
            "app.include_router(planning.router)",
            "app.include_router(planning.router)\napp.include_router(quality.router)",
        )
    elif "app.include_router(devteam.router)" in t:
        t = t.replace(
            "app.include_router(devteam.router)",
            "app.include_router(devteam.router)\napp.include_router(quality.router)",
        )
    else:
        t = t.rstrip() + "\napp.include_router(quality.router)\n"
    changed = True
    print("  + added app.include_router(quality.router)")

if changed:
    p.write_text(t, encoding="utf-8")
else:
    print("  main.py already OK")
PY

echo ""
echo "=== 필수 파일 확인 ==="
for f in routers/quality.py services/quality_service.py; do
  if [ -f "$f" ]; then echo "  OK $f"; else echo "  MISSING $f — sh scripts/workspace-sync-be-flat.sh 실행"; fi
done

echo ""
echo "=== import 테스트 ==="
python3 -c "from routers import quality; print('quality.router prefix:', quality.router.prefix)" 2>/dev/null \
  || python -c "from routers import quality; print('quality.router prefix:', quality.router.prefix)"

echo "=== Done — uvicorn main:app 재시작 ==="
