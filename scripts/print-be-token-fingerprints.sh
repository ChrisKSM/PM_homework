#!/bin/sh
# Worker/dpl — Harmony·TV PAT fingerprint (값 미노출). Worker vs public diagnose 비교용.
#   sh scripts/print-be-token-fingerprints.sh
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
PY="python3"
[ -x venv/bin/python ] && PY="venv/bin/python"
"$PY" <<'PY'
from config import settings
from dej_variables import dej_get, dej_sdk_variables_available, token_fingerprint
from jira_client import _resolve_jira_token_pair
from tvjira_client import _resolve_tvjira_token_pair

print("dej_sdk_variables:", dej_sdk_variables_available())
j, js = _resolve_jira_token_pair()
t, ts = _resolve_tvjira_token_pair()
print("harmony resolved:", js, "len", len(j.strip()), "fp", token_fingerprint(j))
print("  jira_base_url:", settings.jira_base_url)
print("tv     resolved:", ts, "len", len(t.strip()), "fp", token_fingerprint(t))
print("  tvjira_base_url:", settings.tvjira_base_url)
print("")
print("variables.get only (dpl 비교):")
for key in ("JIRA_API_TOKEN", "TVJIRA_API_TOKEN", "JIRA_BASE_URL", "TVJIRA_BASE_URL"):
    v = dej_get(key)
    if key.endswith("_TOKEN"):
        print(f"  {key} len={len(v)} fp={token_fingerprint(v)}")
    else:
        print(f"  {key} len={len(v)} val={v[:60]!r}" if v else f"  {key} (empty)")
PY
