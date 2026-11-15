#!/bin/sh
# BE — 외부 Route가 여러 pod 를 돌리며 TVJIRA 가 다른 replica 에만 있는지 확인
#   sh scripts/diagnose-be-replica-token.sh
set -e
URL="${1:-https://be-audio-test.apps.axstudio.lge.com/api/model-status/initiatives/ping}"
echo "=== ping $URL (10회 — hostname·tokenLength) ==="
i=1
while [ "$i" -le 10 ]; do
  curl -sf "$URL" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
tv=d.get('tvjira') or {}
pod=d.get('pod') or {}
print(f\"  {pod.get('hostname','?')}  tokenLength={tv.get('tokenLength')}  source={tv.get('tokenSource')}\")
" || echo "  request $i failed"
  i=$((i + 1))
done
echo ""
echo "hostname 이 여러 개이거나 tokenLength 가 0/44 섞이면 → replica .env 불일치"
echo "조치: AX Studio Deployment Variables 에 TVJIRA_API_TOKEN 설정 후 rollout restart (모든 pod)"
