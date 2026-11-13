#!/bin/sh
# BE pod — /api/model-status/prd 502 원인 (import · detail 본문)
set -e
cd /workspace/project 2>/dev/null || exit 1
PY="${PY:-python3}"
API="${API_BASE:-http://127.0.0.1:8000/api}/model-status/prd?model=H7_VI"

echo "=== dej_variables / polarion_client ==="
if "$PY" -c "from dej_variables import normalize_polarion_pat; from polarion_client import polarion_pat, polarion_pat_source" 2>/tmp/prd502.err; then
  echo "  OK  imports"
  "$PY" -c "from polarion_client import polarion_pat; print('  pat_len', len(polarion_pat() or ''), 'source', __import__('polarion_client').polarion_pat_source())"
else
  echo "  NG  import failed:"
  sed -n '1,8p' /tmp/prd502.err
  echo "  Fix: curl -fsSL \"https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/backend/dej_variables.py\" -o dej_variables.py"
fi

echo ""
echo "=== GET $API ==="
CODE=$(curl -s -o /tmp/prd502.json -w "%{http_code}" "$API" || echo "000")
echo "  HTTP $CODE"
if [ "$CODE" = "502" ]; then
  python3 -m json.tool < /tmp/prd502.json 2>/dev/null | head -20 || head -c 500 /tmp/prd502.json
  echo ""
fi
