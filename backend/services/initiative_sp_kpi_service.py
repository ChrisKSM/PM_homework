"""
KPI-1 작업 완료율 (Story Point) — Initiative Description Milestones 표.

표 컬럼: Milestone | … | Target Sprint | Due date | 예상 SP | 완료 여부 | …
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
    if "||" in text and ("예상" in text or "Milestone" in text):
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


def _description_to_lines(description: str) -> list[str]:
    """Jira wiki/HTML 표 → 탭 구분 줄."""
    raw = unescape(description)
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
        "completion": None,
    }
    for j, h in enumerate(headers):
        hl = h.lower().replace(" ", "")
        if h == "Milestone" or hl == "milestone":
            idx["milestone"] = j
        if "내용" in h:
            idx["summary"] = j
        if "target" in hl and "sprint" in hl:
            idx["targetSprint"] = j
        if "due" in hl and "date" in hl:
            idx["dueDate"] = j
        if "예상" in h and "sp" in hl:
            idx["plannedSp"] = j
        if "완료" in h:
            idx["completion"] = j
    return idx


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
        if "예상" in line and "SP" in line and ("Milestone" in line or "Due date" in line):
            col = _header_index(_split_cells(line))
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
        ms = cells[mi].strip()
        if not _MILESTONE_ID.match(ms):
            continue
        sp_i = col.get("plannedSp")
        if sp_i is None or sp_i >= len(cells):
            fb = _parse_milestone_row_fallback(line)
            if fb:
                rows.append(fb)
            continue
        sp_raw = cells[sp_i].strip()
        if not re.match(r"^\d+(?:\.\d+)?$", sp_raw):
            continue
        sp = float(sp_raw)
        summary_i = col.get("summary")
        summary = cells[summary_i].strip() if summary_i is not None and summary_i < len(cells) else ""
        ts_i = col.get("targetSprint")
        due_i = col.get("dueDate")
        comp_i = col.get("completion")
        rows.append(
            {
                "milestone": ms.upper(),
                "summary": summary[:120],
                "targetSprint": cells[ts_i].strip() if ts_i is not None and ts_i < len(cells) else "",
                "dueDate": cells[due_i].strip() if due_i is not None and due_i < len(cells) else "",
                "plannedSp": sp,
                "completionStatus": cells[comp_i].strip() if comp_i is not None and comp_i < len(cells) else "",
            }
        )

    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for r in rows:
        k = r["milestone"]
        if k in seen:
            continue
        seen.add(k)
        unique.append(r)

    total = sum(r["plannedSp"] for r in unique)
    return total, unique


def parse_planned_sp_from_description(description: str | None) -> tuple[float, list[dict[str, Any]]]:
    """호환 alias — milestone 표 파싱."""
    return parse_milestone_table_from_description(description)


def _story_sp(fields: dict[str, Any]) -> float:
    raw = fields.get(settings.story_points_field)
    if raw is None:
        return 0.0
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def _is_story_done(status: Any) -> bool:
    name = _field_text(status).lower()
    return any(x in name for x in ("done", "closed", "resolved", "complete", "완료"))


async def preview_story_sp_kpi(
    model: str | None = None,
    label: str | None = None,
    project_key: str = "TVPLAT",
    max_initiatives: int = 12,
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

    story_fields = ["summary", "status", "issuetype", settings.story_points_field, settings.epic_link_field]

    for raw in inits[:max_initiatives]:
        key = raw.get("key") or ""
        f = raw.get("fields") or {}
        desc_raw = f.get("description")
        desc_text, desc_src = normalize_jira_description(desc_raw)
        planned, milestone_rows = parse_milestone_table_from_description(desc_text)
        if planned <= 0 and key:
            fetched, fetched_src = await fetch_initiative_description_text(key)
            if fetched.strip():
                p2, rows2 = parse_milestone_table_from_description(fetched)
                if p2 > 0 or len(rows2) > len(milestone_rows):
                    desc_text, desc_src = fetched, fetched_src
                    planned, milestone_rows = p2, rows2
        planned_total += planned

        actual = 0.0
        done = 0.0
        story_count = 0
        try:
            epic_jql = (
                f'project = {project_key} AND issuetype in (Epic, epic) '
                f'AND issue in linkedIssues("{key}")'
            )
            epics = await tvjira_search_all(epic_jql, ["summary"])
            epic_keys = [e.get("key") for e in epics if e.get("key")]
            for ek in epic_keys[:15]:
                st_jql = (
                    f'project = {project_key} AND issuetype in (Story, story) '
                    f'AND "Epic Link" = {ek}'
                )
                stories = await tvjira_search_all(st_jql, story_fields)
                for st in stories:
                    sf = st.get("fields") or {}
                    sp = _story_sp(sf)
                    if sp <= 0:
                        continue
                    story_count += 1
                    actual += sp
                    if _is_story_done(sf.get("status")):
                        done += sp
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
                "storySpTotal": actual,
                "storySpDone": done,
                "storyCount": story_count,
                "completionPctInitiative": round((done / planned) * 1000, 10) / 10 if planned > 0 else None,
            }
        )

    pct = round((story_sp_done / planned_total) * 1000, 10) / 10 if planned_total > 0 else None
    pct_actual_vs_plan = (
        round((story_sp_total / planned_total) * 1000, 10) / 10 if planned_total > 0 else None
    )

    return {
        "model": model,
        "label": jira_label,
        "definition": {
            "plannedSp": "Sum of Milestones table column '예상 SP' per Initiative description",
            "storySpDone": "Sum SP on done/closed Stories under linked Epics",
            "completionPct": "storySpDone / plannedSpTotal",
            "burnPctVsPlan": "storySpTotal / plannedSpTotal (optional)",
            "notCalendarSp26": "Release Gantt KPI-1 (20/26 week elapsed) is unrelated",
        },
        "plannedSpTotal": planned_total,
        "storySpTotal": story_sp_total,
        "storySpDone": story_sp_done,
        "completionPct": pct,
        "burnPctVsPlan": pct_actual_vs_plan,
        "byInitiative": per_init,
        "errors": errors,
    }
