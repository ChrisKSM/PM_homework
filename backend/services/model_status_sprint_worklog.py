"""TV Jira worklog → 2026 IR/SP velocity · 현재 SP burndown · 팀 workload."""
from __future__ import annotations

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any

from services.initiative_sp_kpi_service import _seconds_to_sp, _sp_hours_per_point
from services.release_sprint_calendar_2026 import parse_day, sprint_for_day
from tvjira_client import tvjira_issue_worklog_entries


def worklog_started_date(started: str | None) -> date | None:
    if not started:
        return None
    raw = str(started).strip()
    if len(raw) >= 10 and raw[4] == "-":
        return parse_day(raw[:10])
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt.date()
    except ValueError:
        return parse_day(raw[:10])


def merge_velocity_with_worklog(
    plan_velocity: list[dict[str, Any]],
    worklog_sp_by_sprint: dict[int, float],
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in plan_velocity:
        sp = int(str(row.get("sprintName") or "").replace("SP", "") or 0)
        planned = float(row.get("committed") or row.get("planned") or 0)
        completed = round(float(worklog_sp_by_sprint.get(sp, 0.0)), 1)
        name = row.get("sprintName") or f"SP{sp:02d}"
        out.append(
            {
                "sprintName": name,
                "planned": round(planned, 1),
                "completed": completed,
                "committed": round(planned, 1),
            }
        )
    return out


def build_current_sprint_burndown(
    sprint_def: dict[str, Any] | None,
    planned_sp: float,
    daily_sp_logged: dict[date, float],
) -> dict[str, Any]:
    if not sprint_def:
        return {"sprintName": "N/A", "totalPoints": 0, "points": []}
    start = parse_day(sprint_def.get("startDate"))
    end = parse_day(sprint_def.get("endDate"))
    if not start or not end:
        label = sprint_def.get("label") or "IR/SP"
        return {"sprintName": label, "totalPoints": 0, "points": []}

    today = datetime.now(timezone.utc).date()
    last_day = min(end, today)
    total = planned_sp if planned_sp > 0 else round(sum(daily_sp_logged.values()), 1)
    if total <= 0:
        label = sprint_def.get("label") or f"SP{sprint_def.get('sp')}"
        return {"sprintName": label, "totalPoints": 0, "points": []}

    num_days = max(1, (end - start).days + 1)
    points: list[dict[str, Any]] = []
    cum = 0.0
    day = start
    idx = 0
    label = sprint_def.get("label") or f"SP{sprint_def.get('sp')}"
    while day <= last_day:
        cum += float(daily_sp_logged.get(day, 0.0))
        ideal = round(total * (1 - (idx + 1) / num_days), 1)
        actual = round(max(0.0, total - cum), 1)
        points.append({"day": day.isoformat(), "ideal": ideal, "actual": actual})
        day += timedelta(days=1)
        idx += 1
    return {"sprintName": label, "totalPoints": round(total, 1), "points": points}


def build_workload_for_sprint(
    author_sp: dict[str, float],
    author_issues: dict[str, set[str]],
) -> list[dict[str, Any]]:
    rows = []
    for name, sp in sorted(author_sp.items(), key=lambda x: -x[1]):
        rows.append(
            {
                "name": name,
                "storyPoints": round(sp, 1),
                "issueCount": len(author_issues.get(name) or set()),
            }
        )
    return rows[:30]


async def aggregate_worklog_for_model_scope(
    issue_done: dict[str, bool],
    sprints: list[dict[str, Any]],
    *,
    current_sp: int | None,
    errors: list[str],
    max_issues: int = 400,
) -> dict[str, Any]:
    keys = sorted(issue_done.keys())
    if len(keys) > max_issues:
        errors.append(f"worklog detail: capped at {max_issues}/{len(keys)} issues")
        keys = keys[:max_issues]

    sp_logged: dict[int, float] = {}
    daily_logged: dict[date, float] = {}
    author_sp_current: dict[str, float] = {}
    author_issues_current: dict[str, set[str]] = {}
    entries_count = 0
    issues_with_wl = 0
    total_sec = 0

    sem = asyncio.Semaphore(8)

    async def one(issue_key: str) -> None:
        nonlocal entries_count, issues_with_wl, total_sec
        async with sem:
            try:
                entries = await tvjira_issue_worklog_entries(issue_key)
            except Exception as ex:
                errors.append(f"worklog {issue_key}: {ex}")
                return
            if not entries:
                return
            issues_with_wl += 1
            for e in entries:
                sec = int(e.get("seconds") or 0)
                if sec <= 0:
                    continue
                total_sec += sec
                entries_count += 1
                sp_val = _seconds_to_sp(sec)
                d = worklog_started_date(str(e.get("started") or ""))
                if not d:
                    continue
                sp_num = sprint_for_day(d)
                if sp_num is not None:
                    sp_logged[sp_num] = sp_logged.get(sp_num, 0.0) + sp_val
                if current_sp is not None and sp_num == current_sp:
                    daily_logged[d] = daily_logged.get(d, 0.0) + sp_val
                    author = str(e.get("author") or "미배정")
                    author_sp_current[author] = author_sp_current.get(author, 0.0) + sp_val
                    author_issues_current.setdefault(author, set()).add(issue_key)

    if keys:
        await asyncio.gather(*(one(k) for k in keys))

    sp_hours = _sp_hours_per_point()
    by_sprint = []
    for s in sprints:
        sp = int(s.get("sp") or 0)
        logged = round(sp_logged.get(sp, 0.0), 1)
        if logged <= 0:
            continue
        by_sprint.append(
            {
                "sp": sp,
                "sprintName": s.get("label") or f"SP{sp:02d}",
                "spLogged": logged,
                "hours": round(logged * sp_hours, 1),
            }
        )

    return {
        "spHoursPerPoint": sp_hours,
        "issueScopeCount": len(keys),
        "issuesWithWorklog": issues_with_wl,
        "entriesCount": entries_count,
        "totalSpLogged": round(_seconds_to_sp(total_sec), 1),
        "totalHours": round(total_sec / 3600.0, 1),
        "spLoggedBySprint": {str(k): round(v, 3) for k, v in sp_logged.items()},
        "bySprint": by_sprint,
        "dailySpLoggedCurrentSprint": {d.isoformat(): round(v, 3) for d, v in sorted(daily_logged.items())},
        "workloadCurrentSprint": build_workload_for_sprint(author_sp_current, author_issues_current),
    }
