#!/bin/sh
# quality API용 — jira_client.py에 get_board_filter_jql()만 추가 (파일 전체 덮어쓰기 X)
# BE pod:
#   git fetch github webpack-migration
#   sh scripts/patch-jira-client-quality.sh

set -e
cd "$(dirname "$0")/.."

if [ ! -f jira_client.py ]; then
  echo "Error: jira_client.py not found"
  exit 1
fi

python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

p = Path("jira_client.py")
text = p.read_text(encoding="utf-8")

if "get_board_filter_jql" in text:
    print("  get_board_filter_jql already exists — skip")
    raise SystemExit(0)

method = '''
    async def get_board_filter_jql(self) -> str | None:
        """보드 filter JQL — 해당 보드 이슈만 검색할 때 사용."""
        board = await self.get(f"/rest/agile/1.0/board/{self.board_id}")
        filter_id = (board.get("filter") or {}).get("id")
        if not filter_id:
            return None
        filt = await self.get(f"/rest/api/2/filter/{filter_id}")
        jql = (filt.get("jql") or "").strip()
        return jql or None

'''

marker = "# 싱글톤"
if marker not in text:
    marker = "jira_client = JiraClient()"

if marker not in text:
    raise SystemExit("Cannot find insertion point in jira_client.py")

text = text.replace(marker, method + "\n" + marker, 1)
p.write_text(text, encoding="utf-8")
print("  added get_board_filter_jql() to jira_client.py")
PY

echo ""
echo "=== 확인 ==="
python3 -c "from jira_client import jira_client; assert hasattr(jira_client, 'get_board_filter_jql'); print('OK')" \
  || python -c "from jira_client import jira_client; assert hasattr(jira_client, 'get_board_filter_jql'); print('OK')"
