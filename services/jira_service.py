"""
Jira 데이터 → 대시보드 지표 변환 서비스.
Frontend 9개 엔드포인트에 대응하는 데이터 로직 구현.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client

# ── 상태 분류 헬퍼 ────────────────────────────────────────────────────────────

DONE_CATEGORY = settings.done_status_category          # "done"
INPROGRESS_CATEGORY = settings.inprogress_status_category  # "indeterminate"

SP_FIELD = settings.story_points_field
EPIC_LINK_FIELD = settings.epic_link_field
EPIC_NAME_FIELD = settings.epic_name_field


def _status_category(issue: dict) -> str:
    """이슈의 상태 카테고리 키 반환 (done / indeterminate / new)."""
    return (
        issue.get("fields", {})
        .get("status", {})
        .get("statusCategory", {})
        .get("key", "new")
    )


def _sp(issue: dict) -> float:
    """이슈의 Story Point 반환 (없으면 0)."""
    return float(issue.get("fields", {}).get(SP_FIELD) or 0)


def _assignee_name(issue: dict) -> str:
    """담당자 이름 반환."""
    assignee = issue.get("fields", {}).get("assignee") or {}
    return assignee.get("displayName") or assignee.get("name") or "미배정"


def _priority_name(issue: dict) -> str:
    """우선순위 이름 반환."""
    priority = issue.get("fields", {}).get("priority") or {}
    return priority.get("name") or "Medium"


def _issue_type(issue: dict) -> str:
    """이슈 유형 이름 반환."""
    return issue.get("fields", {}).get("issuetype", {}).get("name") or "Task"


def _status_name(issue: dict) -> str:
    """상태 이름 반환."""
    return issue.get("fields", {}).get("status", {}).get("name") or "To Do"


# ── 1. 책임자 — 프로젝트 전체 KPI ────────────────────────────────────────────

@cached(ttl=300)
async def get_project_summary() -> dict[str, Any]:
    """전체 진행률, 완료 Epic/Story, 블로커 수."""
    active = await jira_client.get_active_sprint()
    if not active:
        return {
            "totalProgress": 0, "completedEpics": 0, "totalEpics": 0,
            "completedStories": 0, "totalStories": 0,
            "blockerCount": 0, "lastUpdated": datetime.utcnow().isoformat(),
        }

    sprint_id = active["id"]

    # 전체 스프린트 이슈
    data = await jira_client.get_sprint_issues(
        sprint_id,
        fields=["summary", "status", "issuetype", SP_FIELD],
    )
    issues = data.get("issues", [])

    epics = [i for i in issues if _issue_type(i) == "Epic"]
    stories = [i for i in issues if _issue_type(i) == "Story"]
    done_epics = sum(1 for i in epics if _status_category(i) == DONE_CATEGORY)
    done_stories = sum(1 for i in stories if _status_category(i) == DONE_CATEGORY)

    # SP 기준 전체 진행률
    total_sp = sum(_sp(i) for i in issues)
    done_sp = sum(_sp(i) for i in issues if _status_category(i) == DONE_CATEGORY)
    progress = round((done_sp / total_sp * 100) if total_sp else 0)

    # 블로커 이슈 수 (Blocked 상태)
    blocker_jql = f"sprint = {sprint_id} AND status = Blocked"
    blocker_data = await jira_client.search(blocker_jql, fields=["summary"], max_results=50)
    blocker_count = blocker_data.get("total", 0)

    return {
        "totalProgress": progress,
        "completedEpics": done_epics,
        "totalEpics": len(epics),
        "completedStories": done_stories,
        "totalStories": len(stories),
        "blockerCount": blocker_count,
        "lastUpdated": datetime.utcnow().isoformat(),
    }


# ── 2. 책임자 — Epic별 진행률 ─────────────────────────────────────────────────

@cached(ttl=300)
async def get_epic_progress() -> list[dict[str, Any]]:
    """Epic별 완료 / 진행중 / 미시작 Story Point 집계."""
    active = await jira_client.get_active_sprint()
    if not active:
        return []

    sprint_id = active["id"]
    data = await jira_client.get_sprint_issues(
        sprint_id,
        fields=["summary", "status", "issuetype", SP_FIELD, EPIC_LINK_FIELD, EPIC_NAME_FIELD],
    )
    issues = data.get("issues", [])

    # Epic을 제외한 이슈들을 epic link 기준으로 그룹핑
    epic_map: dict[str, dict] = {}
    for issue in issues:
        if _issue_type(issue) == "Epic":
            continue
        fields = issue.get("fields", {})
        epic_key = fields.get(EPIC_LINK_FIELD)
        if not epic_key:
            continue

        if epic_key not in epic_map:
            epic_map[epic_key] = {
                "epicKey": epic_key,
                "epicName": epic_key,  # 이름은 아래에서 채움
                "done": 0.0,
                "inProgress": 0.0,
                "todo": 0.0,
                "total": 0.0,
            }

        sp = _sp(issue)
        cat = _status_category(issue)
        if cat == DONE_CATEGORY:
            epic_map[epic_key]["done"] += sp
        elif cat == INPROGRESS_CATEGORY:
            epic_map[epic_key]["inProgress"] += sp
        else:
            epic_map[epic_key]["todo"] += sp
        epic_map[epic_key]["total"] += sp

    # Epic 이름 조회
    for epic_key, entry in epic_map.items():
        try:
            epic_issue = await jira_client.get_issue(
                epic_key, fields=["summary", EPIC_NAME_FIELD]
            )
            fields = epic_issue.get("fields", {})
            epic_name = fields.get(EPIC_NAME_FIELD) or fields.get("summary") or epic_key
            entry["epicName"] = epic_name
        except Exception:
            pass

    result = [
        {
            "epicKey": v["epicKey"],
            "epicName": v["epicName"],
            "done": int(v["done"]),
            "inProgress": int(v["inProgress"]),
            "todo": int(v["todo"]),
            "total": int(v["total"]),
        }
        for v in epic_map.values()
        if v["total"] > 0
    ]
    return sorted(result, key=lambda x: x["total"], reverse=True)


# ── 3. 책임자 — 이슈 상태 분포 ───────────────────────────────────────────────

@cached(ttl=300)
async def get_issue_distribution() -> list[dict[str, Any]]:
    """전체 스프린트 이슈를 상태 이름별로 집계."""
    active = await jira_client.get_active_sprint()
    if not active:
        return []

    data = await jira_client.get_sprint_issues(
        active["id"], fields=["status"]
    )
    issues = data.get("issues", [])

    counter: dict[str, int] = {}
    for issue in issues:
        name = _status_name(issue)
        counter[name] = counter.get(name, 0) + 1

    return [{"status": k, "count": v} for k, v in sorted(counter.items(), key=lambda x: -x[1])]


# ── 4. 책임자 — 스프린트 Velocity ────────────────────────────────────────────

@cached(ttl=600)
async def get_velocity() -> list[dict[str, Any]]:
    """최근 7개 스프린트의 계획 대비 완료 SP."""
    closed = await jira_client.get_closed_sprints(count=6)
    active = await jira_client.get_active_sprint()
    sprints = closed + ([active] if active else [])

    result = []
    for sprint in sprints:
        sprint_id = sprint["id"]
        name = sprint.get("name", f"Sprint {sprint_id}")

        # sprint WAS jql로 제거된 이슈 포함
        jql = f"sprint WAS {sprint_id}"
        data = await jira_client.search(
            jql, fields=["status", SP_FIELD], max_results=500
        )
        issues = data.get("issues", [])

        planned = sum(_sp(i) for i in issues)
        completed = sum(_sp(i) for i in issues if _status_category(i) == DONE_CATEGORY)
        result.append({
            "sprintName": name,
            "planned": round(planned, 1),
            "completed": round(completed, 1),
        })

    return result


# ── 5. 책임자 — 리스크 이슈 ──────────────────────────────────────────────────

@cached(ttl=120)
async def get_risk_issues() -> list[dict[str, Any]]:
    """Blocked 상태 또는 Critical/Blocker 우선순위 이슈 목록."""
    active = await jira_client.get_active_sprint()
    if not active:
        return []

    sprint_id = active["id"]
    jql = (
        f"sprint = {sprint_id} AND "
        f"(status = Blocked OR priority in (Blocker, Critical, High))"
    )
    data = await jira_client.search(
        jql,
        fields=["summary", "status", "assignee", "priority"],
        max_results=30,
    )
    issues = data.get("issues", [])
    return [
        {
            "issueKey": i["key"],
            "summary": i["fields"].get("summary") or "",
            "assignee": _assignee_name(i),
            "status": _status_name(i),
            "priority": _priority_name(i),
        }
        for i in issues
    ]


# ── 6. 개발팀 — 스프린트 KPI ─────────────────────────────────────────────────

@cached(ttl=120)
async def get_sprint_summary() -> dict[str, Any]:
    """현재 스프린트의 주요 KPI."""
    active = await jira_client.get_active_sprint()
    if not active:
        return {
            "sprintName": "N/A", "remainingPoints": 0,
            "completionRate": 0, "blockerCount": 0,
            "endDate": "", "daysLeft": 0,
        }

    sprint_id = active["id"]
    sprint_name = active.get("name", f"Sprint {sprint_id}")
    end_date_str = active.get("endDate", "")
    end_date_display = end_date_str[:10] if end_date_str else ""

    # D-day 계산
    days_left = 0
    if end_date_str:
        try:
            end_dt = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            days_left = max(0, (end_dt.date() - datetime.now(timezone.utc).date()).days)
        except ValueError:
            pass

    data = await jira_client.get_sprint_issues(
        sprint_id, fields=["status", SP_FIELD]
    )
    issues = data.get("issues", [])

    total_sp = sum(_sp(i) for i in issues)
    done_sp = sum(_sp(i) for i in issues if _status_category(i) == DONE_CATEGORY)
    remaining_sp = round(total_sp - done_sp, 1)
    completion_rate = round((done_sp / total_sp * 100) if total_sp else 0)

    blocker_data = await jira_client.search(
        f"sprint = {sprint_id} AND status = Blocked",
        fields=["summary"],
        max_results=50,
    )
    blocker_count = blocker_data.get("total", 0)

    return {
        "sprintName": sprint_name,
        "remainingPoints": remaining_sp,
        "completionRate": completion_rate,
        "blockerCount": blocker_count,
        "endDate": end_date_display,
        "daysLeft": days_left,
    }


# ── 7. 개발팀 — Burn Down Chart ───────────────────────────────────────────────

@cached(ttl=300)
async def get_burndown(sprint_id: int | None = None) -> dict[str, Any]:
    """
    스프린트 번다운 차트 데이터.
    changelog에서 Done 전환 일자를 읽어 일별 잔여 SP 계산.
    """
    if sprint_id:
        sprint_info = await jira_client.get_sprint(sprint_id)
    else:
        sprint_info = await jira_client.get_active_sprint()

    if not sprint_info:
        return {"sprintName": "N/A", "totalPoints": 0, "points": []}

    sid = sprint_info["id"]
    sprint_name = sprint_info.get("name", f"Sprint {sid}")
    start_str = sprint_info.get("startDate", "")
    end_str = sprint_info.get("endDate", "")

    if not start_str or not end_str:
        return {"sprintName": sprint_name, "totalPoints": 0, "points": []}

    start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
    today = datetime.now(timezone.utc)
    actual_end = min(end_dt, today)

    # changelog 포함 조회
    data = await jira_client.get_sprint_issues(
        sid,
        fields=["summary", "status", SP_FIELD],
        expand="changelog",
    )
    issues = data.get("issues", [])

    total_sp = sum(_sp(i) for i in issues)
    if total_sp == 0:
        return {"sprintName": sprint_name, "totalPoints": 0, "points": []}

    # 이슈별 Done 전환 일자 파악
    DONE_NAMES = {"Done", "Closed", "Resolved", "Complete", "완료"}
    completion_map: dict[str, tuple[datetime, float]] = {}

    for issue in issues:
        sp = _sp(issue)
        if sp == 0:
            continue
        if _status_category(issue) != DONE_CATEGORY:
            continue

        histories = issue.get("changelog", {}).get("histories", [])
        done_at: datetime | None = None
        for history in sorted(histories, key=lambda h: h.get("created", "")):
            for item in history.get("items", []):
                if item.get("field") == "status" and item.get("toString") in DONE_NAMES:
                    try:
                        done_at = datetime.fromisoformat(
                            history["created"].replace("Z", "+00:00")
                        )
                    except ValueError:
                        pass
        if done_at:
            completion_map[issue["key"]] = (done_at, sp)

    # 일자별 번다운 계산
    days: list[datetime] = []
    cur = start_dt
    while cur.date() <= actual_end.date():
        days.append(cur)
        cur += timedelta(days=1)

    total_days = len(days)
    points = []
    for i, day in enumerate(days):
        burned = sum(
            sp for (done_at, sp) in completion_map.values()
            if done_at.date() <= day.date()
        )
        actual = max(0.0, total_sp - burned)
        ideal = round(total_sp * (1 - i / max(total_days - 1, 1)), 1)
        points.append({
            "day": f"Day {i + 1}",
            "ideal": ideal,
            "actual": round(actual, 1),
        })

    return {
        "sprintName": sprint_name,
        "totalPoints": round(total_sp, 1),
        "points": points,
    }


# ── 8. 개발팀 — 팀원별 워크로드 ──────────────────────────────────────────────

@cached(ttl=300)
async def get_team_workload() -> list[dict[str, Any]]:
    """현재 스프린트 이슈를 담당자별로 집계."""
    active = await jira_client.get_active_sprint()
    if not active:
        return []

    data = await jira_client.get_sprint_issues(
        active["id"], fields=["status", "assignee", SP_FIELD]
    )
    issues = data.get("issues", [])

    member_map: dict[str, dict] = {}
    for issue in issues:
        name = _assignee_name(issue)
        sp = _sp(issue)
        if name not in member_map:
            member_map[name] = {"name": name, "storyPoints": 0.0, "issueCount": 0}
        member_map[name]["storyPoints"] += sp
        member_map[name]["issueCount"] += 1

    return sorted(
        [
            {**v, "storyPoints": round(v["storyPoints"], 1)}
            for v in member_map.values()
        ],
        key=lambda x: -x["storyPoints"],
    )


# ── 9. 개발팀 — 현재 스프린트 이슈 목록 ──────────────────────────────────────

@cached(ttl=120)
async def get_current_sprint_issues() -> list[dict[str, Any]]:
    """현재 스프린트의 전체 이슈 상세 목록."""
    active = await jira_client.get_active_sprint()
    if not active:
        return []

    data = await jira_client.get_sprint_issues(
        active["id"],
        fields=["summary", "status", "issuetype", "assignee", "priority", SP_FIELD],
    )
    issues = data.get("issues", [])

    return [
        {
            "issueKey": i["key"],
            "issueType": _issue_type(i),
            "summary": i["fields"].get("summary") or "",
            "assignee": _assignee_name(i),
            "status": _status_name(i),
            "storyPoints": int(_sp(i)),
            "priority": _priority_name(i),
        }
        for i in issues
    ]
