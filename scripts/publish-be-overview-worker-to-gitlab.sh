#!/bin/sh
# Worker pod (be-audio-test) — overview BE 로컬 검증 → GitLab push → public OpenAPI 진단
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/publish-be-overview-worker-to-gitlab.sh" | sh
#
# commit + push 까지:
#   curl -fsSL ".../publish-be-overview-worker-to-gitlab.sh" | YES=1 sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1

REF="${REF:-github/cursor/model-schedule-bar-label-fix-b14b}"
PUBLIC="${PUBLIC_API:-https://be-audio-test.apps.axstudio.lge.com/api}"

rm -f .git/packed-refs.lock 2>/dev/null || true

echo "=== A) overview 코드 여부 (routers/model_schedule.py) ==="
if [ ! -f routers/model_schedule.py ]; then
  echo "NG  routers/model_schedule.py 없음 — 먼저 apply-model-schedule-overview-be.sh 실행"
  exit 1
fi
OV=$(grep -c 'overview/load' routers/model_schedule.py || echo 0)
LINES=$(wc -l < routers/model_schedule.py)
echo "  overview/load grep: $OV  lines: $LINES"
if [ "$OV" -lt 1 ] || [ "$LINES" -lt 200 ]; then
  echo "NG  overview 미적용 — GitHub에서 apply 실행:"
  echo "  git fetch github cursor/model-schedule-bar-label-fix-b14b"
  echo "  sh scripts/apply-model-schedule-overview-be.sh $REF"
  exit 1
fi

echo ""
echo "=== B) uvicorn 재시작 + local OpenAPI ==="
if [ -x scripts/be-restart-uvicorn-standalone.sh ]; then
  sh scripts/be-restart-uvicorn-standalone.sh
else
  echo "WARN  be-restart-uvicorn-standalone.sh 없음 — 수동 uvicorn 8000"
fi

sleep 2
if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  curl -s http://127.0.0.1:8000/openapi.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
paths=sorted(p for p in d.get('paths',{}) if 'model-schedule' in p)
print('  local paths:', paths)
print('  local has overview/load:', '/api/model-schedule/overview/load' in d.get('paths',{}))
"
  curl -sS -o /dev/null -w "  local GET overview/load → HTTP %{http_code}\n" \
    http://127.0.0.1:8000/api/model-schedule/overview/load || true
else
  echo "NG  port 8000 not listening — /tmp/uvicorn-8000.log 확인"
fi

echo ""
echo "=== C) GitLab origin push ==="
git remote -v 2>/dev/null | grep origin | head -2 || true
git status -sb | head -15

if [ "${YES:-}" != "1" ]; then
  echo ""
  echo "  (dry-run) commit/push 하려면:"
  echo "    YES=1 sh scripts/publish-be-overview-worker-to-gitlab.sh"
  echo "  또는 수동:"
  echo "    git add routers/ services/ config.py jira_client.py main.py requirements.txt scripts/"
  echo "    git commit -m 'feat(be): model-schedule overview API'"
  echo "    git push origin master"
else
  rm -f .git/packed-refs.lock 2>/dev/null || true
  git add routers/model_schedule.py services/ config.py jira_client.py main.py requirements.txt scripts/ 2>/dev/null || true
  git add -u routers/ services/ 2>/dev/null || true
  if git diff --cached --quiet; then
    echo "  nothing to commit (already committed?)"
  else
    git commit -m "feat(be): model-schedule overview API (load/save/sync/share)"
  fi
  git push origin master
  echo "  OK  pushed origin master — AxStudio be-audio-test Publish (버전 up) 필요"
fi

echo ""
echo "=== D) public OpenAPI (Publish 후 has_overview_load: True 기대) ==="
PUBLIC_OPENAPI="${PUBLIC%/api}/openapi.json"
curl -sf "$PUBLIC_OPENAPI" | python3 -c "
import json,sys
d=json.load(sys.stdin)
paths=sorted(p for p in d.get('paths',{}) if 'model-schedule' in p)
print('  public paths:', paths)
print('  has_overview_load:', '/api/model-schedule/overview/load' in d.get('paths',{}))
" || echo "NG  public openapi fetch failed"

curl -sS -o /dev/null -w "  public overview/load → HTTP %{http_code}\n" \
  "$PUBLIC/model-schedule/overview/load" || true
curl -sS -o /dev/null -w "  public load         → HTTP %{http_code}\n" \
  "$PUBLIC/model-schedule/load" || true

echo ""
echo "=== 다음 ==="
echo "  public has_overview_load False → be-audio-test Publish 완료까지 대기 후 이 스크립트 D 섹션만 재실행"
echo "  True + overview 502 → Mongo seed: API_BASE=$PUBLIC sh scripts/seed-model-schedule-overview-to-db.sh"
