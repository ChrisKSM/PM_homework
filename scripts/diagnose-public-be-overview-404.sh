#!/bin/sh
# Worker pod — public be-audio-test 가 overview/load 404 인 원인 분리
#   cd /workspace/project && sh scripts/diagnose-public-be-overview-404.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1

PUBLIC="${PUBLIC_API:-https://be-audio-test.apps.axstudio.lge.com/api}"
PUBLIC_OPENAPI="${PUBLIC%/api}/openapi.json"

echo "=== 1) public OpenAPI (model-schedule paths) ==="
curl -sf "$PUBLIC_OPENAPI" | python3 -c "
import json,sys
d=json.load(sys.stdin)
paths=sorted(p for p in d.get('paths',{}) if 'model-schedule' in p)
print('paths:', paths)
print('has_overview_load:', '/api/model-schedule/overview/load' in d.get('paths',{}))
" || echo "NG  openapi fetch failed"

echo ""
echo "=== 2) public HTTP ==="
curl -sS -o /dev/null -w "overview/load → HTTP %{http_code}\n" "$PUBLIC/model-schedule/overview/load" || true
curl -sS -o /dev/null -w "load         → HTTP %{http_code}\n" "$PUBLIC/model-schedule/load" || true

echo ""
echo "=== 3) Worker flat routers/model_schedule.py (Publish 소스는 GitLab push 기준) ==="
if [ -f routers/model_schedule.py ]; then
  grep -c 'overview/load' routers/model_schedule.py | xargs -I{} echo "overview/load occurrences in local file: {}"
  wc -l routers/model_schedule.py | awk '{print "lines:", $1}'
else
  echo "NG  routers/model_schedule.py missing"
fi

if [ -f backend/routers/model_schedule.py ]; then
  echo "backend/routers/model_schedule.py overview/load:" \
    "$(grep -c 'overview/load' backend/routers/model_schedule.py || echo 0)"
fi

echo ""
echo "=== 4) git remotes (Publish = GitLab origin push, GitHub만 X) ==="
git remote -v 2>/dev/null | head -6 || echo "(no git)"
git log -1 --oneline 2>/dev/null || true
git status -sb 2>/dev/null | head -5 || true

echo ""
echo "=== 5) local uvicorn (8000) — Worker ≠ public dpl ==="
for p in 8000; do
  if curl -sf "http://127.0.0.1:${p}/health" >/dev/null 2>&1; then
    curl -s "http://127.0.0.1:${p}/openapi.json" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('local8000 overview/load:', '/api/model-schedule/overview/load' in d.get('paths',{}))
" 2>/dev/null || echo "local openapi parse failed"
    curl -sS -o /dev/null -w "local overview/load HTTP %{http_code}\n" \
      "http://127.0.0.1:${p}/api/model-schedule/overview/load" 2>/dev/null || true
    break
  else
    echo "port $p not listening"
  fi
done

echo ""
echo "=== ACTION ==="
echo "public has NO overview/* → GitLab에 overview 포함 model_schedule.py 가 없거나 Publish가 그 커밋을 안 탐."
echo "  1) sh scripts/apply-model-schedule-overview-be.sh   # 또는 deploy-model-schedule-overview-be.sh"
echo "  2) git add routers/ services/ main.py requirements.txt scripts/ …"
echo "  3) git commit && git push origin master   # AxStudio가 쓰는 GitLab 브랜치"
echo "  4) be-audio-test → Publish (버전 up) → Pipeline·앱 배포 완료"
echo "  5) re-run: sh scripts/diagnose-public-be-overview-404.sh"
