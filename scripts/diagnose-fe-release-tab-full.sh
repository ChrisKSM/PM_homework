#!/bin/sh
# FE pod — 릴리즈 탭 미노출 전체 가능성 점검 (소스 / pod build / 공용 URL 번들)
#   sh scripts/diagnose-fe-release-tab-full.sh
set -e
cd "$(dirname "$0")/.."
SHARED="${SHARED_FE_URL:-https://react-audio.apps.axstudio.lge.com}"
FAIL=0
warn() { echo "  !! $1"; FAIL=1; }
ok() { echo "  OK  $1"; }

echo "=== 1) Git / 버전 ==="
grep '"version"' package.json | head -1
git log -1 --oneline 2>/dev/null || true
git describe --tags --always 2>/dev/null || true

echo ""
echo "=== 2) 소스 — catalog 5탭 & dashboard map ==="
TAB_N="$(grep -E "^\s*\{ id:" src/data/modelStatusCatalog.ts 2>/dev/null | wc -l | tr -d ' ')"
echo "  catalog id: count = $TAB_N (기대 5)"
[ "$TAB_N" -eq 5 ] && ok "MODEL_STATUS_TABS 5개" || warn "catalog 탭 수 != 5"
grep -q "릴리즈 · Epic" src/data/modelStatusCatalog.ts && ok "릴리즈 · Epic in catalog" || warn "catalog에 릴리즈 라벨 없음"
grep -q "MODEL_STATUS_TABS.map" src/components/modelStatus/ModelIntegratedDashboard.tsx && ok "dashboard MODEL_STATUS_TABS.map" || warn "dashboard가 map 안 씀 (구버전?)"
grep -q "ModelStatusReleaseEpicGantt" src/components/modelStatus/ModelIntegratedDashboard.tsx && ok "ReleaseEpicGantt import" || warn "release 패널 미연결"

echo ""
echo "=== 3) origin/master (CI가 빌드하는 ref) ==="
if git rev-parse origin/master >/dev/null 2>&1; then
  REM_TAB="$(git show origin/master:src/data/modelStatusCatalog.ts 2>/dev/null | grep -E "^\s*\{ id:" | wc -l | tr -d ' ')"
  echo "  origin/master catalog tabs: $REM_TAB"
  git show origin/master:src/data/modelStatusCatalog.ts 2>/dev/null | grep -q "릴리즈 · Epic" && ok "origin/master catalog 릴리즈" || warn "origin/master catalog에 릴리즈 없음"
else
  warn "origin/master 없음 — git fetch 후 재실행"
fi

echo ""
echo "=== 4) pod production build ==="
if [ ! -d build ] || ! ls build/main.*.js >/dev/null 2>&1; then
  echo "  npm run build 실행 중..."
  npm run build
fi
POD_MAIN="$(ls build/main.*.js 2>/dev/null | sed 's|.*/||' | head -1)"
POD_BV="$(cat build/build-version.txt 2>/dev/null || echo '?')"
echo "  pod build-version: $POD_BV"
echo "  pod main.js:       $POD_MAIN"
POD_REL="$(grep -c "릴리즈 · Epic" build/main.*.js 2>/dev/null || echo 0)"
[ "$POD_REL" -ge 1 ] && ok "pod build 번들에 릴리즈 라벨 ($POD_REL)" || warn "pod build 번들에 릴리즈 라벨 0"

echo ""
echo "=== 5) Docker / CI가 build/ 커밋만 배포하는지 ==="
if [ -f Dockerfile ]; then
  echo "  --- Dockerfile (요약) ---"
  grep -nE 'npm run build|COPY.*build|nginx' Dockerfile | head -20
  if grep -q 'COPY.*build' Dockerfile && ! grep -q 'npm run build' Dockerfile; then
    warn "Dockerfile이 git의 build/ 만 복사 — build/ 커밋 필요"
    git ls-files 'build/main*.js' 2>/dev/null | head -3 || echo "  (git에 build/main 없음 → 이미지 build 단계 확인)"
  fi
else
  echo "  (Dockerfile 없음 — CI podman build context 확인)"
fi
[ -f .dockerignore ] && echo "  .dockerignore:" && grep -v '^#' .dockerignore | grep -v '^$' | head -15

echo ""
echo "=== 6) 공용 URL — 배포본이 pod와 같은지 + 번들 내용 ==="
REM_BV="$(curl -sf "$SHARED/build-version.txt" | tr -d '\n\r' || echo '?')"
REM_MAIN="$(curl -sf "$SHARED/index.html" | grep -oE 'main\.[a-f0-9]+\.js' | head -1 || echo '?')"
echo "  shared build-version: $REM_BV"
echo "  shared main.js:       $REM_MAIN"

if [ "$POD_BV" != "?" ] && [ "$REM_BV" != "?" ] && [ "$POD_BV" = "$REM_BV" ]; then
  ok "build-version pod = shared"
else
  warn "build-version 불일치 — 브라우저 URL ≠ pod 최신 build (Route/다른 Deployment)"
fi
if [ -n "$POD_MAIN" ] && [ "$REM_MAIN" != "?" ] && [ "$POD_MAIN" = "$REM_MAIN" ]; then
  ok "main.js 해시 pod = shared"
else
  warn "main.js 불일치 — 1.0.175 배포가 이 URL에 안 붙었을 가능성"
fi

if [ "$REM_MAIN" != "?" ]; then
  TMP="/tmp/fe-shared-main-$$.js"
  curl -sf "$SHARED/$REM_MAIN" -o "$TMP" || true
  if [ -f "$TMP" ]; then
    SH_REL="$(grep -c "릴리즈 · Epic" "$TMP" 2>/dev/null | head -1 | tr -d ' \n\r' || true)"
    SH_INIT="$(grep -c "Initiative" "$TMP" 2>/dev/null | head -1 | tr -d ' \n\r' || true)"
    SH_REL="${SH_REL:-0}"
    SH_INIT="${SH_INIT:-0}"
    echo "  shared 번들 릴리즈 · Epic: $SH_REL (0이면 4탭 UI 확정)"
    echo "  shared 번들 Initiative 문자열: $SH_INIT"
    if [ "$SH_REL" -ge 1 ] 2>/dev/null; then
      ok "공용 main.js 안에 릴리즈 탭 문자열 있음"
    else
      warn "공용 main.js에 릴리즈 없음 — 탭 안 보이는 직접 원인"
    fi
    rm -f "$TMP"
  fi
fi

echo ""
echo "=== 7) 결론 트리 ==="
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 소스·pod build·공용 URL 번들까지 릴리즈 포함. 그래도 4탭이면 브라우저 확장/다른 URL/스크린샷 경로 재확인."
else
  echo "❌ 위 NG 항목이 원인 후보:"
  echo "   A) shared main.js 릴리즈 0 → 배포 Route/이미지가 pod CI와 다름 또는 구 static"
  echo "   B) pod build 릴리즈 0 → 소스/패치 누락 (fe-model-status-release-gantt-patch.sh)"
  echo "   C) origin/master 릴리즈 없음 → push/merge 누락"
  echo "   D) Dockerfile build/ only → git add build && commit 또는 Dockerfile에 npm run build"
fi
exit "$FAIL"
