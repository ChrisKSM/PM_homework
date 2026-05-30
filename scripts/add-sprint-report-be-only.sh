#!/bin/sh
# BE — 스프린트 LLM 요약 + core dashboard API (velocity/번다운/블로커) 반영
# config.py / .env 는 LLM 필드만 패치(전체 덮어쓰기 없음)
#
# be-audio-test pod (/workspace/project):
#   git fetch github webpack-migration
#   sh scripts/add-sprint-report-be-only.sh github/webpack-migration
#   sh scripts/verify-sprint-report-be.sh
#   # uvicorn 재시작 (pod 재배포 또는 프로세스 restart)

set -e
cd "$(dirname "$0")/.."
REF="${1:-github/webpack-migration}"

if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "Error: git fetch github webpack-migration 먼저 실행"
  exit 1
fi

show() { git show "$REF:$1"; }

echo "=== Add sprint report + core dashboard BE from $REF ==="

mkdir -p routers services scripts

for f in \
  backend/routers/devteam.py:routers/devteam.py \
  backend/services/jira_service.py:services/jira_service.py \
  backend/services/sprint_report_service.py:services/sprint_report_service.py \
  backend/services/llm_client.py:services/llm_client.py \
  backend/jira_client.py:jira_client.py \
  scripts/verify-sprint-report-be.sh:scripts/verify-sprint-report-be.sh
do
  src="${f%%:*}"
  dst="${f##*:}"
  show "$src" > "$dst"
  echo "  + $dst"
done

echo ""
echo "=== config.py — LLM 설정 필드 패치 (없을 때만) ==="
python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

p = Path("config.py")
if not p.is_file():
    print("  WARN: config.py 없음 — LLM .env만 설정하세요")
    raise SystemExit(0)

text = p.read_text(encoding="utf-8")
if "llm_enabled" in text:
    print("  OK config.py (llm_enabled already present)")
else:
    block = """
    # LLM — 주간 스프린트 요약 (dej_sdk)
    llm_enabled: bool = False
    llm_model: str = "dej/gpt-5-nano"
    llm_user_id: str = ""

"""
    marker = "    model_config = SettingsConfigDict("
    if marker not in text:
        print("  WARN: model_config marker not found — config.py 수동 추가 필요")
    else:
        text = text.replace(marker, block + marker, 1)
        p.write_text(text, encoding="utf-8")
        print("  patched config.py (llm_enabled / llm_model / llm_user_id)")
PY

echo ""
echo "=== .env LLM 설정 (없을 때만 추가) ==="
touch .env 2>/dev/null || true
grep -q '^LLM_ENABLED=' .env 2>/dev/null || echo 'LLM_ENABLED=false' >> .env
grep -q '^LLM_MODEL=' .env 2>/dev/null || echo 'LLM_MODEL=dej/gpt-5-nano' >> .env
grep -q '^LLM_USER_ID=' .env 2>/dev/null || echo 'LLM_USER_ID=' >> .env
echo "  .env: LLM_ENABLED / LLM_MODEL / LLM_USER_ID 확인 (LLM 쓰려면 ENABLED=true + USER_ID)"

echo ""
echo "=== 다음 ==="
echo "  sh scripts/verify-sprint-report-be.sh"
echo "  uvicorn 재시작 후 FE에서 '요약 생성' 버튼"
echo "=== Done ==="
