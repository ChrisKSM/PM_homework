#!/bin/sh
# BE pod / Worker — Delivery Portal Variables vs .env · Portal HTTP 프로브
#   sh scripts/diagnose-delivery-portal.sh
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-delivery-portal.sh
set -e
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
echo "=== GET ${API_BASE}/delivery-portal/diagnose ==="
curl -sS "${API_BASE}/delivery-portal/diagnose" | python3 -m json.tool
