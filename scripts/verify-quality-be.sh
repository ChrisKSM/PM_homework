#!/bin/sh
# be-audio-test pod — quality API 동작 확인
# 사용: sh scripts/verify-quality-be.sh [BASE_URL]
# 예: sh scripts/verify-quality-be.sh http://127.0.0.1:8000

set -e
BASE="${1:-http://127.0.0.1:8000}"

echo "=== Quality BE verify @ $BASE ==="

for path in \
  "/api/quality/ping" \
  "/api/quality/filters" \
  "/api/quality/dashboard?event=DEV&phase=1"
do
  code=$(curl -s -o /tmp/qbody.json -w "%{http_code}" "$BASE$path" || echo "000")
  echo "  $path → HTTP $code"
  if [ "$code" != "200" ]; then
    cat /tmp/qbody.json 2>/dev/null | head -c 400
    echo ""
    exit 1
  fi
done

echo "  dashboard keys:"
python3 - <<'PY' 2>/dev/null || python - <<'PY'
import json
d=json.load(open("/tmp/qbody.json"))
print("   kpi:", d.get("kpi"))
print("   meta.jiraLabel:", d.get("meta",{}).get("jiraLabel"))
PY

echo "=== OK ==="
