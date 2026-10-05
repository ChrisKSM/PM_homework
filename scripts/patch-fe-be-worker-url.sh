#!/bin/sh
# react-audio FE — Worker Port BE URL 사용 (공용 be-audio-test token 없을 때)
#
# AX Studio Worker Port 예:
#   https://be-audio-test--8000--seokmin-koh.apps.axstudio.lge.com
#
#   BE_WORKER_URL=https://be-audio-test--8000--seokmin-koh.apps.axstudio.lge.com \
#     sh scripts/patch-fe-be-worker-url.sh
#   npm run build && git push origin master
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
p = Path(".env")
lines = p.read_text(encoding="utf-8").splitlines() if p.is_file() else []
out, found = [], False
for line in lines:
    if line.startswith("REACT_APP_API_BASE_URL="):
        out.append(f"REACT_APP_API_BASE_URL={API}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"REACT_APP_API_BASE_URL={API}")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"  .env REACT_APP_API_BASE_URL={API}")
PY

# runtime override (Docker entrypoint가 workspace_env.js 덮어쓸 수 있음 — .env와 병행)
mkdir -p public
cat > public/workspace_env.js <<EOF
window.workspace_env = {
  REACT_APP_API_BASE_URL: "${API}",
};
EOF
echo "  public/workspace_env.js → ${API}"

git fetch github cursor/model-schedule-bar-label-fix-b14b 2>/dev/null || true
git show github/cursor/model-schedule-bar-label-fix-b14b:src/api/client.ts > src/api/client.ts 2>/dev/null \
  || echo "  WARN: client.ts 수동 확인 — resolveApiBaseUrl override 우선"

echo ""
echo "=== 다음 (FE pod) ==="
echo "  npm run build"
echo "  git add .env public/workspace_env.js src/api/client.ts"
echo "  git commit -m 'fix: FE BE URL → Worker Port' && git push origin master"
echo "=== Done ==="
