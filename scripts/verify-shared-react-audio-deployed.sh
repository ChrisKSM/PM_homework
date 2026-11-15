#!/bin/sh
# 공용 FE https://react-audio.apps.axstudio.lge.com — pod build 와 같은 번들인지
# FE pod: sh scripts/verify-shared-react-audio-deployed.sh
set -e
cd "$(dirname "$0")/.."
SHARED="${SHARED_FE_URL:-https://react-audio.apps.axstudio.lge.com}"

echo "=== 공용 react-audio vs pod build ==="
POD_BV="$(cat build/build-version.txt 2>/dev/null || echo '?')"
POD_MAIN="$(ls build/main.*.js 2>/dev/null | sed 's|.*/||' | head -1)"
REM_BV="$(curl -sf "$SHARED/build-version.txt" | tr -d '\n\r' || echo '?')"
REM_MAIN="$(curl -sf "$SHARED/index.html" | grep -oE 'main\.[a-f0-9]+\.js' | head -1 || echo '?')"

echo "  shared build-version: $REM_BV"
echo "  pod    build-version: $POD_BV"
echo "  shared main.js:       $REM_MAIN"
echo "  pod    main.js:       ${POD_MAIN:-?}"

FAIL=0
[ "$POD_BV" = "$REM_BV" ] && echo "  OK  build-version 일치" || { echo "  NG  build-version 불일치 — 공용 URL은 구 배포"; FAIL=1; }
[ -n "$POD_MAIN" ] && [ "$POD_MAIN" = "$REM_MAIN" ] && echo "  OK  main.js 일치" || { echo "  NG  main.js 불일치"; FAIL=1; }

if [ -d build ] && grep -q "릴리즈 · Epic" build/main*.js 2>/dev/null; then
  echo "  OK  pod build 에 릴리즈 탭 문자열 있음"
else
  echo "  --  pod 에 npm run build 먼저"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 공용 URL = pod 최신. /model-schedule/status 에 5탭 나와야 함."
else
  echo "❌ 지금 브라우저 URL($SHARED)은 pod/CI 최신이 아님 → 4탭만 보임 (Initiative는 구번들에 포함, 릴리즈는 이후 추가)."
  echo ""
  echo "조치 (운영 URL 기준):"
  echo "  1) master + release_* 태그 push → GitLab build-official/deploy green"
  echo "  2) react-audio.apps.axstudio.lge.com Route 가 가리키는 Deployment 가 그 이미지인지 확인 (본인 pod CI ≠ 공용 Route 일 수 있음)"
  echo "  3) 재배포 후 이 스크립트 재실행 → build-version / main.js 일치"
fi
exit "$FAIL"
