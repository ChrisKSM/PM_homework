#!/bin/sh
# 공용 be-audio-test Route — Jira env / Prefix / Variables 주입 여부 (Pod exec 불필요)
#   sh scripts/diagnose-be-public-env.sh
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-be-public-env.sh
set -e
BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}"

echo "=== Harmony /api/jira/diagnose ==="
curl -sS "${BASE}/jira/diagnose" | python3 <<'PY'
import json, sys
d = json.load(sys.stdin)
print("  hostname:", d.get("hostname"))
print("  token_length:", d.get("token_length"), "source:", d.get("token_source"))
el = d.get("env_lengths") or {}
print("  env_lengths:", {k: v for k, v in el.items() if v})
dot = d.get("dotenv_token_lengths") or {}
print("  dotenv_token_lengths:", dot)
for p in d.get("dotenv_paths") or []:
    if p.get("exists"):
        print("  dotenv exists:", p.get("path"))
if d.get("axstudio_hint"):
    print("  HINT:", d["axstudio_hint"])
if d.get("error"):
    print("  error:", d["error"][:200])
PY

echo ""
echo "=== TV /api/model-status/initiatives/ping ==="
curl -sS "${BASE}/model-status/initiatives/ping" | python3 <<'PY'
import json, sys
d = json.load(sys.stdin)
print("  pod:", (d.get("pod") or {}).get("hostname"))
tv = d.get("tvjira") or {}
print("  tvjira tokenLength:", tv.get("tokenLength"), "source:", tv.get("tokenSource"))
el = d.get("envLengths") or {}
nz = {k: v for k, v in el.items() if v}
print("  envLengths (nonzero):", nz or "(all 0)")
dot = d.get("dotenvTokenLengths") or {}
print("  dotenvTokenLengths:", dot)
PY

echo ""
echo "=== 해석 ==="
echo "  · env·dotenv 전부 0 → Variables 가 be-audio-test-dpl Pod 에 없음 → Rollout + Variables 대상 Deployment 확인"
echo "  · REACT_APP_* 만 >0 → Global Prefix 아직 적용 중 (BE Prefix 비우기 또는 BE patch)"
echo "  · JIRA>0 TV=0 → TVJIRA_API_TOKEN Variables 추가"
