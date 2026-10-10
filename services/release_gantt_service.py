"""모델현황 릴리즈 Gantt — TV Jira Epic · Milestone + 2026 SP calendar."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from services.release_sprint_calendar_2026 import (
    calendar_payload,
    parse_day,
    sprint_for_day,
    sprint_span_for_range,
)
from services.model_status_initiative_service import (
    build_initiative_jql,
    initiative_search_field_ids,
    map_initiative_issue,
    resolve_initiative_label,
)
from services.quality_service import _field_text
from tvjira_client import tvjira_issue_browse_url, tvjira_search_all

_EPIC_COLORS = ("#3b82f6", "#86efac", "#a78bfa", "#059669", "#f97316", "#0ea5e9", "#6366f1")

_EPIC_FIELDS = [
    "summary",
    "status",
    "issuetype",
    "duedate",
    "labels",
    "parent",
    "created",
    "resolutiondate",
    settings.initiative_start_date_field,
]

_MILESTONE_TYPES = ("Milestone", "mileStone", "MileStone")


def _issue_start_end(fields: dict[str, Any]) -> tuple[Any, Any]:
    start = parse_day(fields.get(settings.initiative_start_date_field))
    if not start:
        start = parse_day(fields.get("created", "")[:10] if fields.get("created") else None)
    end = parse_day(fields.get("duedate"))
    if not end and fields.get("resolutiondate"):
        end = parse_day(str(fields.get("resolutiondate"))[:10])
    return start, end


def _parent_key(fields: dict[str, Any]) -> str | None:
    parent = fields.get("parent") or {}
    if isinstance(parent, dict):
        return parent.get("key")
    return None


def epic_jql_candidates(
    initiative_key: str | None,
    jira_label: str | None,
    project: str = "TVPLAT",
) -> list[str]:
    out: list[str] = []
    if jira_label:
        lbl = jira_label.replace('"', '\\"')
        out.append(f'project = {project} AND issuetype = Epic AND labels in ("{lbl}")')
    if initiative_key:
        key = initiative_key.strip()
        out.append(f'project = {project} AND issuetype = Epic AND issue in linkedIssues("{key}")')
        out.append(f'project = {project} AND issuetype = Epic AND parent = "{key}"')
    return out


def milestone_jql_candidates(
    epic_keys: list[str],
    jira_label: str | None,
    project: str = "TVPLAT",
) -> list[str]:
    out: list[str] = []
    if epic_keys:
        keys = ", ".join(f'"{k}"' for k in epic_keys[:50])
        out.append(
            f'project = {project} AND issuetype in (Milestone, Task, "Sub-task") AND parent in ({keys})'
        )
    if jira_label:
        lbl = jira_label.replace('"', '\\"')
        out.append(f'project = {project} AND issuetype = Milestone AND labels in ("{lbl}")')
    return out


async def _search_epics_merged(
    initiative_key: str | None,
    jira_label: str | None,
    project_key: str,
    errors: list[str],
) -> tuple[list[dict], list[str]]:
    seen: dict[str, dict] = {}
    jql_used: list[str] = []
    for jql in epic_jql_candidates(initiative_key, jira_label, project_key):
        try:
            rows = await tvjira_search_all(jql, _EPIC_FIELDS)
            jql_used.append(jql)
            for raw in rows:
                key = raw.get("key") or ""
                if key and key not in seen:
                    seen[key] = raw
        except Exception as ex:
            errors.append(f"epic JQL failed ({jql}): {ex}")
    return list(seen.values()), jql_used


async def _search_milestones_merged(
    epic_keys: list[str],
    jira_label: str | None,
    project_key: str,
    errors: list[str],
) -> tuple[list[dict], list[str]]:
    seen: dict[str, dict] = {}
    jql_used: list[str] = []
    for jql in milestone_jql_candidates(epic_keys, jira_label, project_key):
        try:
            ms_fields = [
                "summary",
                "status",
                "issuetype",
                "duedate",
                "parent",
                settings.initiative_start_date_field,
            ]
            rows = await tvjira_search_all(jql, ms_fields)
            jql_used.append(jql)
            for raw in rows:
                key = raw.get("key") or ""
                if key and key not in seen:
                    seen[key] = raw
        except Exception as ex:
            errors.append(f"milestone JQL failed ({jql}): {ex}")
    return list(seen.values()), jql_used


def _finalize_epic_span(epic: dict[str, Any]) -> dict[str, Any]:
    start_sp = epic.get("startSp")
    end_sp = epic.get("endSp")
    ms_sprints = [m["sprint"] for m in epic.get("milestones") or [] if m.get("sprint")]
    if ms_sprints:
        ms_min, ms_max = min(ms_sprints), max(ms_sprints)
        start_sp = min(start_sp or ms_min, ms_min)
        end_sp = max(end_sp or ms_max, ms_max)
    if start_sp and end_sp:
        return {**epic, "startSp": start_sp, "endSp": end_sp}
    if epic.get("issueKey"):
        return {**epic, "startSp": start_sp or 1, "endSp": end_sp or start_sp or 1}
    return epic


def _map_epic(raw: dict, idx: int) -> dict[str, Any]:
    key = raw.get("key") or ""
    fields = raw.get("fields") or {}
    start, end = _issue_start_end(fields)
    start_sp, end_sp = sprint_span_for_range(start, end)
    return {
        "issueKey": key,
        "summary": fields.get("summary") or "",
        "status": _field_text(fields.get("status")),
        "startDate": start.isoformat() if start else "",
        "endDate": end.isoformat() if end else "",
        "startSp": start_sp,
        "endSp": end_sp,
        "color": _EPIC_COLORS[idx % len(_EPIC_COLORS)],
        "issueUrl": tvjira_issue_browse_url(key),
        "milestones": [],
    }


def _map_milestone(raw: dict, epic_key: str | None) -> dict[str, Any] | None:
    fields = raw.get("fields") or {}
    itype = _field_text(fields.get("issuetype"))
    summary = fields.get("summary") or ""
    if itype not in _MILESTONE_TYPES and "milestone" not in summary.lower():
        return None
    start, end = _issue_start_end(fields)
    sp = sprint_for_day(end or start)
    if sp is None:
        start_sp, end_sp = sprint_span_for_range(start, end)
        sp = start_sp
    if sp is None:
        return None
    label = summary
    m = re.search(r"\bM[1-9]\d*\b", summary, re.I)
    if m:
        label = m.group(0).upper()
    key = raw.get("key") or ""
    parent = _parent_key(fields) or epic_key
    return {
        "issueKey": key,
        "label": label,
        "sprint": sp,
        "summary": summary,
        "epicKey": parent,
        "issueUrl": tvjira_issue_browse_url(key),
    }


@cached(ttl=300)
async def get_release_gantt(
    model: str | None = None,
    label: str | None = None,
    initiative_key: str | None = None,
    project_key: str = "TVPLAT",
) -> dict[str, Any]:
    jira_label = resolve_initiative_label(model, label)
    initiative_row: dict[str, Any] | None = None

    if not initiative_key and jira_label:
        init_jql = build_initiative_jql(jira_label, project_key=project_key)
        inits = await tvjira_search_all(init_jql, initiative_search_field_ids())
        if inits:
            initiative_row = map_initiative_issue(inits[0], model)
            initiative_key = initiative_row.get("key")

    epics: list[dict[str, Any]] = []
    milestones_global: list[dict[str, Any]] = []
    errors: list[str] = []
    epic_jqls: list[str] = []

    if jira_label or initiative_key:
        raw_epics, epic_jqls = await _search_epics_merged(
            initiative_key, jira_label, project_key, errors
        )
        for i, raw in enumerate(raw_epics):
            epics.append(_map_epic(raw, i))

        epic_keys = [e["issueKey"] for e in epics if e.get("issueKey")]
        raw_ms, _ms_jqls = await _search_milestones_merged(
            epic_keys, jira_label, project_key, errors
        )
        by_epic: dict[str, list[dict]] = {k: [] for k in epic_keys}
        for raw in raw_ms:
            parent = _parent_key(raw.get("fields") or {})
            ms = _map_milestone(raw, parent)
            if not ms:
                continue
            milestones_global.append(ms)
            ek = ms.get("epicKey") or ""
            if ek in by_epic:
                by_epic[ek].append(ms)
        epics = [_finalize_epic_span({**e, "milestones": by_epic.get(e["issueKey"], [])}) for e in epics]

    cal = calendar_payload()
    return {
        "meta": {
            "asOf": datetime.now(timezone.utc).isoformat(),
            "epicJqls": epic_jqls,
            "initiativeKey": initiative_key,
            "model": model,
            "label": jira_label,
            "errors": errors,
        },
        "calendar": cal,
        "initiative": initiative_row,
        "epics": epics,
        "milestones": milestones_global,
    }


def get_release_calendar() -> dict[str, Any]:
    return calendar_payload()
