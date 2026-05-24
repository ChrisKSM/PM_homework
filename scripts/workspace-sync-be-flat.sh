#!/bin/sh
# be-audio-test workspace — flat 구조 (backend/ 없이 루트에 main.py, routers/, services/)
#
# BE pod (/workspace/project)에서:
#   git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
#   git fetch github webpack-migration
#   sh scripts/workspace-sync-be-flat.sh
#
# merge --allow-unrelated-histories 불필요. GitHub backend/* → 루트 경로로 파일만 추출.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${1:-github/webpack-migration}"
PREFIX="backend"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: ref '$REF' not found. Run: git fetch github webpack-migration"
  exit 1
fi

show() {
  git show "$REF:$1"
}

echo "=== Sync BE (flat) from $REF ==="

mkdir -p routers services

# ── 신규: planning + quality ────────────────────────────────────────────────
show "$PREFIX/routers/planning.py"       > routers/planning.py
show "$PREFIX/services/planning_service.py" > services/planning_service.py
show "$PREFIX/routers/quality.py"        > routers/quality.py
show "$PREFIX/services/quality_service.py" > services/quality_service.py
echo "  + routers/planning.py"
echo "  + services/planning_service.py"
echo "  + routers/quality.py"
echo "  + services/quality_service.py"

# ── 기존 파일 덮어쓰기 (회사 Dockerfile/.gitlab-ci.yml 은 그대로) ───────────
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

# report 모듈 — 회사 repo에 없으면 선택 적용
if show "$PREFIX/routers/report.py" >/dev/null 2>&1; then
  show "$PREFIX/routers/report.py" > routers/report.py
  show "$PREFIX/services/report_service.py" > services/report_service.py
  show "$PREFIX/services/email_service.py" > services/email_service.py
  mkdir -p templates scripts k8s
  show "$PREFIX/templates/daily_report.html" > templates/daily_report.html 2>/dev/null || true
  echo "  ~ report modules (optional)"
fi

echo ""
echo "=== main.py 수동 확인 (자동 덮어쓰지 않음) ==="
echo "  from routers import manager, devteam, planning, quality"
echo "  app.include_router(planning.router)"
echo "  app.include_router(quality.router)"
echo ""
echo "현재 main.py planning/quality 등록 여부:"
grep -nE 'planning|quality' main.py 2>/dev/null || echo "  → import/router 없음 — main.py 편집 필요"
echo ""
echo "=== .env 확인 ==="
echo "  ACCEPTANCE_CRITERIA_FIELD=customfield_19604"
echo "  DOD_FIELD=customfield_18874"
echo "  PRIORITY_RATIONALE_FIELD=customfield_13449"
echo "  RESPONSE_PLAN_FIELD=customfield_10901"
echo ""
echo "=== 실행 ==="
echo "  uv sync   # 또는 pip install -r requirements.txt"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo "=== Done ==="
