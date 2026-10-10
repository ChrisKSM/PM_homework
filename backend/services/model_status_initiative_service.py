"""
모델현황 Initiative 탭 — TVPLAT Initiative JQL 조회.

필드 매핑: Davis InitiativePage INITIATIVE_FIELDS / analyze 테이블과 동일 ID.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from services.quality_service import (
    _field_text,
    _issue_browse_url,
    _search_all_issues,
)

# UI modelCode → Jira labels in (...)
INITIATIVE_JIRA_LABEL_BY_MODEL: dict[str, str] = {
    "H7_VI": "SoundSuite_H7(VI)",
}


def initiative_search_field_ids() -> list[str]:
    """Jira search fields — Davis INITIATIVE_FIELDS subset (목록·KPI용)."""
    s = settings
    return [
        "summary",
        "status",
        "assignee",
        "reporter",
        "duedate",
        "priority",
        "labels",
        "components",
        "fixVersions",
        s.initiative_start_date_field,
        s.initiative_grouping_field,
        s.initiative_categorization_field,
        s.initiative_estimated_effort_field,
    ]


def build_initiative_jql(jira_label: str, project_key: str = "TVPLAT") -> str:
    """Jira JQL — project + Initiative issuetype + model label."""
    label = jira_label.strip().replace('"', '\\"')
    proj = project_key.strip()
    return (
        f'project = {proj} AND issuetype = Initiative AND labels in ("{label}")'
    )


def normalize_model_code(model: str | None) -> str | None:
    if not model or not model.strip():
        return None
    raw = model.strip()
    compact = raw.upper().replace("-", "_").replace(" ", "_")
    if compact in INITIATIVE_JIRA_LABEL_BY_MODEL:
        return compact
    if raw.upper().replace(" ", "") in ("H7VI", "H7_VI"):
        return "H7_VI"
    if re.match(r"^H7[\s_]*VI$", raw, re.I):
        return "H7_VI"
    return compact


def resolve_initiative_label(model: str | None, label: str | None) -> str | None:
    if label and label.strip():
        return label.strip()
    key = normalize_model_code(model)
    if not key:
        return None
    return INITIATIVE_JIRA_LABEL_BY_MODEL.get(key)


def _format_due(raw: str | None) -> str:
    if not raw:
        return ""
    return raw[:10] if len(raw) >= 10 else raw


def _cf_val(raw: Any, fallback: str = "") -> str:
    """Davis cfVal — option/custom field."""
    text = _field_text(raw)
    return text if text else fallback


def format_jira_person(user: dict | None) -> str:
    """Davis formatOwner — displayName / username."""
    if not user:
        return "—"
    dn = (user.get("displayName") or user.get("name") or "").strip()
    username = (user.get("name") or "").strip()
    if "/" in dn and "(" in dn and ")" in dn:
        name_only = dn.split("/")[0].strip()
        if username:
            return f"{name_only} / {username}"
        return name_only
    if dn and username and dn != username:
        return f"{dn} / {username}"
    return dn or username or "—"


def _product_from_fields(fields: dict) -> str:
    """Components 우선, 없으면 Categorization(customfield_35516)."""
    cat = _cf_val(fields.get(settings.initiative_categorization_field))
    components = fields.get("components") or []
    names = [
        c.get("name", "")
        for c in components
        if c.get("name") and str(c.get("name")).upper() != "NA"
    ]
    if names:
        return ", ".join(names)
    if cat and cat not in ("-", "N/A"):
        return cat
    labels = fields.get("labels") or []
    if any(str(lb).startswith("SoundSuite") for lb in labels):
        return "Sound Suite"
    if any("Soundbar" in str(lb) for lb in labels):
        return "Soundbar"
    return cat or ""


def _event_from_fields(fields: dict) -> str:
    """Fix Version/s 우선, 없으면 라벨(MR*, FC, PV …)."""
    fixes = fields.get("fixVersions") or []
    fix_names = [f.get("name", "") for f in fixes if f.get("name")]
    if fix_names:
        return ", ".join(fix_names)
    labels = fields.get("labels") or []
    for lb in labels:
        s = str(lb)
        if s in ("Initial", "N/A", "FC", "PV", "MP") or s.startswith("MR"):
            return s
    release = _cf_val(fields.get(settings.release_sprint_field))
    if release and release not in ("-", "N/A"):
        return release
    return "N/A"


def map_initiative_issue(raw: dict, model: str | None) -> dict[str, Any]:
    key = raw.get("key") or ""
    fields = raw.get("fields") or {}
    status_name = (fields.get("status") or {}).get("name") or ""
    assignee_person = format_jira_person(fields.get("assignee"))
    reporter_person = format_jira_person(fields.get("reporter"))
    pm = assignee_person if assignee_person != "—" else reporter_person

    fixes = fields.get("fixVersions") or []
    fixed_in = ", ".join(f.get("name", "") for f in fixes if f.get("name"))
    effort = _cf_val(fields.get(settings.initiative_estimated_effort_field))
    grouping = _cf_val(fields.get(settings.initiative_grouping_field))

    return {
        "key": key,
        "summary": fields.get("summary") or "",
        "status": status_name,
        "due": _format_due(fields.get("duedate")),
        "assignee": assignee_person,
        "product": _product_from_fields(fields),
        "event": _event_from_fields(fields),
        "pm": pm,
        "fixedIn": fixed_in,
        "score": effort,
        "grouping": grouping,
        "startDate": _format_due(fields.get(settings.initiative_start_date_field)),
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
    issues = await _search_all_issues(jql, initiative_search_field_ids())
    mapped = [map_initiative_issue(i, model) for i in issues]

    return {
        "meta": {
            "jql": jql,
            "model": model,
            "label": jira_label,
            "projectKey": project_key,
            "total": len(mapped),
            "asOf": datetime.now(timezone.utc).isoformat(),
            "jiraBaseUrl": settings.jira_base_url.rstrip("/"),
            "fieldMap": {
                "startDate": settings.initiative_start_date_field,
                "grouping": settings.initiative_grouping_field,
                "categorization": settings.initiative_categorization_field,
                "estimatedEffort": settings.initiative_estimated_effort_field,
            },
        },
        "issues": mapped,
    }
