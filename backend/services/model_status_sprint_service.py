"""
모델현황 — 스프린트 · Velocity · Burn Down (Harmony Jira board, 모델 label 필터).

Initiative/릴리즈와 동일하게 UI model → Jira labels 매핑 후, 현재·과거 sprint Story 만 집계.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client
from services.jira_service import (
    DONE_CATEGORY,
    SP_FIELD,
    _assignee_name,
    _dedupe_sprints_by_name,
    _is_velocity_done,
    _issue_browse_url,
    _issue_type,
    _priority_name,
    _sp,
    _status_category,
    _status_name,
    _best_sprint_from_pool,
)
from services.model_status_initiative_service import normalize_model_code, resolve_initiative_label

# Story 라벨 — Initiative 매핑 확장 (Harmony MLCSIXZERO 보드)
SPRINT_STORY_LABEL_BY_MODEL: dict[str, str] = {
    "H7_VI": "SoundSuite_H7(VI)",
    "S80C": "S80C",
    "S90C": "S90C",
    "CB-SH": "CB-SH",
    "CB_SH": "CB-SH",
}


def resolve_sprint_story_label(model: str | None, label: str | None) -> str | None:
    if label and label.strip():
        return label.strip()
    key = normalize_model_code(model)
    if not key:
        return None
    if key in SPRINT_STORY_LABEL_BY_MODEL:
        return SPRINT_STORY_LABEL_BY_MODEL[key]
    return resolve_initiative_label(model, label)


def _norm_token(s: str) -> str:
    return (s or "").strip().upper().replace("-", "_").replace(" ", "_")


def issue_matches_model(issue: dict, jira_label: str, model_code: str | None) -> bool:
    """labels / components / summary — 모델 스코프."""
    fields = issue.get("fields") or {}
    label_norm = _norm_token(jira_label)
    model_norm = _norm_token(model_code or "")

    labels = fields.get("labels") or []
    for lb in labels:
        ln = _norm_token(str(lb))
        if ln == label_norm or (model_norm and ln == model_norm):
            return True
        if label_norm and label_norm in ln:
            return True

    for comp in fields.get("components") or []:
        name = _norm_token(str(comp.get("name") or ""))
        if name == label_norm or (model_norm and name == model_norm):
            return True

    summary = (fields.get("summary") or "").upper()
    if model_norm and len(model_norm) >= 3 and model_norm.replace("_", "") in summary.replace(" ", ""):
        return True
    if jira_label and jira_label.upper() in summary:
        return True
    return False


def filter_issues_for_model(
    issues: list[dict], jira_label: str, model_code: str | None
) -> list[dict]:
    return [i for i in issues if issue_matches_model(i, jira_label, model_code)]


def _blocker_jql(sprint_id: int, jira_label: str) -> str:
    safe = jira_label.replace('"', '\\"')
    return (
        f'sprint = {sprint_id} AND issuetype = Story AND priority = P0 AND status != Closed '
        f'AND labels = "{safe}"'
    )


def _burndown_from_issues(
    sprint_info: dict,
    story_issues: list[dict],
) -> dict[str, Any]:
    sprint_name = sprint_info.get("name", f"Sprint {sprint_info.get('id')}")
    start_str = sprint_info.get("startDate", "")
    end_str = sprint_info.get("endDate", "")
    if not start_str or not end_str:
        return {"sprintName": sprint_name, "totalPoints": 0, "points": []}

    start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
    today = datetime.now(timezone.utc)
    actual_end = min(end_dt, today)

    issues = [i for i in story_issues if _issue_type(i) == "Story"]
    total_sp = sum(_sp(i) for i in issues)
    if total_sp == 0:
        return {"sprintName": sprint_name, "totalPoints": 0, "points": []}

    done_names = {"Done", "Closed", "Resolved", "Complete", "완료"}
    for issue in issues:
        if _status_category(issue) == DONE_CATEGORY:
            done_names.add(_status_name(issue))

    completion_map: dict[str, tuple[datetime, float]] = {}
    for issue in issues:
        sp = _sp(issue)
        if sp == 0 or _status_category(issue) != DONE_CATEGORY:
            continue
        histories = issue.get("changelog", {}).get("histories", [])
        done_at: datetime | None = None
        for history in sorted(histories, key=lambda h: h.get("created", "")):
            for item in history.get("items", []):
                if item.get("field") == "status" and item.get("toString") in done_names:
                    try:
                        done_at = datetime.fromisoformat(history["created"].replace("Z", "+00:00"))
                    except ValueError:
                        pass
        if not done_at:
            done_at = start_dt
        completion_map[issue["key"]] = (done_at, sp)

    days: list[datetime] = []
    cur = start_dt
    while cur.date() <= actual_end.date():
        days.append(cur)
        cur += timedelta(days=1)

    total_days = len(days)
    points = []
    for i, day in enumerate(days):
        burned = sum(sp for (done_at, sp) in completion_map.values() if done_at.date() <= day.date())
        actual = max(0.0, total_sp - burned)
        ideal = round(total_sp * (1 - i / max(total_days - 1, 1)), 1)
        points.append({"day": f"Day {i + 1}", "ideal": ideal, "actual": round(actual, 1)})

    return {"sprintName": sprint_name, "totalPoints": round(total_sp, 1), "points": points}


def _sprint_summary_from_issues(
    sprint_info: dict, issues: list[dict], blocker_count: int
) -> dict[str, Any]:
    sprint_name = sprint_info.get("name", f"Sprint {sprint_info.get('id')}")
    end_date_str = sprint_info.get("endDate", "")
    end_date_display = end_date_str[:10] if end_date_str else ""
    days_left = 0
    if end_date_str:
        try:
            end_dt = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            days_left = max(0, (end_dt.date() - datetime.now(timezone.utc).date()).days)
        except ValueError:
            pass
    total_sp = sum(_sp(i) for i in issues)
    done_sp = sum(_sp(i) for i in issues if _status_category(i) == DONE_CATEGORY)
    remaining_sp = round(total_sp - done_sp, 1)
    completion_rate = round((done_sp / total_sp * 100) if total_sp else 0)
    return {
        "sprintName": sprint_name,
        "remainingPoints": remaining_sp,
        "completionRate": completion_rate,
        "blockerCount": blocker_count,
        "endDate": end_date_display,
        "daysLeft": days_left,
    }


def _workload_from_issues(issues: list[dict]) -> list[dict[str, Any]]:
    member_map: dict[str, dict] = {}
    for issue in issues:
        name = _assignee_name(issue)
        sp = _sp(issue)
        if name not in member_map:
            member_map[name] = {"name": name, "storyPoints": 0.0, "issueCount": 0}
        member_map[name]["storyPoints"] += sp
        member_map[name]["issueCount"] += 1
    return sorted(
        [{**v, "storyPoints": round(v["storyPoints"], 1)} for v in member_map.values()],
        key=lambda x: -x["storyPoints"],
    )


def _issues_table_rows(issues: list[dict]) -> list[dict[str, Any]]:
    return [
        {
            "issueKey": i["key"],
            "issueUrl": _issue_browse_url(i["key"]),
            "issueType": _issue_type(i),
            "summary": i.get("fields", {}).get("summary") or "",
            "assignee": _assignee_name(i),
            "status": _status_name(i),
            "storyPoints": int(_sp(i)),
            "priority": _priority_name(i),
        }
        for i in issues
    ]


def _build_risk_alerts(
    summary: dict[str, Any],
    burndown: dict[str, Any],
    velocity: list[dict[str, Any]],
) -> list[str]:
    alerts: list[str] = []
    if int(summary.get("blockerCount") or 0) > 0:
        alerts.append(f"블로커 {summary['blockerCount']}건 — P0 Story (모델 label 스코프)")
    rate = float(summary.get("completionRate") or 0)
    days = int(summary.get("daysLeft") or 0)
    if rate < 50 and days <= 5:
        alerts.append(f"스프린트 D-{days} · 완료율 {rate}% — 일정 리스크")
    pts = burndown.get("points") or []
    if pts:
        last = pts[-1]
        if float(last.get("actual") or 0) > float(last.get("ideal") or 0) * 1.15:
            alerts.append("Burn Down — 실제 잔여 SP가 이상선 대비 15% 초과")
    if len(velocity) >= 2:
        done = [float(v.get("completed") or 0) for v in velocity]
        if done[-1] < sum(done[:-1]) / max(len(done) - 1, 1) * 0.85:
            alerts.append("Velocity — 최근 스프린트 done SP가 직전 평균 대비 하락")
    return alerts


@cached(ttl=120)
async def get_sprint_dashboard_for_model(
    model: str | None = None,
    label: str | None = None,
) -> dict[str, Any]:
    jira_label = resolve_sprint_story_label(model, label)
    if not jira_label:
        raise ValueError(f"Unknown model for sprint scope (model={model!r}, label={label!r})")

    model_key = normalize_model_code(model) or (model or "").strip()
    active = await jira_client.get_active_sprint()
    if not active:
        empty_summary = {
            "sprintName": "N/A",
            "remainingPoints": 0,
            "completionRate": 0,
            "blockerCount": 0,
            "endDate": "",
            "daysLeft": 0,
        }
        return {
            "meta": {
                "model": model_key,
                "label": jira_label,
                "boardId": settings.board_id,
                "scope": f'labels/components ~ "{jira_label}"',
                "matchedStories": 0,
                "asOf": datetime.now(timezone.utc).isoformat(),
            },
            "summary": empty_summary,
            "burndown": {"sprintName": "N/A", "totalPoints": 0, "points": []},
            "velocity": [],
            "workload": [],
            "issues": [],
            "alerts": ["활성 스프린트 없음"],
        }

    sprint_id = active["id"]
    fields = ["summary", "status", "issuetype", "assignee", "priority", SP_FIELD, "labels", "components"]
    data = await jira_client.get_sprint_issues(
        sprint_id, fields=fields, expand="changelog"
    )
    all_issues = data.get("issues") or []
    scoped = filter_issues_for_model(all_issues, jira_label, model_key)

    try:
        blocker_data = await jira_client.search(
            _blocker_jql(sprint_id, jira_label),
            fields=["summary"],
            max_results=50,
        )
        blocker_count = int(blocker_data.get("total") or 0)
    except Exception:
        blocker_count = sum(
            1
            for i in scoped
            if _issue_type(i) == "Story"
            and _priority_name(i) == "P0"
            and _status_name(i) != "Closed"
        )

    summary = _sprint_summary_from_issues(active, scoped, blocker_count)
    burndown = _burndown_from_issues(active, scoped)

    closed_raw = await jira_client.get_closed_sprints(count=20)
    closed = _dedupe_sprints_by_name(closed_raw)[-2:]
    sprint_pool = closed_raw + [active]
    sprints = _dedupe_sprints_by_name(closed + [active])
    velocity: list[dict[str, Any]] = []
    for sprint in sprints:
        if not sprint:
            continue
        name = sprint.get("name", f"Sprint {sprint.get('id')}")
        canonical = _best_sprint_from_pool(name, sprint_pool) or sprint
        raw_stories = await _velocity_issues(canonical, sprint_pool)
        stories = filter_issues_for_model(raw_stories, jira_label, model_key)
        committed = sum(_sp(i) for i in stories)
        completed = sum(_sp(i) for i in stories if _is_velocity_done(i))
        velocity.append({"sprintName": name, "committed": round(committed, 1), "completed": round(completed, 1)})

    workload = _workload_from_issues(scoped)
    issues = _issues_table_rows(scoped)
    alerts = _build_risk_alerts(summary, burndown, velocity)

    return {
        "meta": {
            "model": model_key,
            "label": jira_label,
            "boardId": settings.board_id,
            "sprintId": sprint_id,
            "scope": f'labels/components ~ "{jira_label}"',
            "matchedStories": len([i for i in scoped if _issue_type(i) == "Story"]),
            "totalInSprint": len(all_issues),
            "asOf": datetime.now(timezone.utc).isoformat(),
        },
        "summary": summary,
        "burndown": burndown,
        "velocity": velocity,
        "workload": workload,
        "issues": issues,
        "alerts": alerts,
    }
