#!/bin/sh
# pod 안 python/uvicorn 리스너 전부 스캔 — 브라우저 Route가 어느 포트를 치는지 찾기
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."

echo "=== python listen ports ==="
netstat -tlnp 2>/dev/null | grep python || ss -tlnp 2>/dev/null | grep python || echo "(netstat/ss 없음)"

echo ""
echo "=== jira/diagnose per port ==="
for p in 8000 8080 8888 5000; do
  if curl -sf "http://127.0.0.1:${p}/health" >/dev/null 2>&1; then
    line=$(curl -s "http://127.0.0.1:${p}/api/jira/diagnose" 2>/dev/null \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"ok={d.get('ok')} token={d.get('token_length')}\")" 2>/dev/null \
      || echo "parse_fail")
    echo "  port $p UP — $line"
  else
    echo "  port $p —"
  fi
done

echo ""
echo "=== 브라우저 FE가 치는 URL (참고) ==="
echo "  https://be-audio-test.apps.axstudio.lge.com/api/..."
echo ""
echo "  token=0 인 포트 = 브라우저 502 원인 후보 (플랫폼 auto-uvicorn)"
echo "  token=44 인 포트 = 수동 uvicorn (local curl OK, FE와 무관할 수 있음)"
echo ""
echo "  token=0 포트 프로세스 종료 후, token=44 설정으로 같은 포트 재기동:"
echo "    cp /workspace/project/.env /usr/app/src/.env"
echo "    # 해당 PID kill → uvicorn --port <포트> 재시작"
echo "=== Done ==="
