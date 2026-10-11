#!/bin/sh
# react-audio FE pod — Worker Port BE URL (공용 be-audio-test token 없을 때)
#
# ⚠️ scripts/ 없으면 (최초 1회):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
#     scripts/patch-fe-be-worker-url.sh \
#     src/api/client.ts
#   chmod +x scripts/patch-fe-be-worker-url.sh
#
#   BE_WORKER_URL=https://be-audio-test--8000--seokmin-koh.apps.axstudio.lge.com \
#     sh scripts/patch-fe-be-worker-url.sh
#   npm run build
#   git add .env public/workspace_env.js src/api/client.ts
#   git commit -m "fix: FE BE URL → Worker Port" && git push origin master
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."

WORKER="${BE_WORKER_URL:-}"
if [ -z "$WORKER" ]; then
  echo "Error: BE_WORKER_URL 필요"
  echo "  예: BE_WORKER_URL=https://be-audio-test--8000--seokmin-koh.apps.axstudio.lge.com"
  exit 1
fi

API="${WORKER%/}/api"

python3 - <<PY
from pathlib import Path
api = """${API}"""
p = Path(".env")
lines = p.read_text(encoding="utf-8").splitlines() if p.is_file() else []
out, found = [], False
for line in lines:
    if line.startswith("REACT_APP_API_BASE_URL="):
        out.append(f"REACT_APP_API_BASE_URL={api}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"REACT_APP_API_BASE_URL={api}")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"  .env REACT_APP_API_BASE_URL={api}")
PY

# runtime override (Docker entrypoint가 workspace_env.js 덮어쓸 수 있음 — .env와 병행)
mkdir -p public
cat > public/workspace_env.js <<EOF
window.workspace_env = {
  REACT_APP_API_BASE_URL: "${API}",
};
EOF
echo "  public/workspace_env.js → ${API}"

if [ ! -f src/api/client.ts ]; then
  git fetch github cursor/model-schedule-bar-label-fix-b14b 2>/dev/null || true
  git show github/cursor/model-schedule-bar-label-fix-b14b:src/api/client.ts > src/api/client.ts
fi

# .env / build/ 는 .gitignore → GitLab CI 재빌드 시 BE_AXSTUDIO 상수를 직접 교체 (가장 확실)
python3 - <<PY
import re
from pathlib import Path
api = "${API}"
p = Path("src/api/client.ts")
t = p.read_text(encoding="utf-8")
t2, n = re.subn(
    r"export const BE_AXSTUDIO = '[^']*'",
    f"export const BE_AXSTUDIO = '{api}'",
    t,
    count=1,
)
if n != 1:
    raise SystemExit("BE_AXSTUDIO replace failed — client.ts 확인")
p.write_text(t2, encoding="utf-8")
print(f"  src/api/client.ts BE_AXSTUDIO → {api}")
PY

echo ""
echo "=== 확인 ==="
grep "BE_AXSTUDIO" src/api/client.ts | head -1

echo ""
echo "=== 다음 (FE pod) ==="
echo "  npm run build"
echo "  git add src/api/client.ts public/workspace_env.js"
echo "  git commit -m 'fix: FE BE URL → Worker Port' && git push origin master"
echo "  # GitLab CI 재배포 후 Ctrl+Shift+R — Network URL에 seokmin-koh 포함 확인"
echo "=== Done ==="
