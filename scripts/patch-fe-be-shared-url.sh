#!/bin/sh
# react-audio FE — API를 공용 be-audio-test Route 로 되돌림 (Worker --8000-- 제거)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-fe-be-shared-url.sh" | sh
#   npm run build && git push … (팀 배포 절차)
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."

SHARED="${SHARED_BE_URL:-https://be-audio-test.apps.axstudio.lge.com}"
API="${SHARED%/}/api"
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

echo "=== FE API → 공용 BE: $API ==="

if [ ! -f src/api/client.ts ]; then
  curl -fsSL "$BASE/src/api/client.ts" -o src/api/client.ts
  echo "  + fetched src/api/client.ts"
fi

python3 - <<PY
from pathlib import Path
import re

api = """${API}"""
# .env
p = Path(".env")
lines = p.read_text(encoding="utf-8").splitlines() if p.is_file() else []
out, found = [], False
for line in lines:
    if line.startswith("REACT_APP_API_BASE_URL="):
        out.append(f"REACT_APP_API_BASE_URL={api}")
        found = True
    elif line.startswith("REACT_APP_ALLOW_WORKER_BE="):
        continue
    else:
        out.append(line)
if not found:
    out.append(f"REACT_APP_API_BASE_URL={api}")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"  .env REACT_APP_API_BASE_URL={api}")

# workspace_env.js
pub = Path("public/workspace_env.js")
pub.parent.mkdir(parents=True, exist_ok=True)
pub.write_text(f"""window.workspace_env = {{
  REACT_APP_API_BASE_URL: "{api}",
}};
""", encoding="utf-8")
print("  public/workspace_env.js → 공용 BE")

# BE_AXSTUDIO 상수 (구버전 Worker 치환 잔재 제거)
c = Path("src/api/client.ts")
t = c.read_text(encoding="utf-8")
t2, n = re.subn(
    r"export const BE_AXSTUDIO = '[^']*'",
    f"export const BE_AXSTUDIO = '{api}'",
    t,
    count=1,
)
if n == 1:
    c.write_text(t2, encoding="utf-8")
    print("  src/api/client.ts BE_AXSTUDIO OK")
else:
    print("  WARN: BE_AXSTUDIO line not found — client.ts 수동 확인")
PY

if command -v npm >/dev/null 2>&1 && [ "${RUN_BUILD:-1}" = "1" ]; then
  echo "=== npm run build ==="
  npm run build
fi

if [ -f scripts/verify-fe-api-base-url.sh ]; then
  sh scripts/verify-fe-api-base-url.sh || true
fi

echo ""
echo "  브라우저 Network: Host must be be-audio-test.apps.axstudio.lge.com (NOT --8000--)"
echo "=== patch-fe-be-shared-url done ==="
