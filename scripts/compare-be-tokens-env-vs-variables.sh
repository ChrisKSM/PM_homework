#!/bin/sh
# Worker BE pod — .env PAT vs AxStudio variables.get (값 노출 없이 fingerprint만)
#
#   cd /workspace/project && sh scripts/compare-be-tokens-env-vs-variables.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1

PY="python3"
[ -x venv/bin/python ] && PY="venv/bin/python"

"$PY" <<'PY'
import hashlib
from pathlib import Path

def fp(val: str) -> str:
    v = (val or "").strip()
    if not v:
        return "EMPTY"
    return hashlib.sha256(v.encode()).hexdigest()[:16]


def read_dotenv(key: str) -> str:
    p = Path(".env")
    if not p.is_file():
        return ""
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


try:
    from dej_variables import dej_get, dej_sdk_variables_available
except ImportError:
    def dej_get(k: str) -> str:
        return ""

    def dej_sdk_variables_available() -> bool:
        return False

print("dej_sdk_variables:", dej_sdk_variables_available())
print("")

keys = (
    "JIRA_API_TOKEN",
    "TVJIRA_API_TOKEN",
    "JIRA_BASE_URL",
    "TVJIRA_BASE_URL",
)
any_mismatch = False
for key in keys:
    ev = read_dotenv(key)
    dv = dej_get(key)
    ef, df = fp(ev), fp(dv)
    match = ef == df and ef != "EMPTY"
    if key.endswith("_TOKEN") and ef != df:
        any_mismatch = True
    status = "OK match" if match else ("MISMATCH" if ef != "EMPTY" and df != "EMPTY" else "partial/empty")
    print(f"{key}")
    print(f"  .env fp:       {ef}  (len={len(ev.strip())})")
    print(f"  variables fp:  {df}  (len={len(dv.strip())})")
    print(f"  → {status}")
    print("")

if any_mismatch:
    print("ACTION: AxStudio Variables 의 PAT 를 Worker .env 와 동일 값으로 맞춘 뒤 Publish.")
    print("  Harmony → JIRA_API_TOKEN, TV Jira → TVJIRA_API_TOKEN (서로 다른 PAT)")
else:
    print("TOKEN fingerprint OK — TV 400 이면 TVJIRA_BASE_URL·dpl 구버전 JQL/코드 확인")
PY
