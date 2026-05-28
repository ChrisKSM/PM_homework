"""
리스크 관리 대시보드 — labels = risk, 범주 = Components, 대응 계획 = Description.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client

from services.quality_service import (
    _board_jql_clause,
    _field_text,
    _is_done,
    _issue_browse_url,
    _normalize_priority,
    _parse_jira_date,
    _search_all_issues,
)

RISK_LABEL = "risk"

# Jira Components 권장 7개 범주
STANDARD_CATEGORIES = [
    "요구사항",
    "일정",
    "자원",
    "기술",
    "외부의존",
    "품질",
    "범위",
]
UNCATEGORIZED = "미지정"

SCHEDULE_RESERVE_DAYS = 45

SEARCH_FIELDS = [
    "summary",
    "status",
    "priority",
    "labels",
    "assignee",
    "created",
    "resolutiondate",
    "components",
    "description",
]


def _description_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        if value.get("type") == "doc":
            return _adf_to_text(value).strip()
        return _field_text(value)
    return str(value).strip()


def _adf_to_text(node: dict) -> str:
    parts: list[str] = []
    if node.get("type") == "text":
        parts.append(str(node.get("text") or ""))
    for child in node.get("content") or []:
        if isinstance(child, dict):
            parts.append(_adf_to_text(child))
    if node.get("type") in ("paragraph", "heading"):
        parts.append("\n")
    return "".join(parts)


def _component_names(fields: dict) -> list[str]:
    raw = fields.get("components") or []
    names: list[str] = []
    for item in raw:
        if isinstance(item, dict) and item.get("name"):
            names.append(str(item["name"]).strip())
    return names


def _primary_category(fields: dict) -> str:
    names = _component_names(fields)
    return names[0] if names else UNCATEGORIZED


def _parse_description_sections(text: str) -> dict[str, str | None]:
    """Description 내 대응 전략/조치/계획 섹션 추출 (표시용)."""
    if not text:
        return {"strategy": None, "currentAction": None, "futurePlan": None}

    patterns = {
        "strategy": r"대응\s*전략\s*[:：]\s*(.+?)(?=\n\s*현재|\n\s*미래|$)",
        "currentAction": r"현재\s*대응\s*조치\s*[:：]\s*(.+?)(?=\n\s*미래|$)",
        "futurePlan": r"미래\s*대응\s*계획\s*[:：]\s*(.+?)$",
    }
    out: dict[str, str | None] = {}
    for key, pat in patterns.items():
        m = re.search(pat, text, re.DOTALL | re.IGNORECASE)
        out[key] = m.group(1).strip() if m else None
    return out


async def _build_risk_jql(category: str | None = None) -> str:
    board_jql = await _board_jql_clause()
    core = f'labels = "{RISK_LABEL}"'
    if category and category.lower() not in ("all", ""):
        safe = category.replace('"', '\\"')
        core = f'{core} AND component = "{safe}"'
    return f"({board_jql}) AND {core}"


def get_risk_filters() -> dict[str, Any]:
    return {
        "categories": [
            {"value": "all", "label": "전체"},
            *[{"value": c, "label": c} for c in STANDARD_CATEGORIES],
            {"value": UNCATEGORIZED, "label": UNCATEGORIZED},
        ],
        "riskLabel": RISK_LABEL,
        "categoryField": "components",
        "responsePlanField": "description",
    }


def _days_between(start: datetime, end: datetime) -> float:
    return max(0.0, (end - start).total_seconds() / 86400.0)


def _issue_row(issue: dict, now: datetime) -> dict[str, Any]:
    fields = issue.get("fields", {})
    key = issue.get("key", "")
    created_dt = _parse_jira_date(fields.get("created"))
    resolved_dt = _parse_jira_date(fields.get("resolutiondate"))
    done = _is_done(fields)

    if created_dt and created_dt.tzinfo is None:
        created_dt = created_dt.replace(tzinfo=timezone.utc)
    if resolved_dt and resolved_dt.tzinfo is None:
        resolved_dt = resolved_dt.replace(tzinfo=timezone.utc)

    if done and resolved_dt and created_dt:
        age_days = _days_between(created_dt, resolved_dt)
    elif created_dt:
        age_days = _days_between(created_dt, now)
    else:
        age_days = 0.0

    description = _description_text(fields.get("description"))
    sections = _parse_description_sections(description)
    components = _component_names(fields)

    return {
        "issueKey": key,
        "issueUrl": _issue_browse_url(key) if key else "",
        "summary": fields.get("summary") or "",
        "status": fields.get("status", {}).get("name") or "",
        "priority": _normalize_priority(fields.get("priority", {}).get("name")),
        "category": _primary_category(fields),
        "components": components,
        "assignee": _assignee_name(fields),
        "ageDays": round(age_days, 1),
        "isDone": done,
        "responsePlan": description or None,
        "responseStrategy": sections.get("strategy"),
        "currentAction": sections.get("currentAction"),
        "futurePlan": sections.get("futurePlan"),
        "missingPlan": not bool(description.strip()),
    }


def _assignee_name(fields: dict) -> str:
    assignee = fields.get("assignee")
    if not assignee:
        return "Unassigned"
    return assignee.get("displayName") or assignee.get("name") or "Unassigned"


@cached(ttl=300)
async def get_risk_dashboard(category: str | None = None) -> dict[str, Any]:
    cat_filter = (category or "all").strip()
    jql = await _build_risk_jql(None if cat_filter.lower() == "all" else cat_filter)
    board_jql = await _board_jql_clause()

    try:
        raw_issues = await _search_all_issues(jql, SEARCH_FIELDS)
    except Exception as e:
        raise RuntimeError(f"{e} | jql={jql}") from e

    now = datetime.now(timezone.utc)
    parsed = [_issue_row(issue, now) for issue in raw_issues]

    if cat_filter.lower() != "all":
        parsed = [p for p in parsed if p["category"].lower() == cat_filter.lower()]

    total = len(parsed)
    open_items = [p for p in parsed if not p["isDone"]]
    closed_items = [p for p in parsed if p["isDone"]]
    with_plan = [p for p in parsed if p["responsePlan"]]

    by_category_map: dict[str, dict[str, int]] = {}
    for cat in STANDARD_CATEGORIES + [UNCATEGORIZED]:
        by_category_map[cat] = {"total": 0, "open": 0}
    for p in parsed:
        cat = p["category"]
        if cat not in by_category_map:
            by_category_map[cat] = {"total": 0, "open": 0}
        by_category_map[cat]["total"] += 1
        if not p["isDone"]:
            by_category_map[cat]["open"] += 1

    by_category = [
        {"category": cat, "count": vals["total"], "open": vals["open"]}
        for cat, vals in by_category_map.items()
        if vals["total"] > 0
    ]
    by_category.sort(key=lambda x: (-x["count"], x["category"]))

    plan_filled_pct = round(len(with_plan) / total * 100) if total else 100

    return {
        "meta": {
            "jql": jql,
            "boardId": settings.board_id,
            "boardScope": board_jql,
            "categoryFilter": cat_filter,
            "riskLabel": RISK_LABEL,
            "categoryField": "components",
            "responsePlanField": "description",
            "scheduleReserveDays": SCHEDULE_RESERVE_DAYS,
            "asOf": now.isoformat(),
        },
        "kpi": {
            "total": total,
            "open": len(open_items),
            "closed": len(closed_items),
            "planFilledPct": plan_filled_pct,
            "missingPlan": total - len(with_plan),
        },
        "byCategory": by_category,
        "issues": sorted(parsed, key=lambda x: (x["isDone"], x["issueKey"])),
        "openIssues": [p for p in parsed if not p["isDone"]],
    }
