#!/bin/sh
# be-audio-test pod — Polarion MR 품질만 추가. config/jira_client/.env 덮어쓰지 않음.
#
# /workspace/project (be-audio-test):
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/add-mr-quality-be-only.sh github/webpack-migration

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Add Polarion MR quality ONLY from $REF ==="
mkdir -p routers services scripts

show backend/polarion_client.py            > polarion_client.py
show backend/routers/mr_quality.py         > routers/mr_quality.py
show backend/services/mr_quality_service.py > services/mr_quality_service.py
show scripts/patch-be-main-mr-quality.sh   > scripts/patch-be-main-mr-quality.sh
show scripts/patch-config-polarion.sh      > scripts/patch-config-polarion.sh
echo "  + polarion_client.py"
echo "  + routers/mr_quality.py"
echo "  + services/mr_quality_service.py"

sh scripts/patch-be-main-mr-quality.sh
sh scripts/patch-config-polarion.sh

grep -q POLARION_BASE_URL .env 2>/dev/null || cat >> .env <<'EOF'
POLARION_BASE_URL=https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1
POLARION_PROJECT_KEY=AVSWRelProjMgmt
POLARION_PAT=
POLARION_VERIFY_SSL=false
EOF

echo ""
echo "  config.py / jira_client.py / .env 기존 값은 유지"
echo "  POLARION_PAT 를 .env 에 넣으세요"
echo "  uvicorn main:app 재시작 후:"
echo "    curl -s http://127.0.0.1:8000/api/mr/quality/ping"
echo "=== Done ==="
