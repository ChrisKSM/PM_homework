#!/bin/sh
# oc 없이 — pod build-version 과 일치하는 FE URL 후보 탐색
# FE pod: sh scripts/find-fe-deploy-url-candidates.sh
set -e
cd "$(dirname "$0")/.."

POD_BV="$(cat build/build-version.txt 2>/dev/null || echo '')"
POD_MAIN="$(ls build/main.*.js 2>/dev/null | sed 's|.*/||' | head -1)"
USER_SLUG="${AXSTUDIO_USER:-seokmin-koh}"

# hostname: project-react-audio-seokmin-koh-deployment-...
if [ -z "$USER_SLUG" ] || [ "$USER_SLUG" = "seokmin-koh" ]; then
  H="$(hostname 2>/dev/null || true)"
  case "$H" in
    *react-audio-*-deployment-*)
      USER_SLUG="$(echo "$H" | sed -n 's/.*react-audio-\([^-]*-[^-]*\)-deployment.*/\1/p')"
      ;;
  esac
fi
[ -n "$USER_SLUG" ] || USER_SLUG="seokmin-koh"

echo "=== pod target ==="
echo "  build-version: ${POD_BV:-? (npm run build)}"
echo "  main.js:       ${POD_MAIN:-?}"
echo "  user slug:     $USER_SLUG"
echo ""

if [ -z "$POD_BV" ]; then
  echo "NG  build/build-version.txt 없음 → npm run build"
  exit 1
fi

BASE="apps.axstudio.lge.com"
CANDIDATES="
https://react-audio.apps.axstudio.lge.com
https://react-audio--80--${USER_SLUG}.${BASE}
https://react-audio--443--${USER_SLUG}.${BASE}
https://react-audio--3000--${USER_SLUG}.${BASE}
https://project-react-audio-${USER_SLUG}.${BASE}
https://react-audio-${USER_SLUG}.${BASE}
"

echo "=== URL 후보 (build-version 일치 = 본인 1.0.175 배포본) ==="
FOUND=0
for FE in $CANDIDATES; do
  BV="$(curl -sf --connect-timeout 5 "$FE/build-version.txt" 2>/dev/null | tr -d '\n\r' || true)"
  case "$BV" in
    workspace*|""|*unavailable*) BV="?" ;;
  esac
  MAIN="$(curl -sf --connect-timeout 5 "$FE/index.html" 2>/dev/null | grep -oE 'main\.[a-f0-9]+\.js' | head -1 || true)"
  REL=""
  if [ -n "$MAIN" ] && [ "$MAIN" != "?" ]; then
    REL="$(curl -sf --connect-timeout 8 "$FE/$MAIN" 2>/dev/null | grep -c '릴리즈 · Epic' | head -1 | tr -d ' \n\r' || echo 0)"
    REL="${REL:-0}"
  fi
  if [ "$BV" = "$POD_BV" ]; then
    echo "  MATCH  $FE"
    echo "         main=$MAIN  릴리즈탭문자열=$REL"
    echo "         → /model-schedule/status"
    FOUND=1
  elif [ "$BV" != "?" ]; then
    echo "  other  $FE  build-version=$BV  main=${MAIN:-?}"
  else
    echo "  skip   $FE  (no response / workspace unavailable)"
  fi
done

echo ""
if [ "$FOUND" -eq 1 ]; then
  echo "✅ MATCH URL 로 모델현황 확인. 공용 react-audio.apps.axstudio.lge.com 과 다를 수 있음."
else
  echo "❌ 후보 URL 중 pod build-version 과 일치하는 곳 없음."
  echo "   GitLab release_1.0.175 → deploy job 로그에서 Route/URL 확인."
  echo "   또는 AxStudio 워크스페이스 '앱 열기' / 담당자에게 FE Route 문의."
  echo "   공용 URL만 쓸 경우: 플랫폼에 react-audio.apps.axstudio.lge.com → image 1.0.175 rollout 요청."
fi

if [ -f .gitlab-ci.yml ]; then
  echo ""
  echo "=== .gitlab-ci.yml deploy 힌트 ==="
  grep -nE 'deploy|DEPLOYMENT|IMAGE|route|kubectl|oc ' .gitlab-ci.yml 2>/dev/null | head -25 || true
fi
