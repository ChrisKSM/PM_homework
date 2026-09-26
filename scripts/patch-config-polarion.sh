#!/bin/sh
# company config.py에 Polarion 필드만 추가 (기존 설정 유지)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f config.py ]; then
  echo "Error: config.py not found"
  exit 1
fi

python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

p = Path("config.py")
t = p.read_text(encoding="utf-8")
if "polarion_pat" in t:
    print("  config.py already has polarion fields")
else:
    needle = "    # LLM"
    insert = '''    # Polarion ALM — H7/M7/W7 MR 품질 이슈 연동
    polarion_base_url: str = "https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1"
    polarion_project_key: str = "AVSWRelProjMgmt"
    polarion_pat: str = ""
    polarion_verify_ssl: bool = False

    # LLM'''
    if needle in t:
        t = t.replace(needle, insert, 1)
    else:
        t = t.replace(
            "    model_config",
            '''    polarion_base_url: str = "https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1"
    polarion_project_key: str = "AVSWRelProjMgmt"
    polarion_pat: str = ""
    polarion_verify_ssl: bool = False

    model_config''',
            1,
        )
    p.write_text(t, encoding="utf-8")
    print("  + polarion fields added to config.py")
PY
