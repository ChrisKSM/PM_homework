#!/bin/sh
# Worker — PRD API discover kwarg 502 수정 → GitLab push → public curl
#
#   curl -fsSL ".../publish-be-prd-worker-to-gitlab.sh" | sh
#   curl -fsSL ".../publish-be-prd-worker-to-gitlab.sh" | YES=1 sh
#
set -e
cd /workspace/project 2>/dev/null || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
PUBLIC="${PUBLIC_API:-https://be-audio-test.apps.axstudio.lge.com/api}"

rm -f .git/packed-refs.lock 2>/dev/null || true

echo "=== 1) GitHub patch (model_status_prd_service + router) ==="
curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts/patch-be-model-status-prd-from-github.sh" | REF="$REF" sh

echo ""
echo "=== 2) discover 파라미터 확인 ==="
python3 -c "
import inspect
import sys
sys.path.insert(0, '.')
from services.model_status_prd_service import get_prd_for_model
sig = inspect.signature(get_prd_for_model)
assert 'discover' in sig.parameters, 'discover missing in get_prd_for_model'
print('  OK  get_prd_for_model has discover=', sig.parameters['discover'].default)
"

echo ""
echo "=== 3) local GET /model-status/prd?model=H7_VI ==="
CODE=$(curl -sS -o /tmp/prd-local.json -w "%{http_code}" \
  "http://127.0.0.1:8000/api/model-status/prd?model=H7_VI&probe=true" || echo "000")
echo "  HTTP $CODE"
python3 -c "
import json
try:
    d=json.load(open('/tmp/prd-local.json'))
    if 'detail' in d and 'unexpected keyword' in str(d.get('detail','')):
        print('  NG  still unexpected keyword — prd_service not updated')
    elif d.get('detail'):
        print('  detail:', str(d.get('detail'))[:120])
    else:
        print('  ok keys:', list(d.keys())[:8])
except Exception as e:
    print('  body parse:', e)
"

if [ "${YES:-}" = "1" ]; then
  echo ""
  echo "=== 4) git push origin master ==="
  git add services/model_status_prd_service.py services/model_status_prd_labels.py \
    services/model_status_prd_status.py services/model_status_sprint_service.py \
    services/model_status_sprint_worklog.py services/initiative_sp_kpi_service.py \
    routers/model_status.py config.py polarion_client.py tvjira_client.py scripts/ tests/ 2>/dev/null || true
  git add -u services/ routers/ 2>/dev/null || true
  if git diff --cached --quiet; then
    echo "  nothing to commit"
  else
    git commit -m "fix(be): model-status PRD get_prd_for_model discover kwarg"
  fi
  git push origin master
  echo "  → be-audio-test Publish (버전 up) 후 public 재확인"
fi

echo ""
echo "=== 5) public (Publish 전 unexpected keyword 가능) ==="
curl -sS -o /tmp/prd-pub.json -w "  public HTTP %{http_code}\n" \
  "${PUBLIC}/model-status/prd?model=H7_VI&probe=true" || true
python3 -c "
import json
try:
    d=json.load(open('/tmp/prd-pub.json'))
    det=str(d.get('detail',''))
    if 'unexpected keyword' in det:
        print('  NG  public 구버전 prd_service — YES=1 push + Publish 필요')
    elif det:
        print('  detail:', det[:150])
    else:
        print('  OK  public PRD response (Polarion/PAT 설정에 따라 items 비어 있을 수 있음)')
except Exception as e:
    print('  parse:', e)
"
