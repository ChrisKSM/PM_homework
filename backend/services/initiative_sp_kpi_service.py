"""
KPI-1 SP 소진율 — 모델 라벨 Initiative 9건 Description 표 + Story SP.

표 헤더(정규): 마일스톤 | 산출물 | DoD | DoD 승인자 | 이해관계자 | 스프린트 | 예상 SP | 소모 SP | 완료여부 | 기타
- 계획 SP = Σ 예상 SP
- 소진 SP = Initiative 하위 Story(customfield_10808) 합
"""
from __future__ import annotations

import re
from html import unescape
from typing import Any

from config import settings
from services.model_status_initiative_service import (
    build_initiative_jql,
    initiative_search_field_ids,
    resolve_initiative_label,
)
from services.quality_service import _field_text
from services.risk_service import _description_text
from tvjira_client import tvjira_get_issue, tvjira_search_all

_MILESTONE_ID = re.compile(r"^M[1-9]\d*$", re.I)
_DATE = re.compile(r"(\d{4}-\d{2}-\d{2})")
_SP_CELL = re.compile(r"^\d+(?:\.\d+)?$")
_WORK_ITEM_JQL_EXCLUDE = (
    "Initiative, initiative, Epic, epic, Milestone, mileStone, milestone"
)
_STORY_TYPE_JQL = "Story, story, Task, task, Sub-task, Subtask, sub-task, Bug, bug"


def _wiki_table_lines(text: str) -> str:
    """Jira wiki: ||H1||H2|| 및 |c1|c2| → TSV 줄."""
    out: list[str] = []
    for ln in text.replace("\r\n", "\n").split("\n"):
        s = ln.strip()
        if not s:
            continue
        if s.startswith("||") and "||" in s[2:]:
            inner = s.strip("|")
            cells = [c.strip() for c in re.split(r"\s*\|\|\s*", inner) if c.strip()]
            if cells:
                out.append("\t".join(cells))
            continue
        if s.startswith("|") and s.endswith("|") and not s.startswith("||"):
            inner = s.strip("|")
            cells = [c.strip() for c in inner.split("|") if c.strip() or c == ""]
            if cells:
                out.append("\t".join(cells))
            continue
        out.append(s)
    return "\n".join(out)


def _adf_node_text(node: Any) -> str:
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return "".join(_adf_node_text(n) for n in node)
    if not isinstance(node, dict):
        return str(node)
    if node.get("type") == "text":
        return str(node.get("text") or "")
    if node.get("type") == "hardBreak":
        return " "
    return _adf_node_text(node.get("content") or [])


def _adf_cell_text(cell: dict) -> str:
    return " ".join(_adf_node_text(cell).split())


def _adf_table_rows(doc: dict) -> list[str]:
    """ADF doc 안의 table → TSV 줄."""
    rows: list[str] = []

    def walk(node: Any) -> None:
        if not isinstance(node, dict):
            return
        ntype = node.get("type")
        if ntype == "table":
            for row in node.get("content") or []:
                if not isinstance(row, dict) or row.get("type") != "tableRow":
                    continue
                cells = []
                for cell in row.get("content") or []:
                    if isinstance(cell, dict) and cell.get("type") in ("tableCell", "tableHeader"):
                        cells.append(_adf_cell_text(cell))
                if cells:
                    rows.append("\t".join(cells))
            return
        for child in node.get("content") or []:
            walk(child)

    walk(doc)
    return rows


def normalize_jira_description(value: Any) -> tuple[str, str]:
    """
    description 필드 → 파싱용 plain text.
    Returns (text, sourceTag) sourceTag = str|adf|wiki|renderedHtml|empty
    """
    if value is None:
        return "", "empty"
    if isinstance(value, dict) and value.get("type") == "doc":
        table_rows = _adf_table_rows(value)
        if table_rows:
            return "\n".join(table_rows), "adf-table"
        return _description_text(value), "adf"
    text = _description_text(value)
    if not text:
        return "", "empty"
    if "||" in text and ("예상" in text or "Milestone" in text or "마일스톤" in text):
        return _wiki_table_lines(text), "wiki"
    if "<table" in text.lower():
        return text, "html"
    return text, "str"


async def fetch_initiative_description_text(initiative_key: str) -> tuple[str, str]:
    """search description 비어 있을 때 issue GET + renderedFields."""
    raw = await tvjira_get_issue(initiative_key, ["description"], expand="renderedFields")
    fields = raw.get("fields") or {}
    rendered = raw.get("renderedFields") or {}
    for candidate, tag in (
        (rendered.get("description"), "renderedHtml"),
        (fields.get("description"), "fields"),
    ):
        text, src = normalize_jira_description(candidate)
        if text.strip():
            return text, src
    return "", "empty"


def _html_tables_to_tsv(text: str) -> str | None:
    """Jira rendered description `<table>` → TSV lines."""
    if "<t" not in text.lower():
        return None
    rows_out: list[str] = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", text, flags=re.I | re.S):
        cells: list[str] = []
        for cell in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.I | re.S):
            c = re.sub(r"<[^>]+>", " ", cell, flags=re.S)
            c = unescape(c).replace("\u00a0", " ")
            c = " ".join(c.split())
            cells.append(c)
        if cells:
            rows_out.append("\t".join(cells))
    return "\n".join(rows_out) if rows_out else None


def _description_to_lines(description: str) -> list[str]:
    """Jira wiki/HTML 표 → 탭 구분 줄."""
    raw = unescape(description)
    tsv = _html_tables_to_tsv(raw)
    if tsv:
        raw = tsv
    else:
        raw = re.sub(r"<br\s*/?>", "\n", raw, flags=re.I)
        raw = re.sub(r"</tr>\s*", "\n", raw, flags=re.I)
        raw = re.sub(r"</t[dh]>\s*", "\t", raw, flags=re.I)
        raw = re.sub(r"<[^>]+>", "", raw)
    raw = raw.replace("\u00a0", " ")
    lines: list[str] = []
    for ln in raw.splitlines():
        ln = ln.strip()
        if ln:
            lines.append(ln)
    return lines


def _split_cells(line: str) -> list[str]:
    if "\t" in line:
        return [c.strip() for c in line.split("\t")]
    return [c.strip() for c in re.split(r"\s{2,}", line) if c.strip()]


def _header_index(headers: list[str]) -> dict[str, int | None]:
    idx: dict[str, int | None] = {
        "milestone": 0,
        "summary": None,
        "targetSprint": None,
        "dueDate": None,
        "plannedSp": None,
        "consumedSp": None,
        "completion": None,
    }
    for j, h in enumerate(headers):
        hl = h.lower().replace(" ", "")
        if h == "Milestone" or hl == "milestone" or "마일스톤" in h:
            idx["milestone"] = j
        if "내용" in h or "산출물" in h:
            idx["summary"] = j
        if ("target" in hl and "sprint" in hl) or h == "스프린트" or "스프린트" in h:
            idx["targetSprint"] = j
        if "due" in hl and "date" in hl:
            idx["dueDate"] = j
        if "예상" in h and "sp" in hl:
            idx["plannedSp"] = j
        if "소모" in h and "sp" in hl:
            idx["consumedSp"] = j
        if "완료" in h:
            idx["completion"] = j
    return idx


def _normalize_milestone_label(raw: str) -> str | None:
    s = (raw or "").strip()
    if not s or len(s) > 40:
        return None
    if "시작전" in s or "해당없음" in s:
        return None
    if _MILESTONE_ID.match(s):
        return s.upper()
    if re.match(r"^\d+$", s):
        return f"M{s}"
    return s[:24]


def _is_milestone_table_header(cells: list[str]) -> bool:
    if not cells:
        return False
    joined = "\t".join(cells)
    has_planned = any("예상" in c and re.search(r"SP", c, re.I) for c in cells)
    if not has_planned:
        return False
    return any(
        token in joined for token in ("마일스톤", "Milestone", "산출물", "Due date")
    )


def _parse_milestone_row_fallback(line: str) -> dict[str, Any] | None:
    """헤더 없을 때 M1 … YYYY-MM-DD SP 패턴."""
    cells = _split_cells(line)
    if not cells or not _MILESTONE_ID.match(cells[0]):
        return None
    ms = cells[0].upper()
    sp_val: float | None = None
    due: str | None = None
    for i, c in enumerate(cells):
        dm = _DATE.search(c)
        if dm:
            due = dm.group(1)
            if i + 1 < len(cells):
                nxt = cells[i + 1].strip()
                if re.match(r"^\d+(?:\.\d+)?$", nxt):
                    sp_val = float(nxt)
            break
    if sp_val is None:
        nums = [float(x) for x in re.findall(r"(?<!\d)(\d+(?:\.\d+)?)(?!\d)", " ".join(cells[1:]))]
        for n in reversed(nums):
            if 1 <= n <= 500:
                sp_val = n
                break
    if sp_val is None:
        return None
    summary = cells[1] if len(cells) > 1 else ""
    return {
        "milestone": ms,
        "summary": summary[:120],
        "targetSprint": "",
        "dueDate": due or "",
        "plannedSp": sp_val,
        "completionStatus": "",
    }


def parse_milestone_table_from_description(description: Any) -> tuple[float, list[dict[str, Any]]]:
    """
    Initiative Description Milestones 표 파싱.
    Returns (planned_sp_sum, rows).
    """
    text, _src = normalize_jira_description(description)
    if not text.strip():
        return 0.0, []

    lines = _description_to_lines(text)
    col: dict[str, int | None] | None = None
    rows: list[dict[str, Any]] = []

    for line in lines:
        cells_hdr = _split_cells(line)
        if _is_milestone_table_header(cells_hdr):
            col = _header_index(cells_hdr)
            continue
        if col is None:
            fb = _parse_milestone_row_fallback(line)
            if fb:
                rows.append(fb)
            continue

        cells = _split_cells(line)
        if len(cells) < 2:
            continue
        mi = col.get("milestone") or 0
        if mi >= len(cells):
            continue
        ms = _normalize_milestone_label(cells[mi].strip())
        sp_i = col.get("plannedSp")
        if sp_i is None or sp_i >= len(cells):
            fb = _parse_milestone_row_fallback(line)
            if fb:
                rows.append(fb)
            continue
        sp_raw = cells[sp_i].strip()
        if not _SP_CELL.match(sp_raw):
            continue
        sp = float(sp_raw)
        if not ms:
            fb = _parse_milestone_row_fallback(line)
            if fb:
                rows.append(fb)
            continue
        summary_i = col.get("summary")
        summary = cells[summary_i].strip() if summary_i is not None and summary_i < len(cells) else ""
        ts_i = col.get("targetSprint")
        due_i = col.get("dueDate")
        comp_i = col.get("completion")
        cons_i = col.get("consumedSp")
        consumed_table: float | None = None
        if cons_i is not None and cons_i < len(cells):
            cr = cells[cons_i].strip()
            if re.match(r"^\d+(?:\.\d+)?$", cr):
                consumed_table = float(cr)
        rows.append(
            {
                "milestone": ms if ms.startswith("M") else ms,
                "summary": summary[:120],
                "targetSprint": cells[ts_i].strip() if ts_i is not None and ts_i < len(cells) else "",
                "dueDate": cells[due_i].strip() if due_i is not None and due_i < len(cells) else "",
                "plannedSp": sp,
                "consumedSpInTable": consumed_table,
                "completionStatus": cells[comp_i].strip() if comp_i is not None and comp_i < len(cells) else "",
            }
        )

    seen: set[tuple[str, float]] = set()
    unique: list[dict[str, Any]] = []
    for r in rows:
        k = (r["milestone"], r["plannedSp"])
        if k in seen:
            continue
        seen.add(k)
        unique.append(r)

    total = sum(r["plannedSp"] for r in unique)
    return total, unique


def _pick_best_description_parse(
    search_text: str,
    rendered_text: str,
) -> tuple[str, float, list[dict[str, Any]], str]:
    """search vs renderedFields 중 Milestones 표 파싱이 더 풍부한 쪽."""
    p1, r1 = parse_milestone_table_from_description(search_text)
    p2, r2 = parse_milestone_table_from_description(rendered_text)
    if p2 > p1 or (p2 == p1 and len(r2) > len(r1)):
        return rendered_text, p2, r2, "renderedHtml"
    if p1 > 0 or r1:
        return search_text, p1, r1, "search"
    if rendered_text.strip():
        return rendered_text, p2, r2, "renderedHtml"
    return search_text, p1, r1, "empty"


def parse_planned_sp_from_description(description: str | None) -> tuple[float, list[dict[str, Any]]]:
    """호환 alias — milestone 표 파싱."""
    return parse_milestone_table_from_description(description)


def _story_sp(fields: dict[str, Any]) -> float:
    raw = fields.get(settings.story_points_field)
    if raw is None:
        return 0.0
    if isinstance(raw, dict):
        raw = raw.get("value") if raw.get("value") is not None else raw.get("name")
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def _is_story_done(status: Any) -> bool:
    name = _field_text(status).lower()
    return any(x in name for x in ("done", "closed", "resolved", "complete", "완료"))


async def _collect_initiative_story_sp(
    project_key: str,
    initiative_key: str,
    story_fields: list[str],
    errors: list[str],
) -> tuple[float, float, int, int]:
    """Initiative → Epic → Story/Task SP (Epic Link · parent · linkedIssues)."""
    from services.release_gantt_service import (
        _discover_epic_keys_from_linked_work_items,
        _looks_like_epic,
        _looks_like_milestone,
    )

    seen: set[str] = set()
    total = 0.0
    done = 0.0
    count = 0
    ik = initiative_key.strip().replace('"', '\\"')

    def absorb(raw: dict) -> None:
        nonlocal total, done, count
        key = raw.get("key")
        if not key or key in seen:
            return
        sf = raw.get("fields") or {}
        it = sf.get("issuetype")
        if _looks_like_epic(it) or _looks_like_milestone(it, sf.get("summary") or ""):
            return
        sp = _story_sp(sf)
        if sp <= 0:
            return
        seen.add(key)
        count += 1
        total += sp
        if _is_story_done(sf.get("status")):
            done += sp

    async def ingest(jql: str) -> None:
        try:
            for raw in await tvjira_search_all(jql, story_fields):
                absorb(raw)
        except Exception as ex:
            errors.append(f"{initiative_key} story JQL: {ex}")

    epic_keys: set[str] = set()
    epic_jql = (
        f'project = {project_key} AND issuetype in (Epic, epic) '
        f'AND issue in linkedIssues("{ik}")'
    )
    try:
        for raw_epic in await tvjira_search_all(epic_jql, ["summary", "issuetype"]):
            ek = raw_epic.get("key")
            if ek:
                epic_keys.add(ek)
    except Exception as ex:
        errors.append(f"{initiative_key} epics: {ex}")

    extra = await _discover_epic_keys_from_linked_work_items([initiative_key], project_key, errors)
    epic_keys |= extra

    await ingest(
        f'project = {project_key} AND issuetype in ({_STORY_TYPE_JQL}) '
        f'AND issue in linkedIssues("{ik}")'
    )
    await ingest(
        f'project = {project_key} AND issuetype not in ({_WORK_ITEM_JQL_EXCLUDE}) '
        f'AND issue in linkedIssues("{ik}")'
    )

    for ek in sorted(epic_keys):
        for jql in (
            f'project = {project_key} AND issuetype in ({_STORY_TYPE_JQL}) '
            f'AND "Epic Link" = {ek}',
            f'project = {project_key} AND issuetype in ({_STORY_TYPE_JQL}) '
            f'AND parent = {ek}',
            f'project = {project_key} AND issuetype not in ({_WORK_ITEM_JQL_EXCLUDE}) '
            f'AND "Epic Link" = {ek}',
            f'project = {project_key} AND issuetype not in ({_WORK_ITEM_JQL_EXCLUDE}) '
            f'AND parent = {ek}',
        ):
            await ingest(jql)

    return total, done, count, len(epic_keys)


async def debug_initiative_sp_snapshot(
    initiative_key: str,
    project_key: str = "TVPLAT",
) -> dict[str, Any]:
    """Pod 진단 — Description 파싱 · Epic · Story SP 샘플."""
    key = initiative_key.strip()
    raw = await tvjira_get_issue(key, ["summary", "description"], expand="renderedFields")
    fields = raw.get("fields") or {}
    rendered = raw.get("renderedFields") or {}
    search_text, _ = normalize_jira_description(fields.get("description"))
    rendered_text, rend_src = normalize_jira_description(rendered.get("description"))
    desc_text, planned, rows, src = _pick_best_description_parse(search_text, rendered_text)
    story_fields = [
        "summary",
        "status",
        "issuetype",
        "parent",
        settings.story_points_field,
        settings.epic_link_field,
    ]
    errs: list[str] = []
    consumed, done, scount, epics = await _collect_initiative_story_sp(
        project_key, key, story_fields, errs
    )
    sample_issues: list[dict[str, Any]] = []
    try:
        jql = f'project = {project_key} AND issuetype in ({_STORY_TYPE_JQL}) AND issue in linkedIssues("{key}")'
        for st in (await tvjira_search_all(jql, story_fields))[:5]:
            sf = st.get("fields") or {}
            sample_issues.append(
                {
                    "key": st.get("key"),
                    "type": _field_text(sf.get("issuetype")),
                    "sp": _story_sp(sf),
                    "status": _field_text(sf.get("status")),
                }
            )
    except Exception as ex:
        errs.append(str(ex))
    return {
        "initiativeKey": key,
        "summary": (fields.get("summary") or "")[:120],
        "descriptionSource": src,
        "renderedSource": rend_src,
        "descriptionChars": len(desc_text),
        "descriptionPreview": desc_text[:400],
        "plannedSpFromDescription": planned,
        "milestoneRowCount": len(rows),
        "milestones": rows[:8],
        "linkedEpicCount": epics,
        "storySpConsumed": consumed,
        "storySpDone": done,
        "storyCount": scount,
        "sampleLinkedStories": sample_issues,
        "errors": errs,
    }


async def preview_story_sp_kpi(
    model: str | None = None,
    label: str | None = None,
    project_key: str = "TVPLAT",
    max_initiatives: int = 12,
    debug_initiative_key: str | None = None,
) -> dict[str, Any]:
    """Initiative Description 계획 SP + Epic 하위 Story SP."""
    jira_label = resolve_initiative_label(model, label)
    if not jira_label:
        return {"error": "label required", "plannedSpTotal": 0, "actualSpTotal": 0}

    fields = list(initiative_search_field_ids()) + ["description"]
    inits = await tvjira_search_all(build_initiative_jql(jira_label, project_key), fields)
    per_init: list[dict[str, Any]] = []
    planned_total = 0.0
    story_sp_total = 0.0
    story_sp_done = 0.0
    errors: list[str] = []

    story_fields = [
        "summary",
        "status",
        "issuetype",
        "parent",
        settings.story_points_field,
        settings.epic_link_field,
    ]

    for raw in inits[:max_initiatives]:
        key = raw.get("key") or ""
        f = raw.get("fields") or {}
        desc_raw = f.get("description")
        search_text, _ = normalize_jira_description(desc_raw)
        rendered_text = ""
        if key:
            rendered_text, _ = await fetch_initiative_description_text(key)
        desc_text, planned, milestone_rows, desc_src = _pick_best_description_parse(
            search_text, rendered_text
        )
        planned_total += planned

        actual = 0.0
        done = 0.0
        story_count = 0
        epic_count = 0
        try:
            actual, done, story_count, epic_count = await _collect_initiative_story_sp(
                project_key, key, story_fields, errors
            )
        except Exception as ex:
            errors.append(f"{key}: {ex}")

        story_sp_total += actual
        story_sp_done += done
        per_init.append(
            {
                "initiativeKey": key,
                "summary": (f.get("summary") or "")[:80],
                "descriptionSource": desc_src,
                "descriptionChars": len(desc_text or ""),
                "descriptionPreview": (desc_text or "")[:240].replace("\n", " "),
                "plannedSpFromDescription": planned,
                "milestones": milestone_rows,
                "storySpConsumed": actual,
                "storySpTotal": actual,
                "storySpDone": done,
                "storyCount": story_count,
                "linkedEpicCount": epic_count,
                "consumptionPctInitiative": round((actual / planned) * 1000, 10) / 10 if planned > 0 else None,
                "completionPctInitiative": round((done / planned) * 1000, 10) / 10 if planned > 0 else None,
            }
        )

    consumption_pct = (
        round((story_sp_total / planned_total) * 1000, 10) / 10 if planned_total > 0 else None
    )
    completion_pct = (
        round((story_sp_done / planned_total) * 1000, 10) / 10 if planned_total > 0 else None
    )

    out: dict[str, Any] = {
        "kpiSchemaVersion": 3,
        "model": model,
        "label": jira_label,
        "initiativeCount": len(per_init),
        "initiativesWithPlannedSp": sum(
            1 for x in per_init if (x.get("plannedSpFromDescription") or 0) > 0
        ),
        "totalMilestoneRows": sum(len(x.get("milestones") or []) for x in per_init),
        "definition": {
            "plannedSp": "9 Initiatives · Description 표 컬럼 '예상 SP' 합",
            "storySpConsumed": "Initiative linked Story(customfield_10808) SP 합 — 소진 SP",
            "consumptionPct": "storySpConsumed / plannedSpTotal (소진율, KPI-1)",
            "completionPct": "완료 Story SP / plannedSpTotal (참고)",
            "notCalendarSp26": "릴리즈 Gantt SP 캘린더 경과율과 무관",
        },
        "plannedSpTotal": planned_total,
        "storySpConsumed": story_sp_total,
        "storySpTotal": story_sp_total,
        "storySpDone": story_sp_done,
        "consumptionPct": consumption_pct,
        "burnPctVsPlan": consumption_pct,
        "completionPct": completion_pct,
        "byInitiative": per_init,
        "errors": errors,
    }
    if debug_initiative_key and debug_initiative_key.strip():
        out["debug"] = await debug_initiative_sp_snapshot(
            debug_initiative_key.strip(), project_key=project_key
        )
    return out
