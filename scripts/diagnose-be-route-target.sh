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
  echo "  ❌ 이 pod(local 8000)는 Jira OK — 그러나 Route는 **다른 BE**를 가리킵니다."
  echo "     pod 이름: $(hostname) (개인 workspace BE)"
  echo "     FE URL:   $EXT (공용 be-audio-test Route)"
  echo ""
  echo "  → 이 pod에서 uvicorn 재시작만으로 FE 502는 해결되지 않습니다."
  echo "  → 공용 be-audio-test Deployment에 JIRA_API_TOKEN 설정 + pod 재시작 필요"
  echo "     (OpenShift 콘솔 / 플랫폼 담당자)"
  echo "  → 또는 BE GitLab master push 로 공용 이미지 재배포 (.env/secret 포함)"
elif [ "$LOCAL_OK" = "True" ] && [ "$EXT_OK" = "True" ]; then
  echo "  ✅ local + external 모두 Jira OK — FE 새로고침"
else
  echo "  local8000 Jira 미해결 — sh scripts/restart-be-route-port.sh"
fi
echo "=== Done ==="
