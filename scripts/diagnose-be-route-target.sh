#!/bin/sh
# personal BE pod vs 공용 be-audio-test Route 대상 비교
#
# local8000 ok + external diagnose token_length:0 → 이 pod ≠ Route 대상
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."
EXT="${BE_EXT_URL:-https://be-audio-test.apps.axstudio.lge.com}"

echo "=== 이 pod ==="
echo "  hostname: $(hostname)"
echo "  cwd:      $(pwd)"

echo ""
echo "=== local 8000 / 8200 jira diagnose ==="
for p in 8000 8200; do
  if curl -sf "http://127.0.0.1:${p}/health" >/dev/null 2>&1; then
    ok=$(curl -s "http://127.0.0.1:${p}/api/jira/diagnose" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('ok'), d.get('token_length'))" 2>/dev/null || echo "? ?")
    echo "  port $p UP — ok/token_length: $ok"
  else
    echo "  port $p DOWN"
  fi
done

echo ""
echo "=== external Route ($EXT) ==="
code=$(curl -s -o /tmp/ext_jira.json -w "%{http_code}" "${EXT}/api/jira/diagnose" 2>/dev/null || echo "000")
echo "  jira/diagnose HTTP $code"
python3 -m json.tool /tmp/ext_jira.json 2>/dev/null | head -14 || cat /tmp/ext_jira.json 2>/dev/null

echo ""
echo "=== 해석 ==="
LOCAL_OK=$(curl -s http://127.0.0.1:8000/api/jira/diagnose 2>/dev/null \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok'))" 2>/dev/null || echo "false")
EXT_OK=$(python3 -c "import json; print(json.load(open('/tmp/ext_jira.json')).get('ok'))" 2>/dev/null || echo "false")

if [ "$LOCAL_OK" = "True" ] && [ "$EXT_OK" != "True" ]; then
  echo "  ⚠️  local 8000 Jira OK + pod 내부 external curl 만 실패"
  echo "     → pod 안에서 be-audio-test URL curl 은 브라우저와 **다른 경로**일 수 있음."
  echo "     → local risks 200 이면 **브라우저 FE 새로고침** 으로 확인 (이게 정답)."
  echo ""
  echo "  브라우저도 502면 FE Network 탭 Request URL 캡처 후 공유"
elif [ "$LOCAL_OK" = "True" ] && [ "$EXT_OK" = "True" ]; then
  echo "  ✅ local + external 모두 Jira OK — FE 새로고침"
else
  echo "  local8000 Jira 미해결 — sh scripts/restart-be-route-port.sh"
fi
echo "=== Done ==="
