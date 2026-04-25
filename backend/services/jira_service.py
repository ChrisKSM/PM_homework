import httpx
import os
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

JIRA_BASE_URL = os.getenv("JIRA_BASE_URL", "").rstrip("/")
JIRA_EMAIL = os.getenv("JIRA_EMAIL", "")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")

HEADERS = {"Accept": "application/json", "Content-Type": "application/json"}
AUTH = (JIRA_EMAIL, JIRA_API_TOKEN)
TIMEOUT = 60


async def fetch_projects() -> list:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{JIRA_BASE_URL}/rest/api/3/project", auth=AUTH, headers=HEADERS)
        r.raise_for_status()
        return r.json()


async def fetch_boards(project_key: str) -> list:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{JIRA_BASE_URL}/rest/agile/1.0/board",
            params={"projectKeyOrId": project_key},
            auth=AUTH, headers=HEADERS
        )
        r.raise_for_status()
        return r.json().get("values", [])


async def fetch_sprints(board_id: int, state: Optional[str] = None) -> list:
    params = {"maxResults": 50}
    if state:
        params["state"] = state
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{JIRA_BASE_URL}/rest/agile/1.0/board/{board_id}/sprint",
            params=params, auth=AUTH, headers=HEADERS
        )
        r.raise_for_status()
        return r.json().get("values", [])


async def fetch_sprint_issues(sprint_id: int) -> list:
    all_issues = []
    start = 0
    batch = 100
    fields = (
        "summary,status,assignee,priority,issuetype,parent,subtasks,"
        "customfield_10016,customfield_10028,customfield_10014,"
        "created,updated,duedate,labels,components,"
        "timespent,timeoriginalestimate,timeestimate,description"
    )
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        while True:
            r = await client.get(
                f"{JIRA_BASE_URL}/rest/agile/1.0/sprint/{sprint_id}/issue",
                params={"startAt": start, "maxResults": batch, "fields": fields},
                auth=AUTH, headers=HEADERS
            )
            r.raise_for_status()
            data = r.json()
            issues = data.get("issues", [])
            all_issues.extend(issues)
            if start + batch >= data.get("total", 0):
                break
            start += batch
    return all_issues


async def fetch_epics(project_key: str) -> list:
    jql = f'project = "{project_key}" AND issuetype = Epic ORDER BY created DESC'
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{JIRA_BASE_URL}/rest/api/3/search",
            params={"jql": jql, "maxResults": 100,
                    "fields": "summary,status,assignee,priority,duedate,customfield_10014"},
            auth=AUTH, headers=HEADERS
        )
        r.raise_for_status()
        return r.json().get("issues", [])


async def fetch_board_issues_by_jql(project_key: str, extra_jql: str = "") -> list:
    jql = f'project = "{project_key}"'
    if extra_jql:
        jql += f" AND {extra_jql}"
    all_issues = []
    start = 0
    batch = 100
    fields = "summary,status,assignee,priority,issuetype,parent,subtasks,customfield_10016,customfield_10028,created,updated,duedate,labels,components,timespent,timeoriginalestimate,timeestimate"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        while True:
            r = await client.get(
                f"{JIRA_BASE_URL}/rest/api/3/search",
                params={"jql": jql, "startAt": start, "maxResults": batch, "fields": fields},
                auth=AUTH, headers=HEADERS
            )
            r.raise_for_status()
            data = r.json()
            issues = data.get("issues", [])
            all_issues.extend(issues)
            if start + batch >= data.get("total", 0):
                break
            start += batch
    return all_issues


def normalize_issue(issue: dict) -> dict:
    fields = issue.get("fields", {})
    story_points = (
        fields.get("customfield_10016") or
        fields.get("customfield_10028") or
        fields.get("story_points") or 0
    )
    parent = fields.get("parent") or {}
    assignee = fields.get("assignee") or {}
    priority = fields.get("priority") or {}
    issuetype = fields.get("issuetype") or {}
    status = fields.get("status") or {}
    status_category = status.get("statusCategory") or {}

    return {
        "key": issue.get("key", ""),
        "id": issue.get("id", ""),
        "summary": fields.get("summary", ""),
        "status": status.get("name", ""),
        "status_category": status_category.get("key", ""),
        "status_color": status_category.get("colorName", ""),
        "assignee": assignee.get("displayName", "Unassigned"),
        "assignee_avatar": (assignee.get("avatarUrls") or {}).get("48x48", ""),
        "priority": priority.get("name", "Medium"),
        "issue_type": issuetype.get("name", "Story"),
        "issue_type_icon": issuetype.get("iconUrl", ""),
        "story_points": float(story_points) if story_points else 0.0,
        "parent_key": parent.get("key"),
        "parent_summary": (parent.get("fields") or {}).get("summary", ""),
        "subtasks": [s.get("key") for s in fields.get("subtasks", [])],
        "created": fields.get("created"),
        "updated": fields.get("updated"),
        "due_date": fields.get("duedate"),
        "labels": fields.get("labels", []),
        "components": [c.get("name") for c in (fields.get("components") or [])],
        "time_spent": fields.get("timespent"),
        "time_estimate": fields.get("timeestimate"),
        "time_original_estimate": fields.get("timeoriginalestimate"),
    }


def build_wbs_tree(issues: list) -> list:
    """Epic -> Story -> Sub-task 계층 구조 WBS 트리 생성"""
    issue_map = {i["key"]: i for i in issues}

    # 타입별 분류
    epics = [i for i in issues if i["issue_type"] == "Epic"]
    stories = [i for i in issues if i["issue_type"] in ("Story", "Task")]
    subtasks = [i for i in issues if i["issue_type"] in ("Sub-task", "Subtask")]
    bugs = [i for i in issues if i["issue_type"] == "Bug"]

    def calc_progress(children: list) -> float:
        if not children:
            return 0.0
        done = sum(1 for c in children if c["status_category"] == "done")
        return round((done / len(children)) * 100, 1)

    def make_node(issue: dict, depth: int, children: list) -> dict:
        progress = calc_progress(children) if children else (
            100.0 if issue["status_category"] == "done" else 0.0
        )
        return {
            "id": issue["id"],
            "key": issue["key"],
            "summary": issue["summary"],
            "issue_type": issue["issue_type"],
            "status": issue["status"],
            "status_category": issue["status_category"],
            "assignee": issue["assignee"],
            "story_points": issue["story_points"],
            "priority": issue["priority"],
            "children": children,
            "depth": depth,
            "progress": progress,
        }

    # Sub-task -> Story 매핑
    story_subtask_map: dict[str, list] = {}
    for st in subtasks + bugs:
        pk = st.get("parent_key")
        if pk:
            story_subtask_map.setdefault(pk, []).append(st)

    # Story -> Epic 매핑
    epic_story_map: dict[str, list] = {}
    for s in stories:
        pk = s.get("parent_key")
        if pk:
            epic_story_map.setdefault(pk, []).append(s)

    tree = []
    assigned_stories = set()
    assigned_epics = set()

    for epic in epics:
        assigned_epics.add(epic["key"])
        story_nodes = []
        for story in epic_story_map.get(epic["key"], []):
            assigned_stories.add(story["key"])
            st_nodes = [
                make_node(st, 2, [])
                for st in story_subtask_map.get(story["key"], [])
            ]
            story_nodes.append(make_node(story, 1, st_nodes))
        tree.append(make_node(epic, 0, story_nodes))

    # 에픽 없는 스토리
    orphan_stories = [s for s in stories if s["key"] not in assigned_stories]
    if orphan_stories:
        orphan_nodes = []
        for story in orphan_stories:
            st_nodes = [make_node(st, 2, []) for st in story_subtask_map.get(story["key"], [])]
            orphan_nodes.append(make_node(story, 1, st_nodes))
        tree.append({
            "id": "orphan-epic",
            "key": "NO-EPIC",
            "summary": "Epic 미지정 이슈",
            "issue_type": "Epic",
            "status": "",
            "status_category": "new",
            "assignee": "",
            "story_points": 0,
            "priority": "Medium",
            "children": orphan_nodes,
            "depth": 0,
            "progress": calc_progress(orphan_nodes),
        })

    return tree


def compute_sprint_stats(sprint: dict, issues: list) -> dict:
    total = len(issues)
    done = sum(1 for i in issues if i["status_category"] == "done")
    in_progress = sum(1 for i in issues if i["status_category"] == "indeterminate")
    todo = total - done - in_progress

    total_sp = sum(i.get("story_points") or 0 for i in issues)
    done_sp = sum(i.get("story_points") or 0 for i in issues if i["status_category"] == "done")

    by_type: dict = {}
    by_priority: dict = {}
    by_assignee: dict = {}
    for i in issues:
        by_type[i["issue_type"]] = by_type.get(i["issue_type"], 0) + 1
        by_priority[i["priority"]] = by_priority.get(i["priority"], 0) + 1
        by_assignee[i["assignee"]] = by_assignee.get(i["assignee"], 0) + 1

    return {
        "sprint": sprint,
        "total_issues": total,
        "done_count": done,
        "in_progress_count": in_progress,
        "todo_count": todo,
        "total_story_points": total_sp,
        "done_story_points": done_sp,
        "completion_rate": round((done / total) * 100, 1) if total else 0,
        "sp_completion_rate": round((done_sp / total_sp) * 100, 1) if total_sp else 0,
        "issues_by_type": by_type,
        "issues_by_priority": by_priority,
        "issues_by_assignee": by_assignee,
        "bugs_count": by_type.get("Bug", 0),
        "unassigned_count": by_assignee.get("Unassigned", 0),
    }
