#!/bin/sh
# FE pod — 「릴리즈 · Epic」 탭이 *브라우저*까지 배포됐는지 확인
#
#   sh scripts/verify-model-status-release-fe-deployed.sh
#
# pod build/ ≠ react-audio URL 이면: npm run build 후 git push → GitLab CI 재배포

set -e
cd "$(dirname "$0")/.."
FE_URL="${FE_URL:-https://react-audio.apps.axstudio.lge.com}"
FAIL=0

check() {
  if eval "$2"; then
    echo "  OK  $1"
  else
    echo "  NG  $1"
    FAIL=1
  fi
}

echo "=== 릴리즈 · Epic FE 배포 검증 ==="

check "modelStatusCatalog release tab" "grep -q \"릴리즈 · Epic\" src/data/modelStatusCatalog.ts"
check "getReleaseGantt in API" "grep -q getReleaseGantt src/api/modelStatusApi.ts"
check "release/gantt path" "grep -q 'release/gantt' src/api/modelStatusApi.ts"
check "dashboard renders release gantt" "grep -q ModelStatusReleaseEpicGantt src/components/modelStatus/ModelIntegratedDashboard.tsx"

if [ ! -d build ]; then
  echo "  NG  build/ 없음 → npm run build"
  FAIL=1
else
  if grep -q "릴리즈" build/main*.js 2>/dev/null; then
    echo "  OK  build bundle contains 릴리즈 tab"
  else
    echo "  NG  bundle에 릴리즈 없음 → npm run build"
    FAIL=1
  fi
  LOCAL_BV="$(cat build/build-version.txt 2>/dev/null || echo '?')"
  echo "  pod build-version: $LOCAL_BV"
fi

echo ""
echo "=== 사이트 build-version (배포본) ==="
REMOTE_BV="$(curl -sf "${FE_URL}/build-version.txt" 2>/dev/null | tr -d '\n\r' || echo '?')"
echo "  URL: ${FE_URL}/build-version.txt"
echo "  remote build-version: $REMOTE_BV"

if [ -d build ] && [ "$LOCAL_BV" != "?" ] && [ "$REMOTE_BV" != "?" ]; then
  if [ "$LOCAL_BV" = "$REMOTE_BV" ]; then
    echo "  OK  pod build = 사이트 build (배포 반영됨)"
  else
    echo "  NG  pod ≠ 사이트 — 다른 Deployment/공용 react-audio URL 일 가능성"
    FAIL=1
  fi
fi

REMOTE_MAIN="$(curl -sf "${FE_URL}/index.html" 2>/dev/null | grep -oE 'main\.[a-f0-9]+\.js' | head -1 || echo '?')"
POD_MAIN="$(ls build/main.*.js 2>/dev/null | sed 's|.*/||' | head -1)"
echo "  remote main.js: ${REMOTE_MAIN:-?}"
echo "  pod main.js:    ${POD_MAIN:-?}"
if [ -n "$REMOTE_MAIN" ] && [ -n "$POD_MAIN" ] && [ "$REMOTE_MAIN" != "$POD_MAIN" ]; then
  echo "  NG  main 해시 불일치 — 브라우저가 구번들 로드 중"
  FAIL=1
fi

echo ""
echo "  페이지: ${FE_URL}/model-schedule/status (모델현황 → H7_VI)"
echo "  탭 클릭 시 Network: .../api/model-status/release/gantt (initiatives 와 별도 1건)"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 배포 일치. 브라우저 강력 새로고침(Ctrl+Shift+R) 후 탭 확인."
else
  echo "❌ 소스/빌드는 맞아도 사이트가 구버전일 수 있음. FE pod에서:"
  echo "  npm run build"
  echo "  git add -A && git commit -m 'feat: 모델현황 릴리즈 Epic 탭' && git push origin master"
  echo "  GitLab CI green → 이 스크립트 재실행 (build-version 일치 확인)"
fi
echo "=== Done ==="
exit "$FAIL"
