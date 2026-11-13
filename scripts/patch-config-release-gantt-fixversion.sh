#!/bin/sh
# config.py — release_gantt_milestone_fix_version (전체 config 덮어쓰기 없음)
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.."

python3 - <<'PY'
from pathlib import Path

cfg = Path("config.py")
field = "release_gantt_milestone_fix_version"
if not cfg.is_file():
    print("  WARN: config.py 없음 — .env RELEASE_GANTT_MILESTONE_FIX_VERSION=Audio_2025 추가")
else:
    t = cfg.read_text(encoding="utf-8")
    if field in t:
        print("  OK  config.py release_gantt_milestone_fix_version")
    else:
        block = (
            '\n    # 릴리즈 Gantt Milestone JQL fixVersion\n'
            '    release_gantt_milestone_fix_version: str = "Audio_2025"\n'
        )
        anchor = "initiative_estimated_effort_field:"
        if anchor not in t:
            anchor = "chip_name_field:"
        if anchor in t:
            idx = t.index(anchor)
            line_end = t.index("\n", idx)
            t = t[: line_end + 1] + block + t[line_end + 1 :]
            cfg.write_text(t, encoding="utf-8")
            print("  + config.py release_gantt_milestone_fix_version")
        else:
            print("  WARN: config.py anchor 없음 — 필드 수동 추가")

env = Path(".env")
if env.is_file():
    text = env.read_text(encoding="utf-8")
    if "RELEASE_GANTT_MILESTONE_FIX_VERSION" not in text:
        text += "\nRELEASE_GANTT_MILESTONE_FIX_VERSION=Audio_2025\n"
        env.write_text(text, encoding="utf-8")
        print("  + .env RELEASE_GANTT_MILESTONE_FIX_VERSION")
else:
    print("  WARN: .env 없음")
PY

echo "=== patch-config-release-gantt-fixversion done ==="
