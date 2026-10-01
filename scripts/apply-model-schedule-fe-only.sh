#!/bin/sh
# react-audio pod — 모델 현황 FE만 적용 (client.ts / .env / Dockerfile / .gitlab-ci.yml 건드리지 않음)
#
# /workspace/project (react-audio):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/apply-model-schedule-fe-only.sh github/webpack-migration
#   npm install && npm run build
#   git add -A && git commit -m "feat: 모델 현황 v7 — 저장/로드 수정" && git push origin master

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Apply 모델 현황 FE from $REF ==="
mkdir -p src/api src/pages src/store

for f in \
  src/App.tsx \
  src/store/dashboardStore.ts \
  src/pages/ModelSchedulePage.tsx \
  src/api/modelScheduleApi.ts
do
  show "$f" > "$f"
  echo "  + $f"
done

echo ""
echo "=== 검증 ==="
ERR=0
for pair in \
  "src/App.tsx:model-schedule" \
  "src/App.tsx:ModelSchedulePage" \
  "src/store/dashboardStore.ts:model-schedule" \
  "src/pages/ModelSchedulePage.tsx:편집 완료" \
  "src/api/modelScheduleApi.ts:localStorage"
do
  file="${pair%%:*}"
  needle="${pair##*:}"
  if grep -q "$needle" "$file"; then
    echo "  OK $file ($needle)"
  else
    echo "  MISSING $needle in $file"
    ERR=1
  fi
done

if [ -f src/api/client.ts ]; then
  echo "  OK client.ts (미변경)"
fi

[ "$ERR" -eq 0 ] || exit 1

echo ""
echo "=== client.ts workspace BE 패치 (localhost:8000 연결 거부 방지) ==="
show scripts/patch-fe-client-workspace-be.sh > scripts/patch-fe-client-workspace-be.sh
chmod +x scripts/patch-fe-client-workspace-be.sh
sh scripts/patch-fe-client-workspace-be.sh

echo ""
echo "  Dockerfile / .gitlab-ci.yml 미변경"
echo "  localhost npm run dev 시 .env 예시:"
echo "    REACT_APP_API_BASE_URL=https://be-audio-test.apps.hedej.lge.com/api"
echo "  화면: 모델 현황 (/model-schedule)"
echo "  다음: npm install && npm run build  →  git push (GitLab 재배포)"
echo "=== Done ==="
