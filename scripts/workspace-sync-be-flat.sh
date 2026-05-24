#!/bin/sh
# be-audio-test workspace — flat 구조
# planning + quality 파일만 추가. config/jira_client/jira_service 는 건드리지 않음.
#
# BE pod (/workspace/project):
#   git fetch github webpack-migration
#   sh scripts/workspace-sync-be-flat.sh
#
# 전체 덮어쓰기(비권장): FULL_SYNC=1 sh scripts/workspace-sync-be-flat.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${1:-github/webpack-migration}"
PREFIX="backend"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' not found. Run: git fetch github webpack-migration"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Sync BE (flat) from $REF — planning+quality only ==="

mkdir -p routers services

# ── planning + quality (신규 모듈만) ───────────────────────────────────────
show "$PREFIX/routers/planning.py"            > routers/planning.py
show "$PREFIX/services/planning_service.py"   > services/planning_service.py
show "$PREFIX/routers/quality.py"             > routers/quality.py
show "$PREFIX/services/quality_service.py"    > services/quality_service.py
echo "  + routers/planning.py"
echo "  + services/planning_service.py"
echo "  + routers/quality.py"
echo "  + services/quality_service.py"

# ── FULL_SYNC=1 일 때만 기존 파일 덮어쓰기 (회사 config 깨질 수 있음) ─────
if [ "${FULL_SYNC:-0}" = "1" ]; then
  echo ""
  echo "  WARN: FULL_SYNC=1 — config.py / jira_client.py 등 덮어씀"
  for f in \
    routers/manager.py \
    routers/devteam.py \
    services/jira_service.py \
    cache.py \
    config.py \
    jira_client.py
  do
    show "$PREFIX/$f" > "$f"
    echo "  ~ $f"
  done
else
  echo ""
  echo "  SKIP config.py / jira_client.py / jira_service.py (회사 설정 유지)"
  echo "  품질 필드만 .env에 추가:"
  echo "    RESPONSE_PLAN_FIELD=customfield_10901"
fi

# report — FULL_SYNC=1 일 때만
if [ "${FULL_SYNC:-0}" = "1" ] && show "$PREFIX/routers/report.py" >/dev/null 2>&1; then
  show "$PREFIX/routers/report.py" > routers/report.py
  show "$PREFIX/services/report_service.py" > services/report_service.py
  show "$PREFIX/services/email_service.py" > services/email_service.py
  mkdir -p templates scripts k8s
  show "$PREFIX/templates/daily_report.html" > templates/daily_report.html 2>/dev/null || true
  echo "  ~ report modules"
  if show "$PREFIX/requirements.txt" >/dev/null 2>&1; then
    show "$PREFIX/requirements.txt" > requirements.txt
    pip install -r requirements.txt -q
  fi
fi

echo ""
echo "=== main.py 패치 ==="
if [ -f scripts/patch-be-main-quality.sh ]; then
  sh scripts/patch-be-main-quality.sh
fi
if [ -f scripts/patch-be-main-optional-report.sh ]; then
  sh scripts/patch-be-main-optional-report.sh
fi

echo ""
echo "=== Jira 연결 확인 ==="
echo "  curl -s http://127.0.0.1:8000/health"
echo "  curl -s http://127.0.0.1:8000/api/issues/risks  # 502면 Response body의 detail 확인"
echo "  sh scripts/verify-quality-be.sh"
echo "=== Done ==="
