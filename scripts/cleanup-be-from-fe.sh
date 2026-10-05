#!/bin/sh
# FE pod — BE apply 실수로 생긴 flat 파일 제거
# backend/ 서브폴더(모노레포 소스)는 유지
#
# react-audio FE pod (/workspace/project):
#   sh scripts/cleanup-be-from-fe.sh
#
# 제거 대상 (루트 flat BE):
#   routers/  services/  tests/test_model_schedule_share.py
#   main.py  config.py  jira_client.py  (루트에만 — backend/ 는 유지)

set -e
cd "$(dirname "$0")/.."

. "$(dirname "$0")/pod-detect.sh"

echo "=== FE pod — BE flat 파일 정리 ==="
echo "  hostname: $(hostname 2>/dev/null || echo unknown)"
echo "  cwd: $(pwd)"

if is_be_project; then
  echo "Error: BE pod입니다 — cleanup-be-from-fe.sh 가 아닙니다."
  exit 1
fi

if ! is_fe_project; then
  echo "WARN: FE 프로젝트(package.json+src)가 아닌 것 같습니다. 3초 후 계속..."
  sleep 3
fi

removed=0

rm_path() {
  p="$1"
  if [ -e "$p" ]; then
    rm -rf "$p"
    echo "  removed $p"
    removed=$((removed + 1))
  fi
}

# BE apply 가 루트에 만든 flat 구조
rm_path routers
rm_path services
rm_path tests/test_model_schedule_share.py
if [ -d tests ] && [ -z "$(ls -A tests 2>/dev/null)" ]; then
  rmdir tests 2>/dev/null && echo "  removed empty tests/" && removed=$((removed + 1)) || true
fi

# 루트 BE 단일 파일 (backend/ 서브폴더는 유지)
if [ -d src ] || [ -f package.json ]; then
  for f in main.py config.py jira_client.py polarion_client.py cache.py; do
    rm_path "$f"
  done
fi

# FE pod에서 잘못 띄운 uvicorn:8000 (선택 종료)
if command -v ss >/dev/null 2>&1; then
  PID=$(ss -tlnp 2>/dev/null | grep ':8000 ' | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
  if [ -n "$PID" ] && [ -f /proc/"$PID"/cmdline ] && tr '\0' ' ' < /proc/"$PID"/cmdline | grep -q uvicorn; then
    echo "  stopping stray uvicorn on :8000 (pid $PID)"
    kill "$PID" 2>/dev/null || true
    removed=$((removed + 1))
  fi
fi

echo ""
echo "=== 유지 확인 ==="
for f in package.json src/App.tsx backend/main.py; do
  if [ -e "$f" ]; then
    echo "  OK $f"
  else
    echo "  — $f (없음)"
  fi
done

echo ""
if [ "$removed" -eq 0 ]; then
  echo "=== Done — 제거할 BE flat 파일 없음 ==="
else
  echo "=== Done — BE flat $removed 항목 정리됨. backend/ 는 유지 ==="
fi
echo "  다음: sh scripts/apply-model-schedule-dev-recipients-fe.sh"
