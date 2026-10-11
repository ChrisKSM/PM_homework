"""모델현황 릴리즈 Gantt — TV Jira Epic · Milestone + 2026 SP calendar."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from services.release_sprint_calendar_2026 import (
    calendar_payload,
    nearest_sprint_for_day,
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
from tvjira_client import tvjira_get_issue, tvjira_issue_browse_url, tvjira_search_all

# Pod/FE 에서 구버전(cf[10801] Milestone JQL) 배포 여부 확인용
RELEASE_GANTT_SERVICE_BUILD = "2026-03-11-demo-epic-all-initiatives-v6"

_DEMO_EPIC_PREFIX = "[Demo]"

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


def _looks_like_epic(issuetype: Any) -> bool:
    name = _field_text(issuetype).lower()
    return "epic" in name or "에픽" in name or name in ("feature", "capability", "enabler")


def _issue_key_from_ref(val: Any) -> str | None:
    if val is None:
        return None
    if isinstance(val, str):
        s = val.strip()
        if re.match(r"^[A-Z][A-Z0-9]+-\d+$", s):
            return s
        return None
    if isinstance(val, dict):
        k = val.get("key")
        return str(k).strip() if k else None
    return None


def _epic_key_from_work_fields(fields: dict[str, Any]) -> str | None:
    """Story/Task 등에서 Epic Link · parent 로 Epic key 추출."""
    ek = _issue_key_from_ref(fields.get(settings.epic_link_field))
    if ek:
        return ek
    parent = fields.get("parent")
    if isinstance(parent, dict):
        pk = parent.get("key")
        ptype = (parent.get("fields") or {}).get("issuetype")
        if pk and (_looks_like_epic(ptype) or not _field_text(ptype)):
            return pk
    return None


def _cf_num(field_id: str) -> str:
    return field_id.replace("customfield_", "") if field_id.startswith("customfield_") else field_id


def _epic_jqls_from_initiative_metadata(_inits: list[dict], _project: str) -> list[str]:
    """fixVersion-only JQL 은 TVPLAT 전체 Epic(200+)을 끌어와 Gantt/FE 를 망가뜨림 — 사용 안 함."""
    return []


def _normalize_issue_summary(summary: str) -> str:
    return " ".join((summary or "").split())


def expected_demo_epic_summaries(initiative_summary: str) -> list[str]:
    """Initiative 제목 앞에 [Demo] — Milestone 담당 Epic summary."""
    base = (initiative_summary or "").strip()
    if not base:
        return []
    return [f"{_DEMO_EPIC_PREFIX}{base}", f"{_DEMO_EPIC_PREFIX} {base}"]


def _strip_demo_prefix(epic_summary: str) -> str | None:
    s = (epic_summary or "").strip()
    if not s.startswith(_DEMO_EPIC_PREFIX):
        return None
    rest = s[len(_DEMO_EPIC_PREFIX) :].lstrip()
    return _normalize_issue_summary(rest) if rest else None


def pick_demo_epic(linked_epic_rows: list[dict], initiative_summary: str) -> dict | None:
    """linkedIssues Epic 중 Initiative 와 짝인 [Demo]… Epic 1건."""
    if not linked_epic_rows:
        return None
    exact = {_normalize_issue_summary(s) for s in expected_demo_epic_summaries(initiative_summary)}
    base_norm = _normalize_issue_summary(initiative_summary)
    demo_typed: list[dict] = []
    for raw in linked_epic_rows:
        fields = raw.get("fields") or {}
        if not _looks_like_epic(fields.get("issuetype")):
            continue
        summary = fields.get("summary") or ""
        es = _normalize_issue_summary(summary)
        if es in exact:
            return raw
        tail = _strip_demo_prefix(summary)
        if tail and base_norm and tail == base_norm:
            return raw
        if summary.strip().startswith(_DEMO_EPIC_PREFIX):
            demo_typed.append(raw)
    base = (initiative_summary or "").strip()
    for raw in demo_typed:
        es = (raw.get("fields") or {}).get("summary") or ""
        if base and base in es:
            return raw
    if len(demo_typed) == 1:
        return demo_typed[0]
    return None


def linked_epic_jql_for_initiative(initiative_key: str, project: str) -> str:
    """Initiative 1건 → linked Epic (TV Jira Server: linkedIssues 키 1개)."""
    k = initiative_key.strip().replace('"', '\\"')
    return (
        f"project = {project} AND issuetype in (Epic, epic) "
        f'AND issue in linkedIssues("{k}") ORDER BY created DESC'
    )


def demo_milestone_jql_for_epic(epic_key: str, project: str) -> str:
    """Milestone — Epic Link only (fixVersion 없음, TV Gantt 수동 JQL 과 동일)."""
    ek = epic_key.strip().replace('"', '\\"')
    return (
        f"project = {project} AND issuetype in (Milestone, mileStone, milestone) "
        f'AND "Epic Link" = {ek} ORDER BY created DESC'
    )


def _initiative_epic_jqls(initiative_keys: list[str], project: str) -> list[str]:
    """Initiative 1건당 Epic — Jira Server linkedIssues 는 키 1개씩."""
    jqls: list[str] = []
    for ik in initiative_keys[:40]:
        k = ik.strip().replace('"', '\\"')
        if not k:
            continue
        jqls.append(
            f'project = {project} AND issuetype in (Epic, epic) '
            f'AND issue in linkedIssues("{k}") ORDER BY created DESC'
        )
        jqls.append(
            f'project = {project} AND issuetype in (Epic, epic) '
            f'AND parent = "{k}" ORDER BY created DESC'
        )
    return jqls


def _collect_milestone_fix_versions(inits: list[dict]) -> list[str]:
    """Milestone JQL — Initiative fixVersion 여러 개 + Audio_2025 fallback (TV Jira)."""
    fallback = (
        getattr(settings, "release_gantt_milestone_fix_version", None) or "Audio_2025"
    ).strip() or "Audio_2025"
    names: list[str] = []
    for raw in inits:
        for fv in (raw.get("fields") or {}).get("fixVersions") or []:
            n = (fv.get("name") or "").strip()
            if n and n not in names:
                names.append(n)
    audio = sorted([n for n in names if "audio" in n.lower()], reverse=True)
    rest = [n for n in names if n not in audio]
    ordered = audio + rest
    for extra in (fallback, "Audio_2025", "Audio_2026"):
        if extra and extra not in ordered:
            ordered.append(extra)
    out: list[str] = []
    for n in ordered:
        if n not in out:
            out.append(n)
    return out[:8]


def _resolve_milestone_fix_version(inits: list[dict]) -> str:
    versions = _collect_milestone_fix_versions(inits)
    return versions[0] if versions else "Audio_2025"


def _milestone_jql_for_epic(epic_key: str, fix_versions: list[str], project: str) -> str:
    """Epic Link + fixVersion 으로 Milestone 이슈 조회 (TV Jira Gantt 기준)."""
    variants = _milestone_jql_variants(epic_key, fix_versions, project)
    return variants[0] if variants else ""


def _milestone_jql_variants(epic_key: str, fix_versions: list[str], project: str) -> list[str]:
    """Epic Link JQL only — cf[10801] 은 TV Jira Server 에서 400."""
    ek = epic_key.strip().replace('"', '\\"')
    if not ek:
        return []
    types = "issuetype in (Milestone, mileStone, milestone)"
    out: list[str] = []
    for fv in fix_versions or []:
        fvx = (fv or "").strip().replace('"', '\\"')
        if not fvx:
            continue
        out.append(
            f'project = {project} AND fixVersion = "{fvx}" AND {types} '
            f'AND "Epic Link" = {ek} ORDER BY created DESC'
        )
    out.append(f'project = {project} AND {types} AND "Epic Link" = {ek} ORDER BY created DESC')
    seen: set[str] = set()
    unique: list[str] = []
    for j in out:
        if j not in seen:
            seen.add(j)
            unique.append(j)
    return unique


def _chunked_key_in_jql(keys: list[str], project: str, chunk: int = 30) -> list[str]:
    jqls: list[str] = []
    for i in range(0, len(keys), chunk):
        batch = keys[i : i + chunk]
        clause = _keys_jql(batch)
        if clause:
            jqls.append(f"project = {project} AND issuetype in (Epic, epic) AND key in ({clause})")
    return jqls


def _looks_like_milestone(issuetype: Any, summary: str = "") -> bool:
    name = _field_text(issuetype).lower()
    if "milestone" in name:
        return True
    return "milestone" in (summary or "").lower() or bool(re.search(r"\bM[1-9]\d*\b", summary or "", re.I))


def _keys_jql(keys: list[str]) -> str:
    return ", ".join(f'"{k}"' for k in keys if k)


def epic_jql_candidates(
    initiative_keys: list[str],
    jira_label: str | None,
    project: str = "TVPLAT",
    discovered_epic_keys: list[str] | None = None,
) -> list[str]:
    out: list[str] = []
    if jira_label:
        lbl = jira_label.replace('"', '\\"')
        out.append(f'project = {project} AND issuetype in (Epic, epic) AND labels in ("{lbl}")')
    out.extend(_initiative_epic_jqls(initiative_keys, project))
    if discovered_epic_keys:
        out.extend(_chunked_key_in_jql(list(discovered_epic_keys)[:120], project))
    return out


async def _discover_epic_keys_from_initiative_graph(
    initiative_keys: list[str],
    errors: list[str],
) -> set[str]:
    """Initiative issuelinks · subtasks 에서 Epic key 수집."""
    found: set[str] = set()
    fields = ["issuelinks", "subtasks", "issuetype", "summary"]
    for init_key in initiative_keys[:40]:
        try:
            raw = await tvjira_get_issue(init_key, fields)
            issue_fields = raw.get("fields") or {}
            for st in issue_fields.get("subtasks") or []:
                st_key = st.get("key")
                st_type = (st.get("fields") or {}).get("issuetype")
                if st_key and _looks_like_epic(st_type):
                    found.add(st_key)
            for link in issue_fields.get("issuelinks") or []:
                for side in ("inwardIssue", "outwardIssue"):
                    linked = link.get(side)
                    if not linked:
                        continue
                    lk = linked.get("key")
                    ltype = (linked.get("fields") or {}).get("issuetype")
                    if lk and _looks_like_epic(ltype):
                        found.add(lk)
        except Exception as ex:
            errors.append(f"initiative graph {init_key}: {ex}")
    return found


async def _discover_epic_keys_from_linked_work_items(
    initiative_keys: list[str],
    project: str,
    errors: list[str],
) -> set[str]:
    """Initiative 에 링크된 Story/Task → Epic Link / parent Epic."""
    if not initiative_keys:
        return set()
    fields = ["issuetype", settings.epic_link_field, "parent", "summary"]
    found: set[str] = set()
    for ik in initiative_keys[:15]:
        k = ik.strip().replace('"', '\\"')
        if not k:
            continue
        jql = (
            f'project = {project} AND issuetype not in (Initiative) '
            f'AND issue in linkedIssues("{k}")'
        )
        try:
            rows = await tvjira_search_all(jql, fields)
        except Exception as ex:
            errors.append(f"linked work items ({k}): {ex}")
            continue
        for raw in rows:
            key = raw.get("key") or ""
            issue_fields = raw.get("fields") or {}
            if key and _looks_like_epic(issue_fields.get("issuetype")):
                found.add(key)
            ek = _epic_key_from_work_fields(issue_fields)
            if ek:
                found.add(ek)
    return found


def milestone_jql_candidates(
    epic_keys: list[str],
    fix_versions: list[str],
    project: str = "TVPLAT",
) -> list[str]:
    """Epic 1건당 대표 Milestone JQL (첫 fixVersion + Epic Link)."""
    out: list[str] = []
    for ek in epic_keys[:120]:
        k = (ek or "").strip()
        if k:
            jql = _milestone_jql_for_epic(k, fix_versions, project)
            if jql:
                out.append(jql)
    return out


async def _search_epics_for_initiatives(
    initiative_keys: list[str],
    project_key: str,
    errors: list[str],
) -> tuple[list[dict], list[str]]:
    """Label Initiative N건 → Initiative별 linkedIssues Epic JQL."""
    seen: dict[str, dict] = {}
    jql_used: list[str] = []

    for jql in _initiative_epic_jqls(initiative_keys, project_key):
        try:
            rows = await tvjira_search_all(jql, _EPIC_FIELDS)
            jql_used.append(jql)
            for raw in rows:
                key = raw.get("key") or ""
                if not key or key in seen:
                    continue
                fields = raw.get("fields") or {}
                if "parent =" in jql and not _looks_like_epic(fields.get("issuetype")):
                    continue
                seen[key] = raw
        except Exception as ex:
            errors.append(f"epic JQL failed ({jql}): {ex}")
    return list(seen.values()), jql_used


async def _search_epics_merged(
    initiative_keys: list[str],
    jira_label: str | None,
    project_key: str,
    errors: list[str],
    discovered_epic_keys: set[str] | None = None,
    extra_jqls: list[str] | None = None,
) -> tuple[list[dict], list[str]]:
    """진단·fallback — Initiative linkedIssues 우선, 그 외 후보 JQL."""
    seen: dict[str, dict] = {}
    jql_used: list[str] = []
    primary, primary_jqls = await _search_epics_for_initiatives(initiative_keys, project_key, errors)
    jql_used.extend(primary_jqls)
    for raw in primary:
        key = raw.get("key") or ""
        if key:
            seen[key] = raw

    discovered = list(discovered_epic_keys or [])
    supplemental = epic_jql_candidates(initiative_keys, jira_label, project_key, discovered) + (
        extra_jqls or []
    )
    supplemental = [j for j in supplemental if j not in jql_used]

    def _accept_epic_raw(raw: dict) -> bool:
        fields = raw.get("fields") or {}
        return _looks_like_epic(fields.get("issuetype"))

    for jql in supplemental:
        try:
            rows = await tvjira_search_all(jql, _EPIC_FIELDS)
            jql_used.append(jql)
            for raw in rows:
                key = raw.get("key") or ""
                if not key or key in seen or not _accept_epic_raw(raw):
                    continue
                seen[key] = raw
        except Exception as ex:
            errors.append(f"epic JQL failed ({jql}): {ex}")
    missing = [k for k in discovered if k not in seen]
    for jql in _chunked_key_in_jql(missing[:120], project_key):
        try:
            rows = await tvjira_search_all(jql, _EPIC_FIELDS)
            jql_used.append(jql)
            for raw in rows:
                key = raw.get("key") or ""
                if key and key not in seen and _accept_epic_raw(raw):
                    seen[key] = raw
        except Exception as ex:
            errors.append(f"epic key fetch failed: {ex}")
    return list(seen.values()), jql_used


async def _fetch_harmony_epics_for_label(jira_label: str, errors: list[str]) -> list[dict]:
    """TVPLAT Epic 0건일 때 Harmony 보드 Epic (동일 label) fallback."""
    from jira_client import jira_client

    lbl = jira_label.replace('"', '\\"')
    jql = f'labels = "{lbl}" AND issuetype in (Epic, epic) ORDER BY key ASC'
    try:
        data = await jira_client.search(jql, fields=_EPIC_FIELDS, max_results=200)
        return data.get("issues") or []
    except Exception as ex:
        errors.append(f"harmony epic fallback: {ex}")
        return []


def _harmony_issue_browse_url(issue_key: str) -> str:
    base = settings.jira_base_url.rstrip("/")
    if base.endswith("/issue"):
        base = base[: -len("/issue")]
    return f"{base}/browse/{issue_key}"


async def _discover_milestones_from_epic_graph(
    epic_keys: list[str],
    errors: list[str],
) -> list[dict]:
    """Epic subtasks / links 에서 Milestone 이슈 raw 수집."""
    found: dict[str, dict] = {}
    fields = ["issuelinks", "subtasks", "issuetype", "summary", "duedate", settings.initiative_start_date_field, "parent"]
    for epic_key in epic_keys[:40]:
        try:
            raw = await tvjira_get_issue(epic_key, fields)
            issue_fields = raw.get("fields") or {}
            for st in issue_fields.get("subtasks") or []:
                st_key = st.get("key")
                st_fields = st.get("fields") or {}
                summary = st_fields.get("summary") or ""
                if st_key and _looks_like_milestone(st_fields.get("issuetype"), summary):
                    found[st_key] = {"key": st_key, "fields": st_fields}
            for link in issue_fields.get("issuelinks") or []:
                for side in ("inwardIssue", "outwardIssue"):
                    linked = link.get(side)
                    if not linked:
                        continue
                    lk = linked.get("key")
                    lfields = linked.get("fields") or {}
                    summary = lfields.get("summary") or ""
                    if lk and _looks_like_milestone(lfields.get("issuetype"), summary):
                        found[lk] = {"key": lk, "fields": lfields}
        except Exception as ex:
            errors.append(f"epic milestone graph {epic_key}: {ex}")
    return list(found.values())


async def _search_milestones_merged(
    epic_keys: list[str],
    fix_versions: list[str],
    project_key: str,
    errors: list[str],
) -> tuple[list[dict], list[str]]:
    """Epic별 fixVersion(s) + Epic Link Milestone JQL."""
    seen: dict[str, dict] = {}
    jql_used: list[str] = []
    ms_fields = [
        "summary",
        "status",
        "issuetype",
        "duedate",
        "created",
        "parent",
        settings.epic_link_field,
        settings.initiative_start_date_field,
    ]
    for ek in epic_keys[:120]:
        epic_ms = 0
        variants = _milestone_jql_variants(ek, fix_versions, project_key)
        last_jql_err: str | None = None
        for jql in variants:
            try:
                rows = await tvjira_search_all(jql, ms_fields)
                jql_used.append(jql)
                for raw in rows:
                    key = raw.get("key") or ""
                    if key and key not in seen:
                        seen[key] = {**raw, "_ganttEpicKey": ek}
                        epic_ms += 1
                if epic_ms:
                    break
            except Exception as ex:
                last_jql_err = f"milestone JQL failed ({jql}): {ex}"
        if not epic_ms and last_jql_err:
            errors.append(last_jql_err)
    if not seen and epic_keys:
        for raw in await _discover_milestones_from_epic_graph(epic_keys[:40], errors):
            key = raw.get("key") or ""
            if key and key not in seen:
                seen[key] = raw
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


def _map_epic(raw: dict, idx: int, *, issue_url_fn=None) -> dict[str, Any]:
    key = raw.get("key") or ""
    fields = raw.get("fields") or {}
    start, end = _issue_start_end(fields)
    start_sp, end_sp = sprint_span_for_range(start, end)
    url_fn = issue_url_fn or tvjira_issue_browse_url
    return {
        "issueKey": key,
        "summary": fields.get("summary") or "",
        "status": _field_text(fields.get("status")),
        "startDate": start.isoformat() if start else "",
        "endDate": end.isoformat() if end else "",
        "startSp": start_sp,
        "endSp": end_sp,
        "color": _EPIC_COLORS[idx % len(_EPIC_COLORS)],
        "issueUrl": url_fn(key),
        "milestones": [],
        "source": "harmony" if issue_url_fn else "tvjira",
    }


def _sprint_from_milestone_summary(summary: str) -> int | None:
    m = re.search(r"\bM([1-9]\d*)\b", summary, re.I)
    if not m:
        return None
    n = int(m.group(1))
    preset = {1: 3, 2: 6, 3: 8, 4: 12, 5: 15, 6: 18, 7: 21, 8: 24}
    return preset.get(n, min(26, max(1, n * 3)))


def _map_milestone(raw: dict, epic_key: str | None) -> dict[str, Any] | None:
    fields = raw.get("fields") or {}
    itype = _field_text(fields.get("issuetype"))
    summary = fields.get("summary") or ""
    if not _looks_like_milestone(fields.get("issuetype"), summary):
        return None
    start, end = _issue_start_end(fields)
    sp = sprint_for_day(end or start)
    if sp is None:
        start_sp, end_sp = sprint_span_for_range(start, end)
        sp = start_sp
    if sp is None:
        created = fields.get("created")
        sp = sprint_for_day(parse_day(str(created)[:10] if created else None))
    if sp is None:
        sp = _sprint_from_milestone_summary(summary)
    if sp is None:
        sp = nearest_sprint_for_day(end or start or parse_day(str(fields.get("created", ""))[:10]))
    if sp is None:
        return None
    label = summary
    m = re.search(r"\bM[1-9]\d*\b", summary, re.I)
    if m:
        label = m.group(0).upper()
    key = raw.get("key") or ""
    parent = (
        raw.get("_ganttEpicKey")
        or _issue_key_from_ref(fields.get(settings.epic_link_field))
        or _parent_key(fields)
        or epic_key
    )
    return {
        "issueKey": key,
        "label": label,
        "sprint": sp,
        "summary": summary,
        "epicKey": parent,
        "issueUrl": tvjira_issue_browse_url(key),
        "status": _field_text(fields.get("status")),
        "dueDate": fields.get("duedate") or "",
        "issuetype": itype,
    }


_MILESTONE_SEARCH_FIELDS = [
    "summary",
    "status",
    "issuetype",
    "duedate",
    "created",
    "parent",
    settings.epic_link_field,
    settings.initiative_start_date_field,
]


async def _fetch_demo_milestone_pipeline(
    initiative_rows: list[dict],
    project_key: str,
    errors: list[str],
) -> tuple[list[dict], list[dict], list[str], list[str], list[dict[str, Any]]]:
    """
    Initiative N건 → linked Epic → summary [Demo]+Initiative 제목 Epic → Epic Link Milestone.
    Returns demo_epic_raws, milestone_raws (with _ganttEpicKey), epic_jqls, ms_jqls, inventory rows.
    """
    demo_epic_raws: list[dict] = []
    milestone_raws: list[dict] = []
    epic_jqls: list[str] = []
    ms_jqls: list[str] = []
    inventory: list[dict[str, Any]] = []
    seen_ms: set[str] = set()

    for init_raw in initiative_rows:
        init_key = init_raw.get("key") or ""
        init_fields = init_raw.get("fields") or {}
        init_summary = init_fields.get("summary") or ""
        row: dict[str, Any] = {
            "initiativeKey": init_key,
            "initiativeSummary": init_summary,
            "expectedDemoEpicSummary": expected_demo_epic_summaries(init_summary),
            "linkedEpicCount": 0,
            "demoEpicKey": None,
            "demoEpicSummary": None,
            "milestoneJql": None,
            "milestoneCount": 0,
            "milestones": [],
        }
        if not init_key:
            inventory.append(row)
            continue

        epic_jql = linked_epic_jql_for_initiative(init_key, project_key)
        epic_jqls.append(epic_jql)
        try:
            linked = await tvjira_search_all(epic_jql, _EPIC_FIELDS)
        except Exception as ex:
            errors.append(f"demo pipeline epic ({init_key}): {ex}")
            inventory.append(row)
            continue

        row["linkedEpicCount"] = len(linked)
        demo_raw = pick_demo_epic(linked, init_summary)
        if not demo_raw:
            row["demoEpicMissing"] = True
            inventory.append(row)
            continue

        demo_key = demo_raw.get("key") or ""
        demo_fields = demo_raw.get("fields") or {}
        row["demoEpicKey"] = demo_key
        row["demoEpicSummary"] = demo_fields.get("summary") or ""
        demo_epic_raws.append(demo_raw)

        ms_jql = demo_milestone_jql_for_epic(demo_key, project_key)
        row["milestoneJql"] = ms_jql
        ms_jqls.append(ms_jql)
        try:
            ms_rows = await tvjira_search_all(ms_jql, _MILESTONE_SEARCH_FIELDS)
        except Exception as ex:
            errors.append(f"demo pipeline milestone ({demo_key}): {ex}")
            inventory.append(row)
            continue

        ms_list: list[dict[str, Any]] = []
        for raw in ms_rows:
            key = raw.get("key") or ""
            tagged = {**raw, "_ganttEpicKey": demo_key}
            if key and key not in seen_ms:
                seen_ms.add(key)
                milestone_raws.append(tagged)
            ms_list.append(
                {
                    "issueKey": key,
                    "summary": (raw.get("fields") or {}).get("summary") or "",
                    "status": _field_text((raw.get("fields") or {}).get("status")),
                    "dueDate": (raw.get("fields") or {}).get("duedate") or "",
                }
            )
        row["milestoneCount"] = len(ms_rows)
        row["milestones"] = ms_list
        inventory.append(row)

    return demo_epic_raws, milestone_raws, epic_jqls, ms_jqls, inventory


async def list_demo_milestone_inventory(
    model: str | None = None,
    label: str | None = None,
    project_key: str = "TVPLAT",
    all_initiatives: bool = True,
    initiative_key: str | None = None,
) -> dict[str, Any]:
    """Initiative → [Demo] Epic → Milestone 전체 목록·건수 (JQL 진단용)."""
    jira_label = resolve_initiative_label(model, label)
    errors: list[str] = []
    init_jql = build_initiative_jql(jira_label, project_key=project_key) if jira_label else None
    inits: list[dict] = []
    if init_jql:
        inits = await tvjira_search_all(init_jql, initiative_search_field_ids())
    initiative_keys = [i.get("key") for i in inits if i.get("key")]
    scope_keys = _scope_initiative_keys(initiative_keys, initiative_key, all_initiatives)
    scope_set = set(scope_keys)
    scoped_inits = [i for i in inits if i.get("key") in scope_set]
    if initiative_key and initiative_key not in {i.get("key") for i in scoped_inits}:
        scoped_inits.insert(0, {"key": initiative_key, "fields": {"summary": ""}})

    demo_raws, ms_raws, epic_jqls, ms_jqls, inventory = await _fetch_demo_milestone_pipeline(
        scoped_inits, project_key, errors
    )
    total = len(ms_raws)
    demo_keys = [r.get("key") for r in demo_raws if r.get("key")]
    missing_demo = [r["initiativeKey"] for r in inventory if r.get("demoEpicMissing")]

    return {
        "initiativeJql": init_jql,
        "initiativeCount": len(scoped_inits),
        "initiativeKeys": scope_keys,
        "demoEpicCount": len(demo_raws),
        "demoEpicKeys": demo_keys,
        "totalMilestoneCount": total,
        "missingDemoEpicInitiativeKeys": missing_demo,
        "byInitiative": inventory,
        "epicJqlSample": epic_jqls[0] if epic_jqls else None,
        "milestoneJqlSample": ms_jqls[0] if ms_jqls else None,
        "milestoneJqls": ms_jqls,
        "errors": errors,
        "discovery": {
            "pipeline": "initiative_linkedEpic_demoSummary_milestone_epicLink",
            "serviceBuild": RELEASE_GANTT_SERVICE_BUILD,
        },
    }


def _scope_initiative_keys(
    initiative_keys: list[str],
    initiative_key: str | None,
    all_initiatives: bool,
) -> list[str]:
    """all_initiatives=true 또는 initiative_key 없음 → label Initiative 전체(~9건)."""
    if all_initiatives:
        return initiative_keys
    if initiative_key:
        k = initiative_key.strip()
        if k:
            return [k]
    return initiative_keys


@cached(ttl=300)
async def get_release_gantt(
    model: str | None = None,
    label: str | None = None,
    initiative_key: str | None = None,
    project_key: str = "TVPLAT",
    all_initiatives: bool = False,
) -> dict[str, Any]:
    jira_label = resolve_initiative_label(model, label)
    initiative_row: dict[str, Any] | None = None
    initiative_keys: list[str] = []

    inits: list[dict] = []
    init_jql = build_initiative_jql(jira_label, project_key=project_key) if jira_label else None
    if jira_label and init_jql:
        inits = await tvjira_search_all(init_jql, initiative_search_field_ids())
        initiative_keys = [i.get("key") for i in inits if i.get("key")]
        if initiative_key and initiative_key not in initiative_keys:
            initiative_keys.insert(0, initiative_key)
        elif initiative_key:
            initiative_keys = [initiative_key] + [k for k in initiative_keys if k != initiative_key]
        if inits:
            primary = initiative_key or inits[0].get("key")
            primary_raw = next((i for i in inits if i.get("key") == primary), inits[0])
            initiative_row = map_initiative_issue(primary_raw, model)
    elif initiative_key:
        initiative_keys = [initiative_key]

    epics: list[dict[str, Any]] = []
    milestones_global: list[dict[str, Any]] = []
    errors: list[str] = []
    epic_jqls: list[str] = []
    ms_jqls: list[str] = []
    discovered_epic_keys: set[str] = set()
    discovery: dict[str, Any] = {}
    milestone_fix_versions = _collect_milestone_fix_versions(inits)
    milestone_fix_version = milestone_fix_versions[0] if milestone_fix_versions else "Audio_2025"

    scope_all = all_initiatives if initiative_key else True
    scope_keys = _scope_initiative_keys(initiative_keys, initiative_key, scope_all)

    if jira_label or initiative_keys:
        scope_set = set(scope_keys)
        scoped_inits = [i for i in inits if i.get("key") in scope_set]
        if not scoped_inits and initiative_key:
            scoped_inits = [{"key": initiative_key, "fields": {"summary": ""}}]

        raw_epics, epic_jqls = await _search_epics_for_initiatives(scope_keys, project_key, errors)
        discovered_epic_keys = {r.get("key") for r in raw_epics if r.get("key")}
        discovery = {
            "pipeline": "initiative_demoEpic_milestone_epicLink",
            "serviceBuild": RELEASE_GANTT_SERVICE_BUILD,
            "milestoneJqlEpicField": "Epic Link",
            "rawLinkedEpicCount": len(raw_epics),
        }

        demo_raws, raw_ms, demo_epic_jqls, ms_jqls, demo_inventory = await _fetch_demo_milestone_pipeline(
            scoped_inits, project_key, errors
        )
        epic_jqls = list(dict.fromkeys(epic_jqls + demo_epic_jqls))
        discovery["demoEpicCount"] = len(demo_raws)
        discovery["demoMilestoneInventory"] = [
            {
                "initiativeKey": r.get("initiativeKey"),
                "demoEpicKey": r.get("demoEpicKey"),
                "milestoneCount": r.get("milestoneCount"),
            }
            for r in demo_inventory
        ]
        discovery["missingDemoEpicInitiativeKeys"] = [
            r["initiativeKey"] for r in demo_inventory if r.get("demoEpicMissing")
        ]

        demo_key_to_init = {
            (r.get("demoEpicKey") or ""): r.get("initiativeKey")
            for r in demo_inventory
            if r.get("demoEpicKey")
        }
        for i, raw in enumerate(demo_raws):
            mapped = _map_epic(raw, i)
            dk = mapped.get("issueKey") or ""
            if dk in demo_key_to_init:
                mapped["initiativeKey"] = demo_key_to_init[dk]
            epics.append(mapped)

        if not epics and jira_label:
            harmony_raw = await _fetch_harmony_epics_for_label(jira_label, errors)
            discovery["harmonyEpicKeys"] = [r.get("key") for r in harmony_raw if r.get("key")]
            for j, raw in enumerate(harmony_raw):
                epics.append(_map_epic(raw, j, issue_url_fn=_harmony_issue_browse_url))

        raw_epic_count = len(epics)
        epic_keys = [e["issueKey"] for e in epics if e.get("issueKey")]
        raw_ms_count = len(raw_ms)
        by_epic: dict[str, list[dict]] = {k: [] for k in epic_keys}
        mapped_ms_count = 0
        skipped_ms_count = 0
        for raw in raw_ms:
            f = raw.get("fields") or {}
            epic_hint = (
                raw.get("_ganttEpicKey")
                or _issue_key_from_ref(f.get(settings.epic_link_field))
                or _parent_key(f)
            )
            ms = _map_milestone(raw, epic_hint)
            if not ms:
                skipped_ms_count += 1
                continue
            mapped_ms_count += 1
            milestones_global.append(ms)
            ek = (ms.get("epicKey") or epic_hint or "").strip()
            if ek:
                by_epic.setdefault(ek, []).append(ms)
        epics = [_finalize_epic_span({**e, "milestones": by_epic.get(e["issueKey"], [])}) for e in epics]
        epics_with_ms = [e for e in epics if e.get("milestones")]
        known_epic_keys = {e["issueKey"] for e in epics if e.get("issueKey")}
        orphan_idx = len(epics)
        for ok, ms_list in by_epic.items():
            if not ms_list or ok in known_epic_keys:
                continue
            sprints = [m["sprint"] for m in ms_list if m.get("sprint")]
            start_sp = min(sprints) if sprints else 1
            end_sp = max(sprints) if sprints else start_sp
            epics.append(
                _finalize_epic_span(
                    {
                        "issueKey": ok,
                        "summary": f"(Milestone-only Epic {ok})",
                        "status": "",
                        "startDate": "",
                        "endDate": "",
                        "startSp": start_sp,
                        "endSp": end_sp,
                        "color": _EPIC_COLORS[orphan_idx % len(_EPIC_COLORS)],
                        "issueUrl": tvjira_issue_browse_url(ok),
                        "milestones": ms_list,
                        "source": "tvjira",
                    }
                )
            )
            orphan_idx += 1
            known_epic_keys.add(ok)
        milestones_global = [m for ms_list in by_epic.values() for m in ms_list]
        discovery["rawEpicCount"] = raw_epic_count
        discovery["milestoneRowsFetched"] = raw_ms_count
        discovery["milestoneMappedCount"] = mapped_ms_count
        discovery["milestoneMapSkipped"] = skipped_ms_count
        discovery["epicsWithMilestones"] = len(epics_with_ms)
        orphan_ms_keys = [k for k, v in by_epic.items() if v and k not in epic_keys][:15]
        if orphan_ms_keys:
            discovery["orphanMilestoneEpicKeys"] = orphan_ms_keys

    cal = calendar_payload()
    return {
        "meta": {
            "asOf": datetime.now(timezone.utc).isoformat(),
            "initiativeJql": init_jql,
            "milestoneFixVersion": milestone_fix_version,
            "milestoneFixVersions": milestone_fix_versions,
            "epicJqls": epic_jqls,
            "milestoneJqls": ms_jqls if (jira_label or initiative_keys) else [],
            "initiativeKey": initiative_row.get("key") if initiative_row else (initiative_keys[0] if initiative_keys else initiative_key),
            "initiativeKeys": initiative_keys,
            "initiativeCount": len(initiative_keys),
            "scopeInitiativeKeys": scope_keys,
            "allInitiatives": scope_all,
            "discoveredEpicKeys": sorted(discovered_epic_keys),
            "discovery": discovery,
            "epicCount": len(epics),
            "milestoneCount": len(milestones_global),
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


def release_gantt_error_envelope(
    *errors: str,
    model: str | None = None,
    label: str | None = None,
    failed: bool = True,
) -> dict[str, Any]:
    """FastAPI HTTPException(detail=…) 대신 curl/FE 가 meta 를 읽을 수 있게 동일 스키마."""
    cal = calendar_payload()
    err_list = [e for e in errors if e]
    return {
        "meta": {
            "asOf": datetime.now(timezone.utc).isoformat(),
            "model": model,
            "label": label,
            "initiativeJql": None,
            "milestoneFixVersion": None,
            "milestoneFixVersions": [],
            "epicJqls": [],
            "milestoneJqls": [],
            "initiativeKey": None,
            "initiativeKeys": [],
            "initiativeCount": 0,
            "scopeInitiativeKeys": [],
            "allInitiatives": False,
            "discoveredEpicKeys": [],
            "discovery": {
                "failed": failed,
                "serviceBuild": RELEASE_GANTT_SERVICE_BUILD,
            },
            "epicCount": 0,
            "milestoneCount": 0,
            "errors": err_list,
        },
        "calendar": cal,
        "initiative": None,
        "epics": [],
        "milestones": [],
    }


async def diagnose_gantt_pipeline_counts(
    model: str | None = None,
    label: str | None = None,
    project_key: str = "TVPLAT",
    milestone_fix_version: str | None = None,
    max_initiatives: int = 40,
    max_epics: int = 30,
) -> dict[str, Any]:
    """
    Initiative → Epic → Milestone 단계별 Jira 건수 (curl/스크립트용).
    initiative_key 는 무시하고 label Initiative 전체를 스캔합니다.
    """
    jira_label = resolve_initiative_label(model, label)
    errors: list[str] = []
    init_jql = build_initiative_jql(jira_label, project_key=project_key) if jira_label else None
    inits: list[dict] = []
    if init_jql:
        inits = await tvjira_search_all(init_jql, initiative_search_field_ids())
    initiative_keys = [i.get("key") for i in inits if i.get("key")][:max_initiatives]
    fix_versions = _collect_milestone_fix_versions(inits)
    if milestone_fix_version and milestone_fix_version not in fix_versions:
        fix_versions.insert(0, milestone_fix_version)
    fix_ver = fix_versions[0] if fix_versions else "Audio_2025"

    epics_by_init: dict[str, int] = {}
    epic_keys_ordered: list[str] = []
    epic_jql_samples: list[str] = []
    for ik in initiative_keys:
        jql = (
            f'project = {project_key} AND issuetype in (Epic, epic) '
            f'AND issue in linkedIssues("{ik}") ORDER BY created DESC'
        )
        epic_jql_samples.append(jql)
        try:
            rows = await tvjira_search_all(jql, ["summary", "issuetype"])
            epics_by_init[ik] = len(rows)
            for raw in rows:
                k = raw.get("key")
                if k and k not in epic_keys_ordered:
                    epic_keys_ordered.append(k)
        except Exception as ex:
            errors.append(f"epic count {ik}: {ex}")
            epics_by_init[ik] = -1

    ms_by_epic: dict[str, dict[str, Any]] = {}
    ms_jql_samples: list[str] = []
    raw_ms_total = 0
    mapped_total = 0
    ms_fields = [
        "summary",
        "status",
        "issuetype",
        "duedate",
        "created",
        "parent",
        settings.epic_link_field,
        settings.initiative_start_date_field,
    ]
    for ek in epic_keys_ordered[:max_epics]:
        hit_jql: str | None = None
        count = 0
        mapped = 0
        for jql in _milestone_jql_variants(ek, fix_versions, project_key):
            try:
                rows = await tvjira_search_all(jql, ms_fields)
                if rows:
                    hit_jql = jql
                    count = len(rows)
                    for raw in rows:
                        epic_hint = _issue_key_from_ref((raw.get("fields") or {}).get(settings.epic_link_field))
                        if _map_milestone(raw, epic_hint or ek):
                            mapped += 1
                    break
            except Exception as ex:
                errors.append(f"milestone count {ek}: {ex}")
        if hit_jql:
            ms_jql_samples.append(hit_jql)
        ms_by_epic[ek] = {"raw": count, "mapped": mapped, "jql": hit_jql}
        raw_ms_total += count
        mapped_total += mapped

    from cache import clear_cache

    await clear_cache()
    gantt_preview = await get_release_gantt(
        model=model,
        label=label,
        initiative_key=None,
        project_key=project_key,
        all_initiatives=True,
    )
    gmeta = gantt_preview.get("meta") or {}

    return {
        "label": jira_label,
        "initiativeJql": init_jql,
        "milestoneFixVersion": fix_ver,
        "milestoneFixVersions": fix_versions,
        "step1_initiatives": {"count": len(initiative_keys), "keys": initiative_keys},
        "step2_epics": {
            "totalUnique": len(epic_keys_ordered),
            "byInitiativeLinkedIssues": epics_by_init,
            "sampleJql": epic_jql_samples[0] if epic_jql_samples else None,
        },
        "step3_milestones": {
            "epicsSampled": min(len(epic_keys_ordered), max_epics),
            "rawTotal": raw_ms_total,
            "mappedTotal": mapped_total,
            "byEpic": ms_by_epic,
            "sampleJql": ms_jql_samples[0] if ms_jql_samples else None,
        },
        "ganttApi": {
            "epicCount": gmeta.get("epicCount"),
            "milestoneCount": gmeta.get("milestoneCount"),
            "scopeInitiativeKeys": len(gmeta.get("scopeInitiativeKeys") or []),
            "errors": gmeta.get("errors"),
        },
        "errors": errors,
    }


async def diagnose_release_links(
    model: str | None = None,
    label: str | None = None,
    initiative_key: str | None = None,
    project_key: str = "TVPLAT",
    all_initiatives: bool = False,
) -> dict[str, Any]:
    """Epic/Milestone 0건 원인 파악용 — Gantt 와 동일 탐색만 요약."""
    jira_label = resolve_initiative_label(model, label)
    errors: list[str] = []
    initiative_keys: list[str] = []
    inits: list[dict] = []
    if jira_label:
        inits = await tvjira_search_all(
            build_initiative_jql(jira_label, project_key=project_key),
            initiative_search_field_ids(),
        )
        initiative_keys = [i.get("key") for i in inits if i.get("key")]
    if initiative_key and initiative_key not in initiative_keys:
        initiative_keys.insert(0, initiative_key)

    scope_keys = _scope_initiative_keys(initiative_keys, initiative_key, all_initiatives)
    graph = await _discover_epic_keys_from_initiative_graph(scope_keys, errors)
    work = await _discover_epic_keys_from_linked_work_items(scope_keys, project_key, errors)
    meta_jqls = _epic_jqls_from_initiative_metadata(inits, project_key)
    merged, jqls = await _search_epics_merged(
        scope_keys,
        jira_label,
        project_key,
        errors,
        graph | work,
        extra_jqls=meta_jqls,
    )
    harmony: list[str] = []
    if not merged and jira_label:
        hr = await _fetch_harmony_epics_for_label(jira_label, errors)
        harmony = [r.get("key") for r in hr if r.get("key")]

    return {
        "model": model,
        "label": jira_label,
        "initiativeKeys": initiative_keys,
        "initiativeCount": len(initiative_keys),
        "discovery": {
            "fromInitiativeGraph": sorted(graph),
            "fromLinkedWorkItems": sorted(work),
            "harmonyEpicKeys": harmony,
        },
        "epicJqls": jqls,
        "metadataJqls": meta_jqls,
        "epicKeysFetched": [r.get("key") for r in merged],
        "epicCount": len(merged),
        "errors": errors,
    }
