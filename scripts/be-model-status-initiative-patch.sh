#!/bin/sh
# BE pod — 모델현황 Initiative Jira API (TVPLAT · H7 VI)
#
# curl (GitLab에 브랜치 없을 때):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/be-model-status-initiative-patch.sh" | sh
#
# git (pod에 remote 있을 때):
#   git fetch github cursor/model-schedule-bar-label-fix-b14b
#   sh scripts/be-model-status-initiative-patch.sh github/cursor/model-schedule-bar-label-fix-b14b
#
# BE 표준 port: 8000 (8200 아님)
# 이후: uvicorn 8000 재시작 → sh scripts/verify-model-status-initiative-be.sh
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"
REF="${1:-}"
BASE="${PATCH_BASE:-https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b}"

mkdir -p routers services scripts

if [ -n "$REF" ] && git rev-parse "$REF" >/dev/null 2>&1; then
  echo "=== BE Initiative patch from git $REF ==="
  show() { git show "$REF:$1"; }
  show backend/services/model_status_initiative_service.py > services/model_status_initiative_service.py
  show backend/routers/model_status.py > routers/model_status.py
  for f in \
    scripts/patch-be-main-model-status.sh \
    scripts/patch-config-initiative-fields.sh \
    scripts/verify-model-status-initiative-be.sh \
    scripts/be-model-status-initiative-patch.sh
  do
    show "$f" > "$f"
    chmod +x "$f"
  done
else
  echo "=== BE Initiative patch from raw $BASE ==="
  fetch() {
    if ! curl -fsSL "$BASE/$1" -o "$2"; then
      echo "ERROR: fetch failed — $BASE/$1" >&2
      exit 1
    fi
    echo "  + $2"
  }
  fetch backend/services/model_status_initiative_service.py services/model_status_initiative_service.py
  fetch backend/routers/model_status.py routers/model_status.py
  fetch scripts/patch-be-main-model-status.sh scripts/patch-be-main-model-status.sh
  fetch scripts/patch-config-initiative-fields.sh scripts/patch-config-initiative-fields.sh
  fetch scripts/verify-model-status-initiative-be.sh scripts/verify-model-status-initiative-be.sh
  fetch scripts/be-model-status-initiative-patch.sh scripts/be-model-status-initiative-patch.sh
  chmod +x scripts/patch-be-main-model-status.sh \
    scripts/patch-config-initiative-fields.sh \
    scripts/verify-model-status-initiative-be.sh \
    scripts/be-model-status-initiative-patch.sh
fi

# quality_service._search_all_issues 의존 — 없으면 quality 서비스만 추가 fetch
if ! grep -q '_search_all_issues' services/quality_service.py 2>/dev/null; then
  echo "WARN: services/quality_service.py 없거나 search helper 없음"
  echo "      sh scripts/add-quality-be-only.sh 또는 quality_service 배포 필요"
fi

sh scripts/patch-config-initiative-fields.sh
sh scripts/patch-be-main-model-status.sh

test -f services/model_status_initiative_service.py
test -f routers/model_status.py
grep -q 'model-status' routers/model_status.py

echo ""
echo "=== BE 파일 OK — uvicorn 재시작 후 ==="
echo "  uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo "  sh scripts/verify-model-status-initiative-be.sh"
echo "=== Done ==="
