"""
Release / Sprint Plan — 보드 Sprint + Epic/Story + labels=risk (Description · Environment).
"""
from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client
from services.jira_service import _dedupe_sprints_by_name
from services.planning_service import _is_story_issue
from services.quality_service import _board_jql_clause, _issue_browse_url, _parse_jira_date, _search_all_issues
from services.risk_service import (
    ENV_FIELD,
    RISK_LABEL,
    _description_text,
    _issue_row,
    _primary_category,
    _risk_id_from_block,
    _split_environment_blocks,
)

GANTT_START = "2026-02-01"
GANTT_END = "2026-08-31"
SP_MIN = 2
SP_MAX = 17
SPRINT_FIELD = settings.sprint_field
RELEASE_SPRINT_FIELD = settings.release_sprint_field
SPRINT_KEY_RE = re.compile(r"2026_IR\d+SP\d+", re.IGNORECASE)


def _is_epic_issue(issue: dict) -> bool:
    name = (issue.get("fields", {}).get("issuetype", {}).get("name") or "").strip().lower()
    return name == "epic" or "에픽" in name


def _gate_from_sprint_name(name: str) -> str:
    m = SPRINT_NAME_RE.search(name or "")
    if not m:
        return "Gate ?"
    ir = int(m.group(1))
    if ir <= 1:
        return "Gate 0"
    if ir == 2:
        return "Gate 1"
    return "Gate 2"


def _parse_sprint_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except ValueError:
        return _parse_jira_date(value)


def _md_label(iso_date: str | None) -> str:
    dt = _parse_sprint_iso(iso_date)
    if not dt:
        return "?"
    return f"{dt.month}/{dt.day}"


def _sprint_label(sprint: dict) -> str:
    name = sprint.get("name") or f"Sprint {sprint.get('id')}"
    start = sprint.get("startDate") or ""
    end = sprint.get("endDate") or ""
    if start and end:
        return f"{name}({_md_label(start)}-{_md_label(end)})"
    return name


def _sprint_plan_status(sprint: dict) -> str:
    state = (sprint.get("state") or "").lower()
    if state == "active":
        return "active"
    if state == "closed":
        return "completed"
    return "future"


def _in_sprint_window(sprint: dict) -> bool:
    name = sprint.get("name") or ""
    m = SPRINT_NAME_RE.search(name)
    if not m:
        return False
    sp_num = int(m.group(2))
    return SP_MIN <= sp_num <= SP_MAX


def _fix_version_name(fields: dict) -> str:
    versions = fields.get("fixVersions") or []
    if versions and isinstance(versions[0], dict):
        return versions[0].get("name") or "—"
    return "—"


def _label_list(fields: dict) -> list[str]:
    return [str(x) for x in (fields.get("labels") or [])]


def _is_bug_issue(issue: dict) -> bool:
    name = (issue.get("fields", {}).get("issuetype", {}).get("name") or "").strip().lower()
    if name in ("bug", "버그", "defect"):
        return True
    return "bug" in name or "버그" in name or "defect" in name


def _has_risk_label(labels: list[str]) -> bool:
    for label in labels:
        norm = re.sub(r"[_\-\s]", "", str(label).lower())
        if norm == "risk" or norm.startswith("risk"):
            return True
    return False


def _is_risk_bug(issue: dict) -> bool:
    """RISK = issuetype Bug + labels risk/RISK."""
    return _is_bug_issue(issue) and _has_risk_label(_label_list(issue.get("fields", {})))


def _issue_sprint_name_keys(fields: dict) -> list[str]:
    """Jira Sprint / Release Sprint 커스텀 필드에서 2026_IRxSPxx 키 추출."""
    names: list[str] = []
    for field_id in (SPRINT_FIELD, RELEASE_SPRINT_FIELD):
        raw = fields.get(field_id)
        if raw is None:
            continue
        items = raw if isinstance(raw, list) else [raw]
        for item in items:
            if isinstance(item, dict):
                text = str(item.get("name") or item.get("value") or "")
            else:
                text = str(item)
            m = SPRINT_KEY_RE.search(text)
            if m:
                names.append(m.group(0))
    return names


def _resolve_sprint_for_issue(issue: dict, sprint_by_name: dict[str, dict]) -> dict | None:
    fields = issue.get("fields", {})
    for key in _issue_sprint_name_keys(fields):
        if key in sprint_by_name:
            return sprint_by_name[key]
        for name, sprint in sprint_by_name.items():
            if key.lower() in name.lower() or name.lower() in key.lower():
                return sprint
    return None


async def _fetch_risk_bugs_board(fields: list[str]) -> list[dict]:
    """Agile sprint API에 없어도 보드 JQL로 Bug+labels=risk 수집."""
    board_jql = await _board_jql_clause()
    search_fields = list(
        dict.fromkeys(
            fields + [SPRINT_FIELD, RELEASE_SPRINT_FIELD, "components", "assignee", "priority"],
        ),
    )
    jql = (
        f'({board_jql}) AND issuetype in (Bug, "버그") '
        f'AND (labels = risk OR labels = RISK OR labels = Risk)'
    )
    try:
        issues = await _search_all_issues(jql, search_fields)
    except Exception:
        jql = f'({board_jql}) AND labels = risk'
        try:
            issues = await _search_all_issues(jql, search_fields)
        except Exception:
            return []
    return [i for i in issues if _is_risk_bug(i)]


EPIC_LINK_FIELD = settings.epic_link_field


def _mvp_from_fields(fields: dict, extra_labels: list[str] | None = None) -> bool:
    """labels MVP / MVP_* 또는 fixVersions 이름에 MVP 포함."""
    labels = _label_list(fields) + (extra_labels or [])
    for label in labels:
        norm = re.sub(r"[_\-\s]", "", str(label).lower())
        if norm == "mvp" or norm.startswith("mvp"):
            return True
    for fv in fields.get("fixVersions") or []:
        name = (fv.get("name") if isinstance(fv, dict) else str(fv)) or ""
        if "mvp" in name.lower():
            return True
    return False


def _has_mvp(labels: list[str]) -> bool:
    return _mvp_from_fields({"labels": labels}, None)


def _risk_marker_date(risk_issue: dict, sprint: dict) -> str:
    fields = risk_issue.get("fields", {})
    created = _parse_jira_date(fields.get("created"))
    start = _parse_sprint_iso(sprint.get("startDate"))
    end = _parse_sprint_iso(sprint.get("endDate"))
    if created and start and end:
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        if start <= created <= end:
            return created.strftime("%Y-%m-%d")
    if start and end:
        mid = start + (end - start) / 2
        return mid.strftime("%Y-%m-%d")
    return GANTT_START


def _build_risk_payload(risk_issue: dict, sprint: dict, now: datetime) -> dict[str, Any]:
    parsed = _issue_row(risk_issue, now)
    fields = risk_issue.get("fields", {})
    env_raw = parsed.get("_environment") or _description_text(fields.get(ENV_FIELD))
    labels = parsed.get("_labels") or _label_list(fields)
    blocks = _split_environment_blocks(env_raw) if env_raw.strip() else [""]
    block = blocks[0] if blocks else env_raw
    risk_id = _risk_id_from_block(block, labels) or risk_issue.get("key", "RISK")
    description = parsed.get("responsePlan") or _description_text(fields.get("description"))
    key = risk_issue.get("key", "")
    return {
        "id": str(risk_id),
        "issueKey": key,
        "issueUrl": _issue_browse_url(key),
        "summary": fields.get("summary") or "",
        "description": description or "",
        "environment": env_raw or "",
        "markerDate": _risk_marker_date(risk_issue, sprint),
        "category": parsed.get("category") or _primary_category(fields),
    }


def _build_risk_row(risk_issue: dict, sprint: dict, now: datetime) -> dict[str, Any]:
    """Bug + labels=risk → Gantt 전용 Risk 행 (Epic/Story와 분리)."""
    payload = _build_risk_payload(risk_issue, sprint, now)
    fields = risk_issue.get("fields", {})
    key = risk_issue.get("key", "")
    labels = _label_list(fields)
    start = (sprint.get("startDate") or "")[:10]
    end = (sprint.get("endDate") or "")[:10]
    name = sprint.get("name") or ""
    return {
        "id": key,
        "issueType": "Risk",
        "issueKey": key,
        "issueUrl": _issue_browse_url(key),
        "summary": fields.get("summary") or payload.get("summary") or "",
        "fixVersion": _fix_version_name(fields),
        "gate": _gate_from_sprint_name(name),
        "labels": labels,
        "isMvp": False,
        "sprintKey": name,
        "sprintLabel": _sprint_label(sprint),
        "startDate": start or GANTT_START,
        "endDate": end or start or GANTT_END,
        "status": _sprint_plan_status(sprint),
        "epicKey": None,
        "risks": [payload],
    }


def _build_row(
    issue: dict,
    sprint: dict,
    issue_type: str,
    risks: list[dict[str, Any]],
    extra_labels: list[str] | None = None,
) -> dict[str, Any]:
    fields = issue.get("fields", {})
    key = issue.get("key", "")
    labels = _label_list(fields)
    start = (sprint.get("startDate") or "")[:10]
    end = (sprint.get("endDate") or "")[:10]
    name = sprint.get("name") or ""
    is_mvp = _mvp_from_fields(fields, extra_labels)
    return {
        "id": key,
        "issueType": issue_type,
        "issueKey": key,
        "issueUrl": _issue_browse_url(key),
        "summary": fields.get("summary") or "",
        "fixVersion": _fix_version_name(fields),
        "gate": _gate_from_sprint_name(name),
        "labels": labels,
        "isMvp": is_mvp,
        "sprintKey": name,
        "sprintLabel": _sprint_label(sprint),
        "startDate": start or GANTT_START,
        "endDate": end or start or GANTT_END,
        "status": _sprint_plan_status(sprint),
        "epicKey": fields.get(EPIC_LINK_FIELD) if issue_type == "Story" else None,
        "risks": risks,
    }


async def _fetch_sprint_issues(sprint_id: int, fields: list[str]) -> list[dict]:
    try:
        data = await jira_client.get_sprint_issues(sprint_id, fields=fields)
        return list(data.get("issues") or [])
    except Exception:
        return []


async def _load_sprint_bundle(sprint: dict, fields: list[str], now: datetime) -> tuple[list[dict], list[dict]]:
    sid = int(sprint["id"])
    issues = await _fetch_sprint_issues(sid, fields)
    risk_issues = [i for i in issues if _is_risk_bug(i)]
    risk_payloads = [_build_risk_payload(r, sprint, now) for r in risk_issues]

    epic_label_cache: dict[str, list[str]] = {}

    async def _epic_labels(epic_key: str | None) -> list[str]:
        if not epic_key:
            return []
        if epic_key in epic_label_cache:
            return epic_label_cache[epic_key]
        try:
            epic = await jira_client.get_issue(epic_key, fields=["labels", "fixVersions"])
            epic_label_cache[epic_key] = _label_list(epic.get("fields", {}))
        except Exception:
            epic_label_cache[epic_key] = []
        return epic_label_cache[epic_key]

    rows: list[dict] = []
    for issue in issues:
        if _is_risk_bug(issue):
            try:
                rows.append(_build_risk_row(issue, sprint, now))
            except Exception:
                continue
            continue
        fields_data = issue.get("fields", {})
        if _is_epic_issue(issue):
            rows.append(_build_row(issue, sprint, "Epic", []))
        elif _is_story_issue(issue):
            epic_key = fields_data.get(EPIC_LINK_FIELD)
            extra = await _epic_labels(epic_key)
            rows.append(_build_row(issue, sprint, "Story", [], extra_labels=extra))
    return rows, risk_payloads


@cached(ttl=300)
async def get_sprint_plan_timeline() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    all_sprints = _dedupe_sprints_by_name(await jira_client.get_all_board_sprints(max_results=100))
    sprints = [s for s in all_sprints if _in_sprint_window(s)]
    sprints.sort(key=lambda s: (s.get("startDate") or "", s.get("id", 0)))

    browse_base = f"{settings.jira_base_url.rstrip('/')}/browse"

    if not sprints:
        return {
            "ganttStart": GANTT_START,
            "ganttEnd": GANTT_END,
            "sprintRangeStart": GANTT_START,
            "sprintRangeEnd": GANTT_END,
            "sprints": [],
            "rows": [],
            "meta": {
                "fixVersionField": "Release 1.0",
                "riskLabel": RISK_LABEL,
                "totalSprints": 0,
                "activeSprint": "—",
                "jiraBrowseBase": browse_base,
                "dataSource": "jira",
                "boardId": settings.board_id,
                "message": "2026_IR1SP02~IR4SP17 Sprint를 찾지 못했습니다.",
            },
        }

    fetch_fields = [
        "summary",
        "status",
        "issuetype",
        "fixVersions",
        "labels",
        "description",
        ENV_FIELD,
        EPIC_LINK_FIELD,
        SPRINT_FIELD,
        RELEASE_SPRINT_FIELD,
        "created",
    ]

    bundles = await asyncio.gather(*[_load_sprint_bundle(s, fetch_fields, now) for s in sprints])
    rows: list[dict] = []
    for sprint_rows, _ in bundles:
        rows.extend(sprint_rows)

    sprint_by_name = {s.get("name", ""): s for s in sprints if s.get("name")}
    existing_risk_keys = {r["issueKey"] for r in rows if r.get("issueType") == "Risk"}
    jql_risk_bugs = await _fetch_risk_bugs_board(fetch_fields)
    jql_matched = 0
    jql_unmapped = 0
    for bug in jql_risk_bugs:
        key = bug.get("key", "")
        if not key or key in existing_risk_keys:
            continue
        sprint = _resolve_sprint_for_issue(bug, sprint_by_name)
        if not sprint:
            jql_unmapped += 1
            continue
        try:
            rows.append(_build_risk_row(bug, sprint, now))
            existing_risk_keys.add(key)
            jql_matched += 1
        except Exception:
            continue

    rows.sort(key=lambda r: (r["startDate"], {"Epic": 0, "Story": 1, "Risk": 2}.get(r["issueType"], 3), r["issueKey"]))

    active = next((s for s in sprints if (s.get("state") or "").lower() == "active"), None)
    active_name = active.get("name") if active else (sprints[-1].get("name") if sprints else "—")

    sprint_defs = []
    for s in sprints:
        name = s.get("name") or ""
        m = SPRINT_NAME_RE.search(name)
        sprint_defs.append(
            {
                "key": name,
                "label": _sprint_label(s),
                "startDate": (s.get("startDate") or "")[:10],
                "endDate": (s.get("endDate") or "")[:10],
                "ir": int(m.group(1)) if m else 0,
                "gate": _gate_from_sprint_name(name),
            }
        )

    browse_base = f"{settings.jira_base_url.rstrip('/')}/browse"

    return {
        "ganttStart": GANTT_START,
        "ganttEnd": GANTT_END,
        "sprintRangeStart": sprint_defs[0]["startDate"],
        "sprintRangeEnd": sprint_defs[-1]["endDate"],
        "sprints": sprint_defs,
        "rows": rows,
        "meta": {
            "fixVersionField": "Release 1.0",
            "riskLabel": RISK_LABEL,
            "riskMatch": "issuetype=Bug AND labels=risk|RISK",
            "riskRows": len(existing_risk_keys),
            "riskJqlMatched": jql_matched,
            "riskJqlUnmapped": jql_unmapped,
            "mvpMatch": "labels MVP* OR Epic labels OR fixVersions MVP",
            "totalSprints": len(sprints),
            "activeSprint": active_name,
            "jiraBrowseBase": browse_base,
            "dataSource": "jira",
            "boardId": settings.board_id,
        },
    }
