#!/bin/sh
# FE pod — 모델현황/전모델일정이 패치 후에도 안 바뀔 때 (소스 / build / 공용 URL / Mongo)
#   sh scripts/diagnose-model-status-fe-overview.sh
# script-version: 2026-10-11-v3
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"
SHARED="${SHARED_FE_URL:-https://react-audio.apps.axstudio.lge.com}"
API_BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}"
FAIL=0
ng() { echo "  NG  $1"; FAIL=1; }
ok() { echo "  OK  $1"; }

echo "diagnose-model-status-fe-overview.sh version: 2026-10-11-v3"
echo ""
echo "=== 1) 소스 (pod working tree) ==="
if grep -q '2026-08-13' src/data/modelScheduleOverviewMock.ts 2>/dev/null; then
  ok "mock H7 SIT1 2026-08-13"
else
  ng "mock에 2026-08-13 없음 → fe-model-status-summary-kpi-patch.sh 재실행"
fi
if grep -q 'toFixed(1)' src/components/modelStatus/ModelIntegratedDashboard.tsx 2>/dev/null; then
  ok "KPI-1 toFixed(1) in source"
else
  ng "KPI-1 소수 1자리 코드 없음"
fi
if [ -f src/utils/modelStatusDisabled.ts ]; then
  ok "modelStatusDisabled.ts exists"
else
  ng "modelStatusDisabled.ts 없음 (status 하얀 화면 위험)"
fi

echo ""
echo "=== 2) production build (pod build/) ==="
if ! ls build/main.*.js >/dev/null 2>&1; then
  ng "build/main.*.js 없음 → npm run build"
else
  MAIN=$(ls build/main.*.js | head -1)
  BV=$(cat build/build-version.txt 2>/dev/null || echo '?')
  echo "  build-version: $BV"
  echo "  main: $(basename "$MAIN")"
  grep -q '2026-08-13' "$MAIN" && ok "bundle에 SIT1 날짜 2026-08-13" || ng "bundle에 2026-08-13 없음 (mock 미포함 build)"
  grep -q 'toFixed(1)' "$MAIN" && ok "bundle에 KPI toFixed(1)" || ng "bundle에 toFixed(1) 없음"
fi

echo ""
echo "=== 3) 공용 FE URL (브라우저가 실제로 받는 번들) ==="
REM_BV=$(curl -sf --connect-timeout 6 "$SHARED/build-version.txt" 2>/dev/null | tr -d '\n\r' || echo '?')
REM_MAIN=$(curl -sf --connect-timeout 6 "$SHARED/index.html" 2>/dev/null | grep -oE 'main\.[a-f0-9]+\.js' | head -1 || echo '?')
echo "  shared build-version: $REM_BV"
echo "  shared main.js:       $REM_MAIN"
POD_BV=$(cat build/build-version.txt 2>/dev/null || echo '?')
POD_MAIN=$(ls build/main.*.js 2>/dev/null | sed 's|.*/||' | head -1 || echo '?')
if [ "$POD_BV" != "?" ] && [ "$REM_BV" = "$POD_BV" ]; then ok "build-version pod = shared"; else ng "build-version 불일치 — CI/Route에 pod build 미배포"; fi
if [ -n "$POD_MAIN" ] && [ "$REM_MAIN" = "$POD_MAIN" ]; then ok "main.js pod = shared"; else ng "main.js 불일치 — 브라우저는 구 번들"; fi
if [ "$REM_BV" != "$POD_BV" ] 2>/dev/null; then
  echo "  → 공용 URL ≠ pod build (정상적인 workspace 구조)"
  echo "  → 미리보기: sh scripts/preview-fe-build-in-pod.sh (포트 8888 포워드)"
  echo "  → 공용 URL 갱신: GitLab tag release_1.0.xxx push → deploy job"
fi

echo ""
echo "=== 3b) pod nginx가 build/ 를 serving 하는지 (선택) ==="
if [ -n "$POD_BV" ] && [ "$POD_BV" != "?" ]; then
  LOC_BV=$(curl -sf --connect-timeout 2 "http://127.0.0.1/build-version.txt" 2>/dev/null | tr -d '\n\r' || true)
  LOC_MAIN=$(curl -sf --connect-timeout 2 "http://127.0.0.1/index.html" 2>/dev/null | grep -oE 'main\.[a-f0-9]+\.js' | head -1 || true)
  if [ -n "$LOC_BV" ]; then
    echo "  localhost build-version: $LOC_BV"
    echo "  localhost main.js:       ${LOC_MAIN:-?}"
    if [ "$LOC_BV" = "$POD_BV" ]; then ok "localhost = pod build (이 pod Route URL 쓰면 최신)"; else ng "localhost ≠ pod build/"; fi
  else
    echo "  (127.0.0.1:80 응답 없음 — preview-fe-build-in-pod.sh 사용)"
  fi
fi

echo ""
echo "=== 4) Mongo overview (loadOverview가 mock 대신 쓰는 데이터) ==="
if [ -x scripts/check-overview-mongo-h7.sh ]; then
  API_BASE="$API_BASE" sh scripts/check-overview-mongo-h7.sh || ng "Mongo H7/H5 SIT1 check failed"
else
  ng "check-overview-mongo-h7.sh 없음 — diagnose 스크립트 GitHub v3 갱신"
fi

echo ""
echo "=== 5) 요약 ==="
echo "  · 화면 그대로 + 3번 NG → 브라우저가 react-audio.apps.axstudio.lge.com (구번들)"
echo "  · pod build 확인 → preview 8888 또는 localhost(3b) MATCH"
echo "  · 일정만 구버전 → 4번 NG 후: sh scripts/push-overview-seed-from-github.sh"
echo "  · localStorage: model-schedule-overview-data 삭제"
if [ "$FAIL" -ne 0 ]; then exit 1; fi
echo "✅ 진단 통과"
