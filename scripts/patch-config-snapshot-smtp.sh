#!/bin/sh
# company config.py — Snapshot 메일 공유 SMTP 필드만 추가 (기존 Jira/Polarion 설정 유지)
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
changed = False

block = '''    # 모델 현황 Snapshot 메일 공유 (쉼표 구분)
    model_schedule_share_recipients: str = "seokmin.koh@lge.com"

    # SMTP — LGE 내부 relay (lgesmtp.lge.com:25, STARTTLS, 무인증)
    smtp_host: str = "lgesmtp.lge.com"
    smtp_port: int = 25
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "DL-webOS_PMO-AudioSWPO@lge.com"
    smtp_use_tls: bool = True
    smtp_verify_ssl: bool = False

'''

if "model_schedule_share_recipients" not in t and "smtp_host" not in t:
    needles = ["    # Polarion", "    # LLM", "    model_config"]
    inserted = False
    for needle in needles:
        if needle in t:
            t = t.replace(needle, block + needle, 1)
            inserted = True
            break
    if not inserted:
        t = t.replace("    model_config", block + "    model_config", 1)
    changed = True
    print("  + snapshot SMTP fields added to config.py")
elif "smtp_verify_ssl" not in t and "smtp_host" in t:
    t = t.replace(
        "    smtp_use_tls: bool = True\n",
        "    smtp_use_tls: bool = True\n    smtp_verify_ssl: bool = False\n",
        1,
    )
    changed = True
    print("  + smtp_verify_ssl added to config.py")

if changed:
    p.write_text(t, encoding="utf-8")
else:
    print("  config.py already has snapshot SMTP fields")
PY
