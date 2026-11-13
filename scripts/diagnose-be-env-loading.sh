#!/bin/sh
# BE Pod — .env 파일 vs process env vs pydantic settings (AxStudio Variables 진단)
# Worker(project-be-audio-test-*) 와 공용(be-audio-test-dpl-*) 둘 다에서 실행해 비교.
#
#   sh scripts/diagnose-be-env-loading.sh
#   sh scripts/diagnose-be-env-loading.sh --json
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd /workspace/project 2>/dev/null || cd "$ROOT"
if [ -f backend/main.py ]; then
  cd backend
elif [ -f main.py ]; then
  :
else
  echo "NG  main.py not found (BE cwd?)" >&2
  exit 1
fi
JSON=0
[ "$1" = "--json" ] && JSON=1

HOST=$(hostname)
case "$HOST" in
  *dpl*|be-audio-test-dpl*) POD_KIND="public-deployment (Route be-audio-test.apps.*)" ;;
  *project-be-audio-test*) POD_KIND="worker-code-server (개발 Pod — Route와 별개)" ;;
  *) POD_KIND="unknown" ;;
esac

run_py() {
  PYTHONWARNINGS=ignore python3 <<'PY'
import json, os, re, socket
from pathlib import Path

try:
    from config import settings, _env_file_paths
except Exception as e:
    settings = None
    _env_file_paths = lambda: (".env",)
    cfg_err = str(e)
else:
    cfg_err = None

dot_paths = (
    Path("/usr/app/src/.env"),
    Path("/workspace/project/.env"),
    Path(".env"),
)

def token_len_in_file(path: Path, key: str) -> int:
    if not path.is_file():
        return 0
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return 0
    m = re.search(rf"^\s*{re.escape(key)}\s*=\s*(.*)$", text, re.M)
    if not m:
        return 0
    return len(m.group(1).strip().strip('"').strip("'"))

env_keys = (
    "JIRA_API_TOKEN",
    "REACT_APP_JIRA_API_TOKEN",
    "TVJIRA_API_TOKEN",
    "REACT_APP_TVJIRA_API_TOKEN",
)
env_lens = {k: len((os.getenv(k) or "").strip()) for k in env_keys}

files = []
for p in dot_paths:
    files.append({
        "path": str(p),
        "exists": p.is_file(),
        "JIRA_API_TOKEN": token_len_in_file(p, "JIRA_API_TOKEN"),
        "TVJIRA_API_TOKEN": token_len_in_file(p, "TVJIRA_API_TOKEN"),
    })

out = {
    "hostname": socket.gethostname(),
    "cwd": str(Path.cwd()),
    "config_import_error": cfg_err,
    "pydantic_env_file_paths": list(_env_file_paths()),
    "process_env_lengths": env_lens,
    "dotenv_files": files,
}
if settings is not None:
    out["settings_lengths"] = {
        "jira_api_token": len((settings.jira_api_token or "").strip()),
        "tvjira_api_token": len((settings.tvjira_api_token or "").strip()),
    }
    try:
        from jira_client import _token_source_info, jira_related_dotenv_lengths
        s, n = _token_source_info()
        out["harmony_runtime"] = {"source": s, "length": n}
        out["dotenv_token_lengths"] = jira_related_dotenv_lengths()
    except Exception as e:
        out["harmony_runtime_error"] = str(e)
    try:
        from tvjira_client import tvjira_token_source_info
        s, n = tvjira_token_source_info()
        out["tvjira_runtime"] = {"source": s, "length": n}
    except Exception as e:
        out["tvjira_runtime_error"] = str(e)

# AxStudio가 env 대신 마운트하는 경로 후보 (존재만 기록, 내용 미출력)
secret_candidates = []
for pat in (
    "/etc/secrets",
    "/var/run/secrets",
    "/mnt/secrets",
    "/opt/dej",
):
    p = Path(pat)
    if p.exists():
        secret_candidates.append({"path": pat, "is_dir": p.is_dir()})
out["secret_mount_candidates"] = secret_candidates

any_env = any(env_lens.values())
any_file = any(f["JIRA_API_TOKEN"] or f["TVJIRA_API_TOKEN"] for f in files)
if any_env or any_file:
    out["verdict"] = "tokens_present_locally"
elif "dpl" in out["hostname"] or "be-audio-test-dpl" in out["hostname"]:
    out["verdict"] = "public_pod_empty — AxStudio Variables→be-audio-test Deployment + Rollout 필요 (.env는 Git/Worker와 무관)"
else:
    out["verdict"] = "empty — /workspace/project/.env 작성 또는 Variables"

print(json.dumps(out, indent=2, ensure_ascii=False))
PY
}

if [ "$JSON" -eq 1 ]; then
  run_py
  exit 0
fi

echo "=== BE env loading diagnose ==="
echo "  hostname: $HOST"
echo "  kind:     $POD_KIND"
echo "  cwd:      $(pwd)"
echo ""

run_py | python3 <<'PY'
import json, sys
d = json.load(sys.stdin)
print("=== pydantic env_file (config._env_file_paths) ===")
for p in d.get("pydantic_env_file_paths") or []:
    print(f"  {p}")
if d.get("config_import_error"):
    print("  config import error:", d["config_import_error"])

print("")
print("=== process env (K8s / AxStudio Variables) ===")
for k, n in (d.get("process_env_lengths") or {}).items():
    mark = "OK" if n else "--"
    print(f"  [{mark}] {k}: length={n}")

print("")
print("=== .env files on disk ===")
for f in d.get("dotenv_files") or []:
    ex = "exists" if f.get("exists") else "missing"
    print(f"  {f['path']}: {ex}  JIRA={f.get('JIRA_API_TOKEN',0)} TVJIRA={f.get('TVJIRA_API_TOKEN',0)}")

rt = d.get("harmony_runtime") or {}
tv = d.get("tvjira_runtime") or {}
print("")
print("=== runtime resolution (Harmony / TV) ===")
print(f"  Harmony: source={rt.get('source')} length={rt.get('length')}")
print(f"  TV Jira: source={tv.get('source')} length={tv.get('length')}")

print("")
print("=== verdict ===")
print(" ", d.get("verdict"))

print("")
print("=== compare public Route (curl) ===")
print("  sh scripts/diagnose-be-public-env.sh")
PY
