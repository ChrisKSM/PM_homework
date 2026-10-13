#!/bin/sh
# TVPLAT Initiative custom field — config.py / .env (전체 config 덮어쓰기 없음)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -f main.py ] || cd /workspace/project 2>/dev/null || true

python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

cfg = Path("config.py")
if not cfg.is_file():
    print("  WARN: config.py 없음 — INITIATIVE_* .env 만 추가")
else:
    t = cfg.read_text(encoding="utf-8")
    block = """
    # TVPLAT Initiative (Davis InitiativePage)
    initiative_start_date_field: str = "customfield_35441"
    initiative_grouping_field: str = "customfield_35455"
    initiative_categorization_field: str = "customfield_35516"
    initiative_estimated_effort_field: str = "customfield_35454"
"""
    if "initiative_start_date_field" not in t:
        anchor = "chip_name_field:"
        if anchor in t:
            idx = t.index(anchor)
            line_end = t.index("\n", idx)
            t = t[: line_end + 1] + block + t[line_end + 1 :]
            cfg.write_text(t, encoding="utf-8")
            print("  + config.py initiative_* fields")
        else:
            print("  WARN: chip_name_field anchor 없음 — config 수동 확인")
    else:
        print("  OK config.py initiative fields")

env = Path(".env")
lines = [
    ("INITIATIVE_START_DATE_FIELD", "customfield_35441"),
    ("INITIATIVE_GROUPING_FIELD", "customfield_35455"),
    ("INITIATIVE_CATEGORIZATION_FIELD", "customfield_35516"),
    ("INITIATIVE_ESTIMATED_EFFORT_FIELD", "customfield_35454"),
]
if env.is_file():
    text = env.read_text(encoding="utf-8")
    for key, val in lines:
        if key not in text:
            text += f"\n{key}={val}\n"
            print(f"  + .env {key}")
    env.write_text(text, encoding="utf-8")
else:
    print("  WARN: .env 없음")
PY

echo "=== patch-config-initiative-fields done ==="
