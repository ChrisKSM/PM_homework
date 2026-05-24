#!/bin/sh
# be-audio-test pod (/workspace/project)에서 planning API 404 디버깅
set -e
cd "$(dirname "$0")/.."
[ -f main.py ] || cd "$(dirname "$0")/../.." 2>/dev/null || true

echo "=== 1. planning 파일 존재 ==="
for f in routers/planning.py services/planning_service.py; do
  if [ -f "$f" ]; then echo "  OK  $f"; else echo "  MISSING  $f"; fi
done

echo ""
echo "=== 2. main.py planning 등록 ==="
grep -n "planning" main.py 2>/dev/null || echo "  MISSING — main.py에 planning import/router 없음"

echo ""
echo "=== 3. jira_client get_all_board_sprints ==="
grep -n "get_all_board_sprints" jira_client.py 2>/dev/null || echo "  MISSING — jira_client.py에 메서드 추가 필요"

echo ""
echo "=== 4. 로컬 API (Pod 내부) ==="
echo -n "  /health → "
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/health 2>/dev/null || echo "fail"
echo ""
echo -n "  /api/metrics/summary → "
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/metrics/summary 2>/dev/null || echo "fail"
echo ""
echo -n "  /api/planning/ping → "
CODE=$(curl -s -o /tmp/planning_ping.json -w "%{http_code}" http://127.0.0.1:8000/api/planning/ping 2>/dev/null || echo "000")
echo "$CODE"
echo -n "  /api/planning/compliance → "
CODE=$(curl -s -o /tmp/planning_compliance.json -w "%{http_code}" http://127.0.0.1:8000/api/planning/compliance 2>/dev/null || echo "000")
echo "$CODE"
if [ "$CODE" = "200" ]; then
  head -c 200 /tmp/planning_compliance.json
  echo ""
elif [ "$CODE" = "404" ]; then
  echo "  → planning router 미등록. main.py 수정 후 uvicorn 재시작"
elif [ "$CODE" = "502" ] || [ "$CODE" = "500" ]; then
  echo "  → 서버 오류. uvicorn 로그 확인"
fi

echo ""
echo "=== 5. OpenAPI planning 태그 ==="
curl -s http://127.0.0.1:8000/openapi.json 2>/dev/null | grep -o '"/api/planning[^"]*"' | head -5 || echo "  planning 경로 없음"

echo ""
echo "=== main.py에 넣을 코드 (없을 때) ==="
cat <<'EOF'
from routers import manager, devteam, planning   # planning 추가
app.include_router(planning.router)               # 라우터 등록
EOF
