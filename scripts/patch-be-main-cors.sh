#!/bin/sh
# be-audio-test pod — main.py CORS → effective_cors_origins() 사용
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[ -f main.py ] || { echo "Error: main.py not found (BE pod /workspace/project 에서 실행)"; exit 1; }

python3 <<'PY'
from pathlib import Path

p = Path("main.py")
t = p.read_text(encoding="utf-8")
orig = t

if "effective_cors_origins" not in t:
    if "from config import settings" in t:
        t = t.replace(
            "from config import settings",
            "from config import effective_cors_origins, settings",
            1,
        )
    elif "import config" not in t:
        # config import 없으면 settings import 근처에 추가 시도
        pass

old_origins = 'allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],'
new_origins = "allow_origins=effective_cors_origins(),"
if old_origins in t:
    t = t.replace(old_origins, new_origins, 1)
elif "allow_origins=effective_cors_origins()" in t:
    print("  main.py already uses effective_cors_origins()")
else:
    print("  WARN: main.py CORS line not found — 수동 확인:")
    print("    allow_origins=effective_cors_origins(),")

if t != orig:
    p.write_text(t, encoding="utf-8")
    print("  patched main.py CORS")
PY

echo "=== Done (uvicorn 재시작 필요) ==="
