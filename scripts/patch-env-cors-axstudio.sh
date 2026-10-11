#!/bin/sh
# .env — CORS_ORIGINS 에 react-audio.apps.axstudio.lge.com 추가
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-.env}"
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"

AXSTUDIO_FE="https://react-audio.apps.axstudio.lge.com"
HEDEJ_FE="https://react-audio.apps.hedej.lge.com"
DEFAULT_CORS="http://localhost:3000,http://localhost:5173,${AXSTUDIO_FE},${HEDEJ_FE},https://workspace.hedej.lge.com,https://workspace.axstudio.lge.com"

echo "=== Patch $ENV_FILE CORS (axstudio FE) ==="

python3 <<PY
from pathlib import Path

p = Path("$ENV_FILE")
default_cors = "$DEFAULT_CORS"
lines = p.read_text(encoding="utf-8").splitlines() if p.is_file() else []
required = [
    "https://react-audio.apps.axstudio.lge.com",
    "https://react-audio.apps.hedej.lge.com",
    "https://workspace.hedej.lge.com",
    "https://workspace.axstudio.lge.com",
]

def parse_origins(val: str) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for o in val.split(","):
        o = o.strip()
        if o and o not in seen:
            seen.add(o)
            out.append(o)
    return out

origins: list[str] = []
key_idx = None
for i, line in enumerate(lines):
    if line.startswith("CORS_ORIGINS="):
        key_idx = i
        origins = parse_origins(line.split("=", 1)[1])
        break

if key_idx is None:
    lines.append(f"CORS_ORIGINS={default_cors}")
    print("  + CORS_ORIGINS (new)")
else:
    merged = list(origins)
    seen = set(origins)
    for o in required:
        if o not in seen:
            merged.append(o)
            seen.add(o)
    lines[key_idx] = "CORS_ORIGINS=" + ",".join(merged)
    if merged != origins:
        print("  ~ CORS_ORIGINS merged axstudio/hedej origins")
    else:
        print("  = CORS_ORIGINS (already includes axstudio)")

p.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
PY

echo ""
grep '^CORS_ORIGINS=' "$ENV_FILE" || true
echo "=== Done — uvicorn 재시작 필요 ==="
