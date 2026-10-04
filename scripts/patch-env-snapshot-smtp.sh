#!/bin/sh
# .env — Snapshot 메일용 SMTP 항목 개별 추가 (SMTP_FROM만 있어도 HOST 등 보완)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-.env}"
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"

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

echo "=== Patch $ENV_FILE for Snapshot SMTP ==="

ensure_kv SMTP_HOST "lgesmtp.lge.com"
ensure_kv SMTP_PORT "25"
ensure_kv SMTP_USER ""
ensure_kv SMTP_PASSWORD ""
ensure_kv SMTP_FROM "DL-webOS_PMO-AudioSWPO@lge.com"
ensure_kv SMTP_USE_TLS "true"
ensure_kv SMTP_VERIFY_SSL "false"
ensure_kv MODEL_SCHEDULE_SHARE_RECIPIENTS "seokmin.koh@lge.com"

echo ""
echo "Current SMTP / MODEL_SCHEDULE:"
grep -E '^SMTP_|^MODEL_SCHEDULE' "$ENV_FILE" || true
echo "=== Done ==="
