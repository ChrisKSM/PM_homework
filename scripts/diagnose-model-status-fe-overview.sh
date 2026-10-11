#!/bin/sh
# FE pod — 모델현황/전모델일정이 패치 후에도 안 바뀔 때 (소스 / build / 공용 URL / Mongo)
#   sh scripts/diagnose-model-status-fe-overview.sh
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"
SHARED="${SHARED_FE_URL:-https://react-audio.apps.axstudio.lge.com}"
API_BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}"
FAIL=0
ng() { echo "  NG  $1"; FAIL=1; }
ok() { echo "  OK  $1"; }

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

echo ""
echo "=== 4) Mongo overview (loadOverview가 mock 대신 쓰는 데이터) ==="
LOAD=$(curl -sf --connect-timeout 8 "$API_BASE/model-schedule/overview/load" 2>/dev/null || true)
if [ -z "$LOAD" ]; then
  ng "overview/load unreachable ($API_BASE) — BE/VPN 확인"
else
  echo "$LOAD" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for model in ('H7_VI', 'H5'):
    m = next((x for x in d.get('models', []) if x.get('model') == model), None)
    if not m:
        print('  NG ', model, 'not in mongo')
        continue
    sit1 = None
    for e in m.get('events') or []:
        if e.get('kind') != 'sw':
            continue
        n = (e.get('name') or '').replace(' ', '').upper()
        if 'SIT' in n and ('1' in n or n.endswith('IT1')):
            sit1 = (e.get('start'), e.get('end'))
            break
    if sit1 == ('2026-08-13', '2026-08-21'):
        print('  OK ', model, 'SIT1', sit1[0], sit1[1])
    else:
        print('  NG ', model, 'SIT1 in mongo:', sit1, '(expect 2026-08-13 2026-08-21)')
        print('       → SEED_OVERVIEW=1 로 fe 패치 또는 push-overview-seed-from-github.sh')
"
fi

echo ""
echo "=== 5) 요약 ==="
echo "  · 일정 안 바뀜 → 대부분 (4) Mongo 구데이터 또는 (3) 구 FE 번들"
echo "  · KPI 소수 → (3) 구 번들"
echo "  · status 하얀 화면 → modelStatusDisabled + ErrorBoundary 번들 + Console 확인"
if [ "$FAIL" -ne 0 ]; then exit 1; fi
echo "✅ 진단 통과"
