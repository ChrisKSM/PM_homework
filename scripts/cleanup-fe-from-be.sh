#!/bin/sh
# BE pod에 실수로 apply-fe-safe.sh 돌려서 생긴 FE 파일 제거
# be-audio-test pod (/workspace/project):
#   sh scripts/cleanup-fe-from-be.sh
#
# BE 파일(routers/, services/, config.py, main.py)은 건드리지 않음

set -e
cd "$(dirname "$0")/.."

echo "=== BE pod — FE 파일 정리 ==="

if [ -f main.py ] || [ -d routers ]; then
  echo "  BE 프로젝트 확인 OK (main.py / routers/)"
else
  echo "  WARN: BE 프로젝트가 아닌 것 같습니다. 중단하려면 Ctrl+C"
  sleep 3
fi

# FE 전용 src/ 트리 제거 (BE flat 구조에는 src/ 불필요)
if [ -d src ]; then
  rm -rf src
  echo "  removed src/ (FE files)"
else
  echo "  src/ 없음 — 이미 정리됨"
fi

echo ""
echo "=== BE 파일 유지 확인 ==="
for f in main.py config.py jira_client.py routers/quality.py services/quality_service.py; do
  if [ -e "$f" ]; then
    echo "  OK $f"
  else
    echo "  — $f (없음)"
  fi
done

echo ""
echo "=== Done — BE만 남음. FE는 react-audio pod에서 apply-fe-safe.sh 실행 ==="
