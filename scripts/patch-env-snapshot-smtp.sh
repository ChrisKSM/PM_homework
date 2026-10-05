#!/bin/sh
# .env — Snapshot 메일용 SMTP 항목 개별 추가 + 붙어 있는 줄 분리
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-.env}"
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"

echo "=== Patch $ENV_FILE for Snapshot SMTP ==="

# SMTP_FROM=...@lge.comSMTP_HOST=... 처럼 한 줄에 붙은 경우 분리
python3 <<PY
import re
from pathlib import Path

p = Path("$ENV_FILE")
t = p.read_text(encoding="utf-8")
orig = t

# DL...@lge.com 뒤에 바로 SMTP_ 키가 붙은 패턴
t = re.sub(
    r"(SMTP_FROM=([^\s#]+?)(?=SMTP_[A-Z_]+=))",
    lambda m: f"SMTP_FROM={m.group(2).rstrip()}\n",
    t,
)
# 일반 KEY=valKEY2= 패턴 (SMTP 관련)
t = re.sub(
    r"^(SMTP_[A-Z_]+)=([^\n#]+?)(SMTP_[A-Z_]+=)",
    r"\1=\2\n\3",
    t,
    flags=re.M,
)

if t != orig:
    p.write_text(t, encoding="utf-8")
    print("  fixed concatenated SMTP lines in .env")
PY

ensure_kv() {
  key="$1"
  val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    echo "  = $key (already set)"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
    echo "  + $key=${val}"
  fi
}

# 빈 SMTP_HOST= 줄이 기본값을 덮어쓰지 않도록 제거 후 재설정
if grep -q '^SMTP_HOST=$' "$ENV_FILE" 2>/dev/null; then
  sed -i '/^SMTP_HOST=$/d' "$ENV_FILE"
  echo "  - removed empty SMTP_HOST="
fi
ensure_kv SMTP_HOST "lgesmtp.lge.com"
ensure_kv SMTP_PORT "25"
ensure_kv SMTP_USER ""
ensure_kv SMTP_PASSWORD ""
ensure_kv SMTP_FROM "DL-webOS_PMO-AudioSWPO@lge.com"
ensure_kv SMTP_USE_TLS "true"
ensure_kv SMTP_VERIFY_SSL "false"
ensure_kv MODEL_SCHEDULE_SHARE_DQA_RECIPIENTS "rokyung.kim@lge.com,seunghwa.kim@lge.com,haengmo.jin@lge.com"
ensure_kv MODEL_SCHEDULE_SHARE_DEV_RECIPIENTS "seokmin.koh@lge.com,hyunja.kim@lge.com,sungyeon.cho@lge.com,hongsoon.lee@lge.com,yoonkyu.park@lge.com,jejun.oh@lge.com,sh12.park@lge.com,taeksu.la@lge.com,yongseung.cho@lge.com,maeul.lee@lge.com,pilkyu.yoon@lge.com,jaecheol.lee@lge.com"
ensure_kv MODEL_SCHEDULE_SHARE_RECIPIENTS "seokmin.koh@lge.com"

echo ""
echo "Current SMTP / MODEL_SCHEDULE:"
grep -E '^SMTP_|^MODEL_SCHEDULE' "$ENV_FILE" || true
echo "=== Done ==="
