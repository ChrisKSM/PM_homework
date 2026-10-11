#!/bin/sh
# BE pod — story-sp-kpi 파서만 갱신 (routers/model_status.py 는 건드리지 않음)
# 로컬 router 수정이 있거나 git checkout 불가할 때 사용.
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/b12f4be/scripts/patch-be-story-sp-kpi-service-only.sh" | sh
set -e
REF_SHA="${REF_SHA:-dd2494d}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF_SHA}"
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT" 2>/dev/null || { echo "NG: $ROOT 없음"; exit 1; }

if [ -f "$ROOT/config.py" ] && [ -f "$ROOT/main.py" ]; then
  :
elif [ -f scripts/lib/require-be-pod.sh ]; then
  # shellcheck source=scripts/lib/require-be-pod.sh
  . scripts/lib/require-be-pod.sh
  require_be_pod "$ROOT"
else
  echo "NG: BE pod가 아닙니다 (config.py · main.py 없음). hostname=$(hostname)"
  echo "    → **project-be-audio-*** pod 에서 실행하세요. React pod 에서는 실행 금지."
  exit 1
fi

fetch() {
  curl -fsSL -H "Cache-Control: no-cache" "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== patch-be-story-sp-kpi-service-only (${REF_SHA}) ==="
mkdir -p services
fetch backend/services/initiative_sp_kpi_service.py services/initiative_sp_kpi_service.py
fetch backend/tvjira_client.py tvjira_client.py

grep -q normalize_jira_description services/initiative_sp_kpi_service.py || {
  echo "NG: initiative_sp_kpi_service.py 에 normalize_jira_description 없음"
  exit 1
}
grep -q 'expand' tvjira_client.py || {
  echo "NG: tvjira_client.py 에 get_issue expand 없음"
  exit 1
}

if [ -f routers/model_status.py ] && grep -q 'story-sp-kpi' routers/model_status.py; then
  echo "  OK  story-sp-kpi route already in routers/model_status.py"
else
  echo "  !!  story-sp-kpi route missing — running router snippet patch"
  fetch scripts/patch-be-story-sp-kpi-router-snippet.py scripts/patch-be-story-sp-kpi-router-snippet.py
  python3 scripts/patch-be-story-sp-kpi-router-snippet.py "$ROOT"
fi

export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
PY="python3"
command -v uv >/dev/null 2>&1 && PY="uv run --frozen python"
$PY -c "
from services.initiative_sp_kpi_service import normalize_jira_description, parse_milestone_table_from_description
wiki = '||Milestone||예상 SP||\\n|M1|25|'
t, src = normalize_jira_description(wiki)
total, _ = parse_milestone_table_from_description(t)
assert total == 25.0, total
print('  OK  import + wiki parse')
"

if [ -x scripts/restart-be-route-port.sh ]; then
  sh scripts/restart-be-route-port.sh
elif [ -x /workspace/project/scripts/restart-be-route-port.sh ]; then
  sh /workspace/project/scripts/restart-be-route-port.sh
else
  echo "→ BE 재시작: sh scripts/restart-be-route-port.sh (또는 uvicorn 재기동)"
fi

echo ""
echo "curl -sG http://127.0.0.1:8000/api/model-status/initiatives/story-sp-kpi \\"
echo "  --data-urlencode model=H7_VI \\"
echo "  --data-urlencode label=SoundSuite_H7\\(VI\\) \\"
echo "  | python3 -c \"import sys,json; d=json.load(sys.stdin); i=d['byInitiative'][0]; print('planned',d.get('plannedSpTotal')); print(i.get('initiativeKey'), i.get('descriptionSource'), i.get('plannedSpFromDescription'))\""
