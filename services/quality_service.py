"""
품질 이슈 현황 — Jira Bug + 이벤트 Label 기준 집계.
"""
from __future__ import annotations

import statistics
from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client

RESPONSE_PLAN_FIELD = settings.response_plan_field
RESPONSE_ACTION_FIELD = settings.response_action_field

EVENT_PHASES: dict[str, list[dict[str, str]]] = {
    "DEV": [
        {"phase": "1", "label": "DEV 1차", "jiraLabel": "DEV1_BUG"},
        {"phase": "2", "label": "DEV 2차", "jiraLabel": "DEV2_BUG"},
        {"phase": "3", "label": "DEV 3차", "jiraLabel": "DEV3_BUG"},
    ],
    "FC": [
        {"phase": "1", "label": "FC 1차", "jiraLabel": "FC1_BUG"},
        {"phase": "2", "label": "FC 2차", "jiraLabel": "FC2_BUG"},
        {"phase": "3", "label": "FC 3차", "jiraLabel": "FC3_BUG"},
        {"phase": "4", "label": "FC 4차", "jiraLabel": "FC4_BUG"},
    ],
    "PV": [
        {"phase": "1", "label": "PV 1차", "jiraLabel": "PV1"},
        {"phase": "2", "label": "PV 2차", "jiraLabel": "PV2"},
        {"phase": "3", "label": "PV 3차", "jiraLabel": "PV3"},
        {"phase": "4", "label": "PV 4차", "jiraLabel": "PV4"},
    ],
    "AUTO": [
        {"phase": "1", "label": "자동화 1차", "jiraLabel": "Auto1"},
        {"phase": "2", "label": "자동화 2차", "jiraLabel": "Auto2"},
    ],
}

AGING_BUCKET_LABELS = ["0–1일", "2–3일", "4–7일", "8–14일", "15일+"]
PRIORITY_ORDER = ["P0", "P1", "P2", "P3"]
HIGH_PRIORITY_OPEN = ("P0", "P1", "P2")

# board 12641 Bug — Jira label 기준 기능 분류 (대소문자 무시)
FEATURE_CATEGORY_LABELS = [
    "VFD",
    "BT",
    "Wireless",
    "Audio",
    "APP",
    "ARC",
    "Demo",
    "EQ",
    "System",
    "APD",
    "Key",
    "USB",
    "eARC",
    "Hidden Key",
]
FEATURE_CATEGORY_OTHER = "기타"

# Agile board API 불가 pod — board_id → project scope fallback (LGE audio)
BOARD_PROJECT_BY_ID: dict[int, str] = {
    12641: "MLCSIXZERO",
}


def _resolve_phase(event: str, phase: str) -> dict[str, str] | None:
    phases = EVENT_PHASES.get(event.upper())
    if not phases:
        return None
    for item in phases:
        if item["phase"] == str(phase):
            return item
    return phases[0] if phases else None


def _parse_jira_date(value: str | None) -> datetime | None:
    if not value:
        return None
    raw = value.strip()
    if raw.endswith("+0900"):
        raw = raw[:-5] + "+09:00"
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _days_between(start: datetime, end: datetime) -> float:
    return max(0.0, (end - start).total_seconds() / 86400.0)


def _aging_bucket(days: float) -> str:
    d = int(days)
    if d <= 1:
        return "0–1일"
    if d <= 3:
        return "2–3일"
    if d <= 7:
        return "4–7일"
    if d <= 14:
        return "8–14일"
    return "15일+"


def _normalize_priority(name: str | None) -> str:
    if not name:
        return "P3"
    upper = name.strip().upper()
    if upper in PRIORITY_ORDER:
        return upper
    mapping = {
        "BLOCKER": "P0",
        "HIGHEST": "P0",
        "CRITICAL": "P0",
        "HIGH": "P1",
        "MEDIUM": "P2",
        "LOW": "P3",
        "LOWEST": "P3",
    }
    return mapping.get(upper, "P3")


def _issue_labels(fields: dict) -> list[str]:
    return [str(l) for l in (fields.get("labels") or [])]


def _normalize_label_token(label: str) -> str:
    return label.strip().lower().replace("_", " ")


def _feature_category(labels: list[str]) -> str:
    """이슈 labels 중 FEATURE_CATEGORY_LABELS 와 일치하는 첫 항목."""
    normalized = {_normalize_label_token(l): l for l in labels}
    for cat in FEATURE_CATEGORY_LABELS:
        key = _normalize_label_token(cat)
        if key in normalized:
            return cat
    return FEATURE_CATEGORY_OTHER


def _field_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return (value.get("value") or value.get("name") or "").strip()
    return str(value).strip()


def _assignee_name(fields: dict) -> str:
    assignee = fields.get("assignee")
    if not assignee:
        return "Unassigned"
    return assignee.get("displayName") or assignee.get("name") or "Unassigned"


def _is_done(fields: dict) -> bool:
    cat = (
        fields.get("status", {})
        .get("statusCategory", {})
        .get("key", "")
    )
    return cat == settings.done_status_category


def _increment_bucket(buckets: dict[str, int], days: float) -> None:
    label = _aging_bucket(days)
    buckets[label] = buckets.get(label, 0) + 1


async def _search_all_issues(jql: str, fields: list[str]) -> list[dict]:
    issues: list[dict] = []
    start_at = 0
    page_size = 100
    while True:
        data = await jira_client.search(
            jql,
            fields=fields,
            max_results=page_size,
            start_at=start_at,
        )
        batch = data.get("issues", [])
        issues.extend(batch)
        total = data.get("total", len(issues))
        if not batch or start_at + len(batch) >= total:
            break
        start_at += len(batch)
    return issues


@cached(ttl=600)
async def _project_key_from_board_api(board_id: int) -> str:
    """Agile board/project API에서 projectKey 추출."""
    for path in (
        f"/rest/agile/1.0/board/{board_id}",
        f"/rest/agile/1.0/board/{board_id}/project",
    ):
        try:
            data = await jira_client.get(path)
        except Exception:
            continue
        location = data.get("location") or {}
        if location.get("projectKey"):
            return str(location["projectKey"])
        if data.get("projectKey"):
            return str(data["projectKey"])
        project = data.get("project") or {}
        if isinstance(project, dict) and project.get("key"):
            return str(project["key"])
        for item in data.get("values") or []:
            if isinstance(item, dict) and item.get("key"):
                return str(item["key"])
    return ""


@cached(ttl=600)
async def _board_jql_clause() -> str:
    """settings.board_id 보드 filter JQL — 타 프로젝트 동일 label 혼입 방지."""
    board_id = settings.board_id
    try:
        if hasattr(jira_client, "get_board_filter_jql"):
            try:
                jql = await jira_client.get_board_filter_jql(board_id=board_id)
            except TypeError:
                jql = await jira_client.get_board_filter_jql()
            if jql:
                return jql
    except Exception:
        pass

    try:
        board_info = await jira_client.get(f"/rest/agile/1.0/board/{board_id}")
        filter_id = (board_info.get("filter") or {}).get("id")
        if filter_id:
            try:
                filt = await jira_client.get(f"/rest/api/2/filter/{filter_id}")
                jql = (filt.get("jql") or "").strip()
                if jql:
                    return jql
            except Exception:
                pass
            return f"filter = {filter_id}"
    except Exception:
        pass

    project_key = await _project_key_from_board_api(board_id)
    if project_key:
        return f"project = {project_key}"

    project_key = (getattr(settings, "quality_project_key", "") or "").strip()
    if project_key:
        return f"project = {project_key}"

    known_project = BOARD_PROJECT_BY_ID.get(board_id)
    if known_project:
        return f"project = {known_project}"

    raise RuntimeError(
        f"board_id={board_id} 보드 filter JQL을 가져올 수 없습니다. "
        "pod .env에 QUALITY_PROJECT_KEY=MLCSIXZERO 추가 또는 Agile board/filter 권한 확인."
    )


async def _build_quality_jql(jira_label: str) -> str:
    """보드 filter(12641) + Bug + event label — label 단독 검색 금지."""
    board_jql = await _board_jql_clause()
    bug_clause = f'issuetype = "Bug" AND labels = "{jira_label}"'
    return f"({board_jql}) AND {bug_clause}"


async def _search_quality_issues(jql: str, search_fields: list[str]) -> list[dict]:
    base_fields = [
        "summary",
        "status",
        "priority",
        "labels",
        "assignee",
        "created",
        "resolutiondate",
    ]
    try:
        return await _search_all_issues(jql, search_fields)
    except Exception as e:
        extra = [f for f in search_fields if f not in base_fields]
        if extra:
            try:
                return await _search_all_issues(jql, base_fields)
            except Exception as e2:
                raise RuntimeError(f"{e2} | jql={jql}") from e2
        raise RuntimeError(f"{e} | jql={jql}") from e


def _issue_browse_url(issue_key: str) -> str:
    base = settings.jira_base_url.rstrip("/")
    return f"{base}/browse/{issue_key}"


def get_quality_filters() -> dict[str, Any]:
    return {
        "eventGroups": [
            {"value": "DEV", "label": "DEV"},
            {"value": "FC", "label": "FC"},
            {"value": "PV", "label": "PV"},
            {"value": "AUTO", "label": "자동화"},
        ],
        "phases": EVENT_PHASES,
        "featureCategories": [
            {"value": "all", "label": "전체"},
            *[{"value": cat, "label": cat} for cat in FEATURE_CATEGORY_LABELS],
            {"value": FEATURE_CATEGORY_OTHER, "label": FEATURE_CATEGORY_OTHER},
        ],
    }


@cached(ttl=300)
async def get_quality_dashboard(
    event: str = "DEV",
    phase: str = "1",
    category: str | None = None,
) -> dict[str, Any]:
    phase_info = _resolve_phase(event, phase)
    if not phase_info:
        raise ValueError(f"Unknown event/phase: {event}/{phase}")

    jira_label = phase_info["jiraLabel"]
    board_jql = await _board_jql_clause()
    jql = await _build_quality_jql(jira_label)

    search_fields = [
        "summary",
        "status",
        "priority",
        "labels",
        "assignee",
        "created",
        "resolutiondate",
    ]
    if RESPONSE_PLAN_FIELD:
        search_fields.append(RESPONSE_PLAN_FIELD)
    if RESPONSE_ACTION_FIELD:
        search_fields.append(RESPONSE_ACTION_FIELD)

    raw_issues = await _search_quality_issues(jql, search_fields)
    now = datetime.now(timezone.utc)

    parsed: list[dict[str, Any]] = []
    for issue in raw_issues:
        fields = issue.get("fields", {})
        labels = _issue_labels(fields)
        cat = _feature_category(labels)
        if category and category.lower() != "all":
            if cat.lower() != category.lower():
                continue

        created_dt = _parse_jira_date(fields.get("created"))
        resolved_dt = _parse_jira_date(fields.get("resolutiondate"))
        done = _is_done(fields)
        pri = _normalize_priority(fields.get("priority", {}).get("name"))

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

        response_plan = _field_text(fields.get(RESPONSE_PLAN_FIELD)) if RESPONSE_PLAN_FIELD else ""
        response_action = _field_text(fields.get(RESPONSE_ACTION_FIELD)) if RESPONSE_ACTION_FIELD else ""

        key = issue.get("key", "")
        parsed.append(
            {
                "issueKey": key,
                "issueUrl": _issue_browse_url(key) if key else "",
                "priority": pri,
                "category": cat,
                "summary": fields.get("summary") or "",
                "status": fields.get("status", {}).get("name") or "",
                "assignee": _assignee_name(fields),
                "ageDays": round(age_days, 1),
                "isDone": done,
                "responsePlan": response_plan or None,
                "responseAction": response_action or None,
            }
        )

    discovered = len(parsed)
    resolved_items = [p for p in parsed if p["isDone"]]
    open_items = [p for p in parsed if not p["isDone"]]
    resolved = len(resolved_items)
    open_count = len(open_items)
    p0p1p2_open = [p for p in open_items if p["priority"] in HIGH_PRIORITY_OPEN]

    by_priority_map: dict[str, dict[str, int]] = {
        p: {"discovered": 0, "resolved": 0, "open": 0} for p in PRIORITY_ORDER
    }
    for p in parsed:
        slot = by_priority_map[p["priority"]]
        slot["discovered"] += 1
        if p["isDone"]:
            slot["resolved"] += 1
        else:
            slot["open"] += 1

    by_category_map: dict[str, int] = {cat: 0 for cat in FEATURE_CATEGORY_LABELS}
    by_category_map[FEATURE_CATEGORY_OTHER] = 0
    for p in parsed:
        by_category_map[p["category"]] = by_category_map.get(p["category"], 0) + 1

    resolve_aging: dict[str, int] = {label: 0 for label in AGING_BUCKET_LABELS}
    open_aging: dict[str, int] = {label: 0 for label in AGING_BUCKET_LABELS}
    resolve_days_list: list[float] = []
    open_days_list: list[float] = []
    p0p1p2_resolve_days: list[float] = []

    for p in resolved_items:
        _increment_bucket(resolve_aging, p["ageDays"])
        resolve_days_list.append(p["ageDays"])
        if p["priority"] in HIGH_PRIORITY_OPEN:
            p0p1p2_resolve_days.append(p["ageDays"])

    for p in open_items:
        _increment_bucket(open_aging, p["ageDays"])
        open_days_list.append(p["ageDays"])

    avg_resolve = round(statistics.mean(resolve_days_list), 1) if resolve_days_list else 0.0
    median_resolve = round(statistics.median(resolve_days_list), 1) if resolve_days_list else 0.0
    avg_open = round(statistics.mean(open_days_list), 1) if open_days_list else 0.0
    p0p1p2_avg = round(statistics.mean(p0p1p2_resolve_days), 1) if p0p1p2_resolve_days else 0.0

    avg_by_pri: list[dict[str, Any]] = []
    for pri in PRIORITY_ORDER:
        days = [p["ageDays"] for p in resolved_items if p["priority"] == pri]
        avg_by_pri.append(
            {"priority": pri, "days": round(statistics.mean(days), 1) if days else 0.0}
        )

    def _sort_open(rows: list[dict]) -> list[dict]:
        order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
        return sorted(rows, key=lambda r: (order.get(r["priority"], 9), -r["ageDays"]))

    p0p1p2_rows = [
        {
            "issueKey": p["issueKey"],
            "issueUrl": p["issueUrl"],
            "priority": p["priority"],
            "category": p["category"],
            "summary": p["summary"],
            "status": p["status"],
            "assignee": p["assignee"],
            "ageDays": p["ageDays"],
            "responsePlan": p["responsePlan"],
            "responseAction": p["responseAction"],
            "missingPlan": not p["responsePlan"],
        }
        for p in _sort_open(p0p1p2_open)
    ]

    open_rows = [
        {
            "issueKey": p["issueKey"],
            "issueUrl": p["issueUrl"],
            "priority": p["priority"],
            "category": p["category"],
            "summary": p["summary"],
            "status": p["status"],
            "assignee": p["assignee"],
            "ageDays": p["ageDays"],
            "responsePlan": p["responsePlan"],
            "responseAction": p["responseAction"],
            "missingPlan": False,
        }
        for p in _sort_open(open_items)
    ]

    resolve_rate = round(resolved / discovered * 100) if discovered else 0

    return {
        "meta": {
            "event": event.upper(),
            "phase": str(phase),
            "phaseLabel": phase_info["label"],
            "jiraLabel": jira_label,
            "jql": jql,
            "boardId": settings.board_id,
            "boardScope": board_jql,
            "categoryFilter": category or "all",
            "responsePlanField": RESPONSE_PLAN_FIELD or None,
            "responseActionField": RESPONSE_ACTION_FIELD or None,
        },
        "kpi": {
            "discovered": discovered,
            "resolved": resolved,
            "open": open_count,
            "p0p1p2Open": len(p0p1p2_open),
            "p1p2Open": len(p0p1p2_open),
            "resolveRatePct": resolve_rate,
        },
        "agingKpi": {
            "avgResolveDays": avg_resolve,
            "medianResolveDays": median_resolve,
            "avgOpenAgeDays": avg_open,
            "p0p1p2AvgResolveDays": p0p1p2_avg,
            "p1p2AvgResolveDays": p0p1p2_avg,
        },
        "byPriority": [
            {"priority": pri, **by_priority_map[pri]} for pri in PRIORITY_ORDER
        ],
        "byCategory": [
            {"category": cat, "count": by_category_map.get(cat, 0)}
            for cat in [*FEATURE_CATEGORY_LABELS, FEATURE_CATEGORY_OTHER]
            if by_category_map.get(cat, 0) > 0
        ],
        "resolveAgingBuckets": [
            {"label": label, "count": resolve_aging.get(label, 0)} for label in AGING_BUCKET_LABELS
        ],
        "openAgingBuckets": [
            {"label": label, "count": open_aging.get(label, 0)} for label in AGING_BUCKET_LABELS
        ],
        "avgResolveByPriority": avg_by_pri,
        "p0p1p2OpenIssues": p0p1p2_rows,
        "p1p2OpenIssues": p0p1p2_rows,
        "openIssues": open_rows,
    }
