"""
모델현황 Initiative 탭 — TVPLAT Initiative JQL 조회.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from services.quality_service import (
    _assignee_name,
    _issue_browse_url,
    _search_all_issues,
)

# UI modelCode → Jira labels in (...)
INITIATIVE_JIRA_LABEL_BY_MODEL: dict[str, str] = {
    "H7_VI": "SoundSuite_H7(VI)",
}

INITIATIVE_SEARCH_FIELDS = [
    "summary",
    "status",
    "assignee",
    "reporter",
    "duedate",
    "labels",
    "components",
]


def build_initiative_jql(jira_label: str, project_key: str = "TVPLAT") -> str:
    """Jira JQL — project + Initiative issuetype + model label."""
    label = jira_label.strip().replace('"', '\\"')
    proj = project_key.strip()
    return (
        f'project = {proj} AND issuetype = Initiative AND labels in ("{label}")'
    )


def resolve_initiative_label(model: str | None, label: str | None) -> str | None:
    if label and label.strip():
        return label.strip()
    if not model or not model.strip():
        return None
    key = model.strip().upper().replace("-", "_").replace(" ", "_")
    return INITIATIVE_JIRA_LABEL_BY_MODEL.get(key)


def _format_due(raw: str | None) -> str:
    if not raw:
        return ""
    return raw[:10] if len(raw) >= 10 else raw


def _reporter_name(fields: dict) -> str:
    rep = fields.get("reporter")
    if not rep:
        return ""
    return rep.get("displayName") or rep.get("name") or ""


def _product_from_fields(fields: dict) -> str:
    components = fields.get("components") or []
    if components:
        names = [c.get("name", "") for c in components if c.get("name")]
        if names:
            return ", ".join(names)
    labels = fields.get("labels") or []
    if any(str(lb).startswith("SoundSuite") for lb in labels):
        return "Sound Suite"
    if any("Soundbar" in str(lb) for lb in labels):
        return "Soundbar"
    return ""


def _event_from_labels(labels: list[Any]) -> str:
    for lb in labels:
        s = str(lb)
        if s in ("Initial", "N/A", "FC", "PV", "MP") or s.startswith("MR"):
            return s
    return "N/A"


def _map_issue(raw: dict, model: str | None) -> dict[str, Any]:
    key = raw.get("key") or ""
    fields = raw.get("fields") or {}
    labels = fields.get("labels") or []
    status_obj = fields.get("status") or {}
    status_name = status_obj.get("name") or ""
    assignee = _assignee_name(fields)
    reporter = _reporter_name(fields)
    pm = reporter or assignee

    return {
        "key": key,
        "summary": fields.get("summary") or "",
        "status": status_name,
        "due": _format_due(fields.get("duedate")),
        "assignee": assignee,
        "product": _product_from_fields(fields),
        "event": _event_from_labels(labels),
        "pm": pm or "—",
        "issueUrl": _issue_browse_url(key),
        "model": model,
    }


@cached(ttl=300)
async def get_initiatives_for_model(
    model: str | None = None,
    label: str | None = None,
    project_key: str = "TVPLAT",
) -> dict[str, Any]:
    jira_label = resolve_initiative_label(model, label)
    if not jira_label:
        raise ValueError(
            f"Unknown model/label for Initiative JQL (model={model!r}, label={label!r})"
        )

    jql = build_initiative_jql(jira_label, project_key=project_key)
    issues = await _search_all_issues(jql, INITIATIVE_SEARCH_FIELDS)
    mapped = [_map_issue(i, model) for i in issues]

    return {
        "meta": {
            "jql": jql,
            "model": model,
            "label": jira_label,
            "projectKey": project_key,
            "total": len(mapped),
            "asOf": datetime.now(timezone.utc).isoformat(),
            "jiraBaseUrl": settings.jira_base_url.rstrip("/"),
        },
        "issues": mapped,
    }
