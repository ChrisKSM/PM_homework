#!/bin/sh
# prod/main.py — report를 optional import로 변경 (jinja2 없어도 BE 기동)
set -e
cd "$(dirname "$0")/.."

python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path
import re

p = Path("main.py")
t = p.read_text(encoding="utf-8")

# top-level report import 제거
t2 = re.sub(
    r"from routers import ([^\n]+)",
    lambda m: "from routers import "
    + ", ".join(x.strip() for x in m.group(1).split(",") if x.strip() != "report"),
    t,
    count=1,
)

# 무조건 include report → try/except 블록
if "app.include_router(report.router)" in t2 and "try:" not in t2.split("app.include_router(report.router)")[0][-80:]:
    block = '''
# daily report — jinja2 미설치 환경(prod 이미지 등)에서는 건너뜀
try:
    from routers import report

    app.include_router(report.router)
except ModuleNotFoundError:
    pass
'''
    t2 = t2.replace("app.include_router(report.router)\n", "")
    t2 = t2.replace("app.include_router(report.router)", "")
    if "app.include_router(quality.router)" in t2:
        t2 = t2.replace(
            "app.include_router(quality.router)",
            "app.include_router(quality.router)\n" + block.strip(),
        )

if t2 != t:
    p.write_text(t2, encoding="utf-8")
    print("patched main.py — report optional")
else:
    print("main.py already patched or manual edit needed")
PY

python3 -c "import main; print('OK main.py')" 2>/dev/null || python -c "import main; print('OK main.py')"
