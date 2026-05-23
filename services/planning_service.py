"""
계획 추적성 — Jira Release → Sprint → Epic → Story 계층 및 compliance 집계.
"""
from __future__ import annotations

import re
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client

RELEASE_FIELD = settings.release_sprint_field
EPIC_LINK_FIELD = settings.epic_link_field
EPIC_NAME_FIELD = settings.epic_name_field
AC_FIELD = settings.acceptance_criteria_field
DOD_FIELD = settings.dod_field
PRIORITY_RATIONALE_FIELD = settings.priority_rationale_field

DEFAULT_DOD_LABELS = [
    "코드 리뷰 완료",
    "단위 테스트 통과",
    "QA 완료",
    "문서 갱신",
    "보안 스캔",
    "배포 승인",
]

CHECKLIST_DEFS = [
    ("1", "Gate/Sprint 목표 1문장 (Sprint Goal / Gate Goal)"),
    ("2", "Initiative → Epic → Story → Task 계층 연결"),
    ("3", "모든 Story AC 3개+ (Given-When-Then)"),
    ("4", "팀 DoD 4~8항목 정의·적용"),
    ("5", "상위 5 Story 우선순위 근거 (MoSCoW/WSJF)"),
]


def _issue_type(issue: dict) -> str:
    return issue.get("fields", {}).get("issuetype", {}).get("name") or "Task"


def _status_category(issue: dict) -> str:
    return (
        issue.get("fields", {})
        .get("status", {})
        .get("statusCategory", {})
        .get("key", "new")
    )


def _gate_label(fields: dict) -> str:
    fix_versions = fields.get("fixVersions") or []
    if fix_versions:
        return fix_versions[0].get("name") or "Release"

    release_val = fields.get(RELEASE_FIELD)
    if release_val:
        if isinstance(release_val, dict):
            return release_val.get("value") or release_val.get("name") or str(release_val)
        return str(release_val)

    return "Unassigned Gate"


def _field_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get("value") or value.get("name") or ""
    if isinstance(value, list):
        return "\n".join(_field_text(v) for v in value if v)
    return str(value)


def _parse_ac_lines(text: str) -> list[str]:
    if not text.strip():
        return []

    lines = [ln.strip() for ln in re.split(r"[\r\n]+", text) if ln.strip()]
    ac_lines: list[str] = []
    for line in lines:
        if re.match(r"^(Given|When|Then|\*|\-|\d+[\.\)]|AC[\:\-])", line, re.I):
            ac_lines.append(line.lstrip("*- ").strip())
        elif line.lower().startswith("acceptance criteria"):
            continue
        elif "given" in line.lower() and "when" in line.lower():
            ac_lines.append(line)

    if not ac_lines and lines:
        ac_lines = [ln for ln in lines if len(ln) > 10][:5]

    return ac_lines


def _parse_acceptance_criteria(fields: dict) -> list[str]:
    if AC_FIELD:
        raw = _field_text(fields.get(AC_FIELD))
        if raw.strip():
            return _parse_ac_lines(raw)

    description = _field_text(fields.get("description"))
    return _parse_ac_lines(description)


def _priority_rationale(fields: dict) -> str | None:
    if PRIORITY_RATIONALE_FIELD:
        val = _field_text(fields.get(PRIORITY_RATIONALE_FIELD)).strip()
        return val or None
    return None


def _dod_items(fields: dict, issue: dict) -> list[dict[str, Any]]:
    if DOD_FIELD:
        raw = _field_text(fields.get(DOD_FIELD))
        if raw.strip():
            lines = [ln.strip() for ln in re.split(r"[\r\n]+", raw) if ln.strip()]
            return [{"label": ln.lstrip("*- ").strip(), "done": True} for ln in lines]

    done = _status_category(issue) == settings.done_status_category
    in_progress = _status_category(issue) == settings.inprogress_status_category
    items = []
    for i, label in enumerate(DEFAULT_DOD_LABELS):
        item_done = done or (in_progress and i < 3)
        items.append({"label": label, "done": item_done})
    return items


def _dod_done_count(items: list[dict[str, Any]]) -> int:
    return sum(1 for item in items if item.get("done"))


def _story_compliance_status(ac_count: int, dod_items: list[dict], has_epic: bool) -> str:
    dod_done = _dod_done_count(dod_items)
    dod_total = len(dod_items) or len(DEFAULT_DOD_LABELS)

    if ac_count >= 3 and dod_done >= dod_total - 1 and has_epic:
        return "ok"
    if ac_count == 0 or not has_epic:
        return "fail"
    return "warn"


def _ac_status_label(ac_count: int, required: int = 3) -> str:
    return f"{min(ac_count, required)}/{required}" if ac_count < required else f"{ac_count}/{required}"


async def _collect_story_context() -> tuple[list[dict], list[dict[str, Any]]]:
    """보드 스프린트별 Story 수집. 반환: (sprints, story_contexts)."""
    sprints = await jira_client.get_all_board_sprints()
    contexts: list[dict[str, Any]] = []
    fetch_fields = [
        "summary",
        "status",
        "issuetype",
        "fixVersions",
        "description",
        RELEASE_FIELD,
        EPIC_LINK_FIELD,
        EPIC_NAME_FIELD,
    ]
    if AC_FIELD:
        fetch_fields.append(AC_FIELD)
    if DOD_FIELD:
        fetch_fields.append(DOD_FIELD)
    if PRIORITY_RATIONALE_FIELD:
        fetch_fields.append(PRIORITY_RATIONALE_FIELD)

    for sprint in sprints:
        data = await jira_client.get_sprint_issues(sprint["id"], fields=fetch_fields)
        for issue in data.get("issues", []):
            if _issue_type(issue) not in ("Story", "Task", "Bug"):
                continue
            fields = issue.get("fields", {})
            ac_list = _parse_acceptance_criteria(fields)
            dod_items = _dod_items(fields, issue)
            epic_key = fields.get(EPIC_LINK_FIELD)
            contexts.append(
                {
                    "issue": issue,
                    "sprint": sprint,
                    "gate": _gate_label(fields),
                    "ac_list": ac_list,
                    "dod_items": dod_items,
                    "epic_key": epic_key,
                    "priority_rationale": _priority_rationale(fields),
                    "status": _story_compliance_status(len(ac_list), dod_items, bool(epic_key)),
                }
            )

    return sprints, contexts


def _apply_filters(
    contexts: list[dict[str, Any]],
    gate: str | None,
    sprint: str | None,
    status: str | None,
) -> list[dict[str, Any]]:
    filtered = contexts
    if gate and gate != "all":
        filtered = [c for c in filtered if c["gate"] == gate]
    if sprint and sprint != "all":
        filtered = [c for c in filtered if c["sprint"].get("name") == sprint]
    if status and status != "all":
        filtered = [c for c in filtered if c["status"] == status]
    return filtered


async def _epic_label(epic_key: str, cache: dict[str, str]) -> str:
    if epic_key in cache:
        return cache[epic_key]
    try:
        epic = await jira_client.get_issue(epic_key, fields=["summary", EPIC_NAME_FIELD])
        fields = epic.get("fields", {})
        label = fields.get(EPIC_NAME_FIELD) or fields.get("summary") or epic_key
    except Exception:
        label = epic_key
    cache[epic_key] = label
    return label


def _node_status_from_children(children: list[dict]) -> str:
    if not children:
        return "pending"
    statuses = [c["status"] for c in children]
    if all(s == "ok" for s in statuses):
        return "ok"
    if any(s == "fail" for s in statuses):
        return "fail" if all(s in ("fail", "pending") for s in statuses) else "warn"
    if any(s == "warn" for s in statuses):
        return "warn"
    return "pending"


@cached(ttl=300)
async def get_planning_filters() -> dict[str, Any]:
    sprints, contexts = await _collect_story_context()
    gates = sorted({c["gate"] for c in contexts})
    sprint_names = sorted({c["sprint"].get("name", "") for c in contexts if c["sprint"].get("name")})
    return {
        "gates": [{"value": g, "label": g} for g in gates],
        "sprints": [{"value": n, "label": n} for n in sprint_names],
        "sprintGoals": {s.get("name", ""): (s.get("goal") or "").strip() for s in sprints},
    }


@cached(ttl=300)
async def get_planning_compliance() -> dict[str, Any]:
    sprints, contexts = await _collect_story_context()
    total_stories = len(contexts)

    linked = sum(1 for c in contexts if c["epic_key"] and c["sprint"].get("name") and c["gate"] != "Unassigned Gate")
    ac_ok = sum(1 for c in contexts if len(c["ac_list"]) >= 3)
    sprint_with_goal = sum(1 for s in sprints if (s.get("goal") or "").strip())

    hierarchy_pct = round(linked / total_stories * 100) if total_stories else 0
    ac_pct = round(ac_ok / total_stories * 100) if total_stories else 0
    sprint_goal_pct = round(sprint_with_goal / len(sprints) * 100) if sprints else 0

    priority_filled = sum(1 for c in contexts if c["priority_rationale"])
    top_stories = sorted(contexts, key=lambda c: c["issue"]["fields"].get("priority", {}).get("id", "99"))[:5]
    priority_top_ok = sum(1 for c in top_stories if c["priority_rationale"]) >= 3

    checklist = [
        {"id": cid, "label": label, "done": done}
        for cid, label, done in [
            (CHECKLIST_DEFS[0][0], CHECKLIST_DEFS[0][1], sprint_goal_pct >= 80),
            (CHECKLIST_DEFS[1][0], CHECKLIST_DEFS[1][1], hierarchy_pct >= 70),
            (CHECKLIST_DEFS[2][0], CHECKLIST_DEFS[2][1], ac_pct >= 80),
            (CHECKLIST_DEFS[3][0], CHECKLIST_DEFS[3][1], bool(DOD_FIELD)),
            (CHECKLIST_DEFS[4][0], CHECKLIST_DEFS[4][1], priority_top_ok),
        ]
    ]

    return {
        "hierarchyLinkedPct": hierarchy_pct,
        "acCompletePct": ac_pct,
        "sprintGoalPct": sprint_goal_pct,
        "checklist": checklist,
    }


@cached(ttl=300)
async def get_planning_hierarchy(
    gate: str | None = None,
    sprint: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    _, contexts = await _collect_story_context()
    filtered = _apply_filters(contexts, gate, sprint, status)
    epic_cache: dict[str, str] = {}

    gate_map: dict[str, dict[str, Any]] = {}

    for ctx in filtered:
        gate_name = ctx["gate"]
        sprint_info = ctx["sprint"]
        sprint_name = sprint_info.get("name", f"Sprint {sprint_info.get('id')}")
        epic_key = ctx["epic_key"] or "NO-EPIC"
        issue = ctx["issue"]
        fields = issue.get("fields", {})

        if gate_name not in gate_map:
            gate_map[gate_name] = {
                "id": f"rel-{gate_name}",
                "level": "release",
                "key": gate_name,
                "label": gate_name,
                "parentId": None,
                "goal": gate_name,
                "criteria": "Exit Criteria",
                "status": "pending",
                "sprints": {},
            }

        release_node = gate_map[gate_name]
        if sprint_name not in release_node["sprints"]:
            release_node["sprints"][sprint_name] = {
                "id": f"sp-{sprint_info.get('id')}",
                "level": "sprint",
                "key": sprint_name,
                "label": sprint_name,
                "parentId": release_node["id"],
                "goal": (sprint_info.get("goal") or "").strip() or sprint_name,
                "criteria": "Sprint Goal" if (sprint_info.get("goal") or "").strip() else "Sprint Goal 미작성",
                "status": "ok" if (sprint_info.get("goal") or "").strip() else "warn",
                "epics": {},
            }

        sprint_node = release_node["sprints"][sprint_name]
        if epic_key not in sprint_node["epics"]:
            epic_label = await _epic_label(epic_key, epic_cache) if epic_key != "NO-EPIC" else "Epic 미연결"
            sprint_node["epics"][epic_key] = {
                "id": f"ep-{epic_key}",
                "level": "epic",
                "key": epic_key,
                "label": epic_label,
                "parentId": sprint_node["id"],
                "goal": epic_label,
                "criteria": "Epic Link",
                "status": "warn" if epic_key == "NO-EPIC" else "ok",
                "stories": [],
            }

        ac_count = len(ctx["ac_list"])
        sprint_node["epics"][epic_key]["stories"].append(
            {
                "id": f"st-{issue['key']}",
                "level": "story",
                "key": issue["key"],
                "label": fields.get("summary") or issue["key"],
                "parentId": sprint_node["epics"][epic_key]["id"],
                "goal": fields.get("summary") or "",
                "criteria": _ac_status_label(ac_count),
                "status": ctx["status"],
            }
        )

    result: list[dict[str, Any]] = []
    for release in gate_map.values():
        sprint_children: list[dict] = []
        for sprint_node in release["sprints"].values():
            epic_children: list[dict] = []
            for epic_node in sprint_node["epics"].values():
                stories = epic_node.pop("stories")
                epic_node["children"] = stories
                epic_node["status"] = _node_status_from_children(stories)
                epic_children.append({k: v for k, v in epic_node.items() if k != "epics"})
            sprint_node["children"] = epic_children
            sprint_node["status"] = _node_status_from_children(epic_children)
            sprint_children.append({k: v for k, v in sprint_node.items() if k != "epics"})
        release["children"] = sprint_children
        release["status"] = _node_status_from_children(sprint_children)
        result.append({k: v for k, v in release.items() if k != "sprints"})

    return sorted(result, key=lambda n: n["key"])


@cached(ttl=300)
async def get_planning_traceability(
    gate: str | None = None,
    sprint: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    _, contexts = await _collect_story_context()
    filtered = _apply_filters(contexts, gate, sprint, status)
    epic_cache: dict[str, str] = {}
    rows: list[dict[str, Any]] = []

    for ctx in filtered:
        issue = ctx["issue"]
        fields = issue.get("fields", {})
        epic_key = ctx["epic_key"] or "—"
        if ctx["epic_key"]:
            epic_display = await _epic_label(ctx["epic_key"], epic_cache)
        else:
            epic_display = "—"

        dod_items = ctx["dod_items"]
        rows.append(
            {
                "issueKey": issue["key"],
                "summary": fields.get("summary") or "",
                "gate": ctx["gate"],
                "sprint": ctx["sprint"].get("name", ""),
                "epic": epic_display if epic_key != "—" else "—",
                "acStatus": _ac_status_label(len(ctx["ac_list"])),
                "dodStatus": f"{_dod_done_count(dod_items)}/{len(dod_items) or len(DEFAULT_DOD_LABELS)}",
                "priorityRationale": ctx["priority_rationale"],
                "status": ctx["status"],
            }
        )

    return sorted(rows, key=lambda r: r["issueKey"])


@cached(ttl=120)
async def get_story_detail(issue_key: str) -> dict[str, Any]:
    fetch_fields = [
        "summary",
        "status",
        "issuetype",
        "fixVersions",
        "description",
        RELEASE_FIELD,
        EPIC_LINK_FIELD,
        EPIC_NAME_FIELD,
    ]
    if AC_FIELD:
        fetch_fields.append(AC_FIELD)
    if DOD_FIELD:
        fetch_fields.append(DOD_FIELD)
    if PRIORITY_RATIONALE_FIELD:
        fetch_fields.append(PRIORITY_RATIONALE_FIELD)

    issue = await jira_client.get_issue(issue_key, fields=fetch_fields)
    fields = issue.get("fields", {})
    gate = _gate_label(fields)
    epic_key = fields.get(EPIC_LINK_FIELD)
    epic_label = await _epic_label(epic_key, {}) if epic_key else "—"

    sprint_name = "—"
    sprint_goal = ""
    sprints = await jira_client.get_all_board_sprints()
    for sprint in sprints:
        data = await jira_client.get_sprint_issues(
            sprint["id"], fields=["summary"], max_results=1000
        )
        if any(i["key"] == issue_key for i in data.get("issues", [])):
            sprint_name = sprint.get("name", "")
            sprint_goal = (sprint.get("goal") or "").strip()
            break

    ac_list = _parse_acceptance_criteria(fields)
    dod_items = _dod_items(fields, issue)

    return {
        "issueKey": issue_key,
        "summary": fields.get("summary") or "",
        "gate": gate,
        "sprint": sprint_name,
        "epic": epic_label,
        "sprintGoal": sprint_goal or "Sprint Goal 미작성",
        "acceptanceCriteria": ac_list,
        "dodItems": dod_items,
        "priorityRationale": _priority_rationale(fields),
    }
