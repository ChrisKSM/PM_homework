#!/bin/sh
# 공용 be-audio-test Route — Jira env / Prefix / Variables 주입 여부 (Pod exec 불필요)
#   sh scripts/diagnose-be-public-env.sh
#   API_BASE=https://be-audio-test.apps.axstudio.lge.com/api sh scripts/diagnose-be-public-env.sh
set -e
BASE="${API_BASE:-https://be-audio-test.apps.axstudio.lge.com/api}"

_jira_diagnose_py='
import json, sys
raw = sys.stdin.read().strip()
if not raw:
    print("  NG  empty response (502/503 or curl failed)")
    sys.exit(1)
try:
    d = json.loads(raw)
except json.JSONDecodeError as e:
    print("  NG  not JSON:", raw[:120].replace("\n", " "))
    sys.exit(1)
print("  hostname:", d.get("hostname"))
print("  cwd:", d.get("cwd"))
print("  token_length:", d.get("token_length"), "source:", d.get("token_source"))
print("  settings_jira:", d.get("settings_jira_api_token_length"),
      "settings_tvjira:", d.get("settings_tvjira_api_token_length"))
dej = d.get("dej_variable_lengths") or {}
print("  dej_sdk_variables:", d.get("dej_sdk_variables"))
print("  dej_variable_lengths:", dej if dej else "(all 0)")
proc = d.get("process_env_lengths") or {}
print("  process_env_lengths:", proc if proc else "(all 0)")
el = d.get("env_lengths") or {}
print("  env_lengths (merged):", el if el else "(all 0)")
nz = {k: v for k, v in el.items() if v}
if nz:
    print("  env_lengths (nonzero):", nz)
dot = d.get("dotenv_token_lengths") or {}
print("  dotenv_token_lengths:", dot)
for p in d.get("dotenv_paths") or []:
    mark = "exists" if p.get("exists") else "missing"
    print("  dotenv %s: %s" % (mark, p.get("path")))
if d.get("axstudio_hint"):
    print("  HINT:", d["axstudio_hint"])
if d.get("fix_hint"):
    print("  fix_hint:", (d.get("fix_hint") or "")[:240])
if d.get("error"):
    print("  error:", (d.get("error") or "")[:200])
print("  ok:", d.get("ok"))
'

_ping_py='
import json, sys
raw = sys.stdin.read().strip()
if not raw:
    print("  NG  empty response")
    sys.exit(1)
try:
    d = json.loads(raw)
except json.JSONDecodeError:
    print("  NG  not JSON:", raw[:120].replace("\n", " "))
    sys.exit(1)
pod = d.get("pod") or {}
print("  pod hostname:", pod.get("hostname"))
tv = d.get("tvjira") or {}
print("  tvjira tokenLength:", tv.get("tokenLength"), "source:", tv.get("tokenSource"))
el = d.get("envLengths") or {}
dej = d.get("dejVariableLengths") or {}
print("  dejSdkVariables:", d.get("dejSdkVariables"))
print("  dejVariableLengths:", dej if dej else "(all 0)")
print("  envLengths (merged):", el if el else "(all 0)")
dot = d.get("dotenvTokenLengths") or {}
print("  dotenvTokenLengths:", dot)
errs = d.get("errors") or []
if errs:
    print("  errors:", errs[:2])
'

echo "=== API_BASE ==="
echo "  $BASE"
echo ""

echo "=== Harmony GET /jira/diagnose ==="
HTTP=$(curl -sS -o /tmp/diag-jira.json -w "%{http_code}" "${BASE}/jira/diagnose" || echo "000")
echo "  HTTP $HTTP"
if [ "$HTTP" = "404" ]; then
  echo "  NG  /jira/diagnose 없음 — jira_client patch + uvicorn 재배포 필요"
elif [ "$HTTP" = "000" ] || [ "$HTTP" = "502" ] || [ "$HTTP" = "503" ]; then
  echo "  NG  Route/BE down — Deployment rollout · import main 확인"
  head -c 200 /tmp/diag-jira.json 2>/dev/null; echo ""
else
  python3 -c "$_jira_diagnose_py" < /tmp/diag-jira.json
fi

echo ""
echo "=== TV GET /model-status/initiatives/ping ==="
HTTP2=$(curl -sS -o /tmp/diag-ping.json -w "%{http_code}" "${BASE}/model-status/initiatives/ping" || echo "000")
echo "  HTTP $HTTP2"
if [ "$HTTP2" = "404" ]; then
  echo "  NG  ping 없음 — model_status router patch 필요"
elif [ "$HTTP2" = "000" ] || [ "$HTTP2" = "502" ] || [ "$HTTP2" = "503" ]; then
  head -c 200 /tmp/diag-ping.json 2>/dev/null; echo ""
else
  python3 -c "$_ping_py" < /tmp/diag-ping.json
fi

echo ""
echo "=== 해석 ==="
echo "  · env·dotenv 전부 0 → Variables 가 be-audio-test-dpl Pod 에 없음 → BE Deployment Variables + Rollout"
echo "  · REACT_APP_* 만 >0 → Global Prefix (BE Prefix 비우기 또는 REACT_APP fallback BE)"
echo "  · JIRA>0 TV=0 → TVJIRA_API_TOKEN Variables 추가"
echo "  · Worker Pod: sh scripts/diagnose-be-env-loading.sh (file vs env 비교)"
