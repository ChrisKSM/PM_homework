#!/bin/sh
# planning API용 — jira_client.py에 get_all_board_sprints()만 추가 (파일 전체 덮어쓰기 X)
# BE pod:
#   git fetch github webpack-migration
#   sh scripts/patch-jira-client-planning.sh

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

if "get_all_board_sprints" in text:
    print("  get_all_board_sprints already exists — skip")
    raise SystemExit(0)

method = '''
    async def get_all_board_sprints(self, max_results: int = 50) -> list[dict]:
        """보드의 active / closed / future 스프린트 전체."""
        sprints: list[dict] = []
        seen: set[int] = set()
        for state in ("active", "closed", "future"):
            data = await self.get_board_sprints(state=state, max_results=max_results)
            for sprint in data.get("values", []):
                sid = sprint.get("id")
                if sid is not None and sid not in seen:
                    seen.add(sid)
                    sprints.append(sprint)
        return sorted(sprints, key=lambda s: s.get("id", 0))

'''

marker = "# 싱글톤"
if marker not in text:
    marker = "jira_client = JiraClient()"

if marker not in text:
    raise SystemExit("Cannot find insertion point in jira_client.py")

text = text.replace(marker, method + "\n" + marker, 1)
p.write_text(text, encoding="utf-8")
print("  added get_all_board_sprints() to jira_client.py")
PY

echo ""
echo "=== 확인 ==="
python3 -c "from jira_client import jira_client; assert hasattr(jira_client, 'get_all_board_sprints'); print('OK')" \
  || python -c "from jira_client import jira_client; assert hasattr(jira_client, 'get_all_board_sprints'); print('OK')"

echo "=== planning API 재시도 ==="
echo "  curl -s http://127.0.0.1:8000/api/planning/compliance | head -c 200"
