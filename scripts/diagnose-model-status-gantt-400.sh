#!/bin/sh
# release/gantt 400/503 — 공용 BE · label · TVJIRA 진단
#   sh scripts/diagnose-model-status-gantt-400.sh
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-model-status-gantt-400.sh
set -e
BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}"

echo "=== ping (no Jira) ==="
curl -sS "${BASE}/model-status/initiatives/ping" | python3 -m json.tool 2>/dev/null | head -20

echo ""
echo "=== release/gantt (URL-encoded label) ==="
curl -sG -w "\nHTTP %{http_code}\n" "${BASE}/model-status/release/gantt" \
  --data-urlencode "model=H7_VI" \
  --data-urlencode "label=SoundSuite_H7(VI)" \
  --data-urlencode "all_initiatives=true" \
  | head -c 1200

echo ""
echo ""
echo "Tip: HTTP 503 + TVJIRA → 공용 BE Deployment에 TVJIRA_API_TOKEN"
echo "     HTTP 400 + unknown label → BE patch (model=H7_VI&label fallback)"
