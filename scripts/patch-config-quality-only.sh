#!/bin/sh
# 회사 config.py에 quality 필드 + .env 로딩만 최소 패치 (전체 덮어쓰기 X)
# 사용: sh scripts/patch-config-quality-only.sh
set -e
cd "$(dirname "$0")/.."

python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

p = Path("config.py")
if not p.is_file():
    raise SystemExit("config.py not found")

text = p.read_text(encoding="utf-8")
changed = False

# quality 필드
if "response_plan_field" not in text:
    anchor = "priority_rationale_field"
    if anchor in text:
        insert = '''
    # 품질 이슈
    response_plan_field: str = "customfield_10901"
    response_action_field: str = ""
    quality_project_key: str = ""
    risk_priorities: str = "P0,P1,P2"
'''
        # after priority_rationale_field line
        lines = text.splitlines(keepends=True)
        out = []
        for line in lines:
            out.append(line)
            if "priority_rationale_field" in line and insert.strip() not in text:
                out.append(insert)
        text = "".join(out)
        changed = True

# env_ignore_empty
if "env_ignore_empty" not in text and "SettingsConfigDict" in text:
    text = text.replace(
        "extra=\"ignore\",",
        "env_ignore_empty=True,\n        extra=\"ignore\",",
    )
    changed = True

# /usr/app/src/.env 경로
if "/usr/app/src/.env" not in text and "_env_file_paths" in text:
    text = text.replace(
        'Path(".env"), Path("/workspace/project/.env")',
        'Path("/usr/app/src/.env"), Path("/workspace/project/.env"), Path(".env")',
    )
    changed = True
elif "/usr/app/src/.env" not in text and "env_file" in text and "model_config" in text:
    pass  # 회사 config 구조 다르면 수동

if changed:
    p.write_text(text, encoding="utf-8")
    print("patched config.py (quality fields + env loading)")
else:
    print("config.py already patched or manual edit needed")
PY

python3 -c "from config import settings; print('token len:', len((settings.jira_api_token or '').strip()))" \
  || python -c "from config import settings; print('token len:', len((settings.jira_api_token or '').strip()))"
