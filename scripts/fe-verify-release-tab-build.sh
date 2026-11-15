#!/bin/sh
# FE pod — 소스 vs build 산출물에 「릴리즈 · Epic」 탭 문자열 포함 여부
#   sh scripts/fe-verify-release-tab-build.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."

echo "=== source ==="
grep -n "릴리즈 · Epic" src/data/modelStatusCatalog.ts && echo "  OK  catalog source"

echo ""
echo "=== build/ (없으면 npm run build 먼저) ==="
if [ ! -d build ]; then
  echo "  NG  build/ 없음 → npm run build"
  exit 1
fi
if grep -q "릴리즈" build/main*.js 2>/dev/null; then
  echo "  OK  bundle contains 릴리즈 tab label"
else
  echo "  NG  bundle에 릴리즈 문자열 없음 → npm run build 후 재확인"
  exit 1
fi
echo "  build-version: $(cat build/build-version.txt 2>/dev/null || echo '?')"
ls -la build/main*.js 2>/dev/null | tail -1

echo ""
echo "=== URL ==="
echo "  브라우저: /model-schedule/status (검증 일정 /verification 아님)"
echo "  build-version.txt 를 FE URL에서 열어 pod 빌드와 같은 ID 인지 비교"
