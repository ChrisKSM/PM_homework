#!/bin/sh
# 회사 BE — config/jira_client/.env 건드리지 않고 planning+quality만 추가
#
# /workspace/project (be-audio-test pod):
#   git fetch github webpack-migration
#   sh scripts/add-quality-be-only.sh github/webpack-migration
#
# 절대 덮어쓰지 않음: config.py, jira_client.py, jira_service.py, .env

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Add planning+quality ONLY (config/.env 유지) ==="

mkdir -p routers services scripts

for f in \
  backend/routers/planning.py:routers/planning.py \
  backend/services/planning_service.py:services/planning_service.py \
  backend/routers/quality.py:routers/quality.py \
  backend/services/quality_service.py:services/quality_service.py \
  scripts/patch-be-main-quality.sh:scripts/patch-be-main-quality.sh \
  scripts/patch-be-main-optional-report.sh:scripts/patch-be-main-optional-report.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  echo "  + $dst"
done

sh scripts/patch-be-main-quality.sh
[ -f scripts/patch-be-main-optional-report.sh ] && sh scripts/patch-be-main-optional-report.sh

echo ""
echo "=== 건드리지 않은 파일 ==="
echo "  config.py  jira_client.py  jira_service.py  .env"
echo ""
echo "=== .env에 한 줄만 추가 (없을 때) ==="
grep -q RESPONSE_PLAN_FIELD .env 2>/dev/null || echo 'RESPONSE_PLAN_FIELD=customfield_10901' >> .env
echo ""
echo "=== 다음: config 복구 필요 시 (sync로 덮어썼다면) ==="
echo "  git reflog | head -5"
echo "  git checkout HEAD@{1} -- config.py jira_client.py"
echo "  git push && 재배포"
echo "=== Done ==="
