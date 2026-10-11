#!/bin/sh
# FE pod — 요약 탭 타임라인 + SP KPI 문자열이 build 번들에 포함됐는지
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"

echo "=== verify model-status summary FE ==="
test -f build/main.*.js 2>/dev/null || ls build/main.*.js >/dev/null 2>&1 || {
  echo "NG  npm run build 먼저"
  exit 1
}

MAIN=$(ls build/main.*.js 2>/dev/null | head -1)
CHUNK=$(ls build/*.js 2>/dev/null | head -5)

ok=0
for needle in ModelStatusOverviewEventTimeline buildOverviewEventsTimeline getStorySpKpi worklogSp SP26; do
  if grep -q "$needle" $MAIN build/*.js 2>/dev/null; then
    echo "OK  bundle contains: $needle"
    ok=$((ok + 1))
  else
    echo "NG  missing in bundle: $needle"
  fi
done

echo "build-version: $(cat build/build-version.txt 2>/dev/null || echo '?')"
echo "main: $MAIN"

if [ "$ok" -lt 3 ]; then
  echo "NG  sh scripts/fe-model-status-summary-kpi-patch.sh 후 npm run build"
  exit 1
fi
echo "✅ source/build OK — 브라우저는 Route/공용 URL 번들도 확인 (verify-shared-react-audio-deployed.sh)"
