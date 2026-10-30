"""
KPI-1 SP 소진율 — 모델 라벨 Initiative 9건 Description 표 + Story SP.

표 헤더(정규): 마일스톤 | 산출물 | DoD | DoD 승인자 | 이해관계자 | 스프린트 | 예상 SP | 소모 SP | 완료여부 | 기타
- 계획 SP = Σ 예상 SP
- 소진 SP = Initiative 하위 Story(customfield_10808) 합
"""
from __future__ import annotations

import asyncio
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
from tvjira_client import (
    tvjira_get_issue,
    tvjira_issue_worklog_total_seconds,
    tvjira_search_all,
)

_MILESTONE_ID = re.compile(r"^M[1-9]\d*$", re.I)
_DATE = re.compile(r"(\d{4}-\d{2}-\d{2})")
_SP_CELL = re.compile(r"^\d+(?:\.\d+)?$")
_WORK_ITEM_JQL_EXCLUDE = (
    "Initiative, initiative, Epic, epic, Milestone, mileStone, milestone"
)
# TV Jira Server: 긴 issuetype in (Story, Task, Feature, …) 는 400 — Gantt 와 동일하게 not in 사용
_JQL_WORK_ITEMS = f"issuetype not in ({_WORK_ITEM_JQL_EXCLUDE})"


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
        if ("소모" in h or "소진" in h) and "sp" in hl:
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
        sp_parsed = _parse_sp_cell(sp_raw)
        if sp_parsed is None:
            continue
        sp = sp_parsed
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
            consumed_table = _parse_sp_cell(cells[cons_i].strip())
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


def _parse_sp_cell(raw: str) -> float | None:
    s = (raw or "").strip()
    if not s:
        return None
    if _SP_CELL.match(s):
        return float(s)
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def _sp_hours_per_point() -> float:
    raw = getattr(settings, "sp_hours_per_point", 4.0)
    try:
        v = float(raw)
        return v if v > 0 else 4.0
    except (TypeError, ValueError):
        return 4.0


def _seconds_to_sp(seconds: int) -> float:
    return (seconds / 3600.0) / _sp_hours_per_point()


async def _collect_worklog_sp_for_issues(
    issue_done: dict[str, bool],
    errors: list[str],
    *,
    max_issues: int = 400,
) -> tuple[float, float, int, float]:
    """
    Initiative 하위 Story/Task 전체 worklog → SP (WorklogReport: 1sp = 4h).
    search fields.worklog 은 20건 제한이라 issue/worklog API 사용.
    """
    keys = sorted(issue_done.keys())
    if len(keys) > max_issues:
        errors.append(f"worklog: capped at {max_issues}/{len(keys)} issues")
        keys = keys[:max_issues]
    if not keys:
        return 0.0, 0.0, 0, 0.0

    sem = asyncio.Semaphore(10)
    total_sec = 0
    done_sec = 0
    with_wl = 0

    async def one(issue_key: str) -> None:
        nonlocal total_sec, done_sec, with_wl
        async with sem:
            try:
                sec = await tvjira_issue_worklog_total_seconds(issue_key)
            except Exception as ex:
                errors.append(f"worklog {issue_key}: {ex}")
                return
            if sec <= 0:
                return
            with_wl += 1
            total_sec += sec
            if issue_done.get(issue_key):
                done_sec += sec

    await asyncio.gather(*(one(k) for k in keys))
    return (
        round(_seconds_to_sp(total_sec) * 1000) / 1000,
        round(_seconds_to_sp(done_sec) * 1000) / 1000,
        with_wl,
        round((total_sec / 3600.0) * 1000) / 1000,
    )


def _pick_effective_consumed(
    worklog_sp: float,
    jira_story_sp: float,
    desc_sp: float,
) -> tuple[float, str]:
    if worklog_sp > 0:
        return worklog_sp, "worklogSp"
    if jira_story_sp > 0:
        return jira_story_sp, "jiraStorySp"
    if desc_sp > 0:
        return desc_sp, "descriptionConsumedSp"
    return 0.0, "descriptionConsumedSp"


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


def _sum_consumed_sp_from_milestone_rows(rows: list[dict[str, Any]]) -> float:
    """Description 표 '소모 SP' 열 합 (Jira Story SP 없을 때 fallback)."""
    return sum(float(r["consumedSpInTable"]) for r in rows if r.get("consumedSpInTable") is not None)


def _is_story_done(status: Any) -> bool:
    name = _field_text(status).lower()
    return any(x in name for x in ("done", "closed", "resolved", "complete", "완료"))


async def _collect_initiative_story_sp(
    project_key: str,
    initiative_key: str,
    story_fields: list[str],
    errors: list[str],
    initiative_summary: str = "",
) -> tuple[float, float, int, int, int, dict[str, bool]]:
    """Initiative → Epic → Story/Task SP + worklog 대상 이슈 (Epic Link · parent · linkedIssues)."""
    from services.release_gantt_service import (
        _discover_epic_keys_from_linked_work_items,
        _looks_like_epic,
        _looks_like_milestone,
        linked_epic_jql_for_initiative,
        pick_demo_epic,
    )

    seen: set[str] = set()
    touched: set[str] = set()
    issue_done: dict[str, bool] = {}
    subtask_keys: set[str] = set()
    total = 0.0
    done = 0.0
    count = 0
    ik = initiative_key.strip().replace('"', '\\"')
    fields_with_subs = list(dict.fromkeys([*story_fields, "subtasks"]))

    def absorb(raw: dict) -> None:
        nonlocal total, done, count
        key = raw.get("key")
        if not key or key in seen:
            return
        sf = raw.get("fields") or {}
        it = sf.get("issuetype")
        if _looks_like_epic(it) or _looks_like_milestone(it, ""):
            return
        touched.add(key)
        issue_done[key] = _is_story_done(sf.get("status"))
        sp = _story_sp(sf)
        if sp <= 0:
            return
        seen.add(key)
        count += 1
        total += sp
        if _is_story_done(sf.get("status")):
            done += sp

    def track_subtasks(raw: dict) -> None:
        sf = raw.get("fields") or {}
        for sub in sf.get("subtasks") or []:
            if isinstance(sub, dict):
                sk = sub.get("key")
                if sk:
                    subtask_keys.add(sk)

    async def ingest(jql: str, *, track_subs: bool = True) -> None:
        try:
            for raw in await tvjira_search_all(jql, fields_with_subs):
                if track_subs:
                    track_subtasks(raw)
                absorb(raw)
        except Exception as ex:
            errors.append(f"{initiative_key} story JQL: {ex}")

    epic_keys: set[str] = set()
    linked_epic_rows: list[dict] = []
    try:
        linked_epic_rows = await tvjira_search_all(
            linked_epic_jql_for_initiative(initiative_key, project_key),
            ["summary", "issuetype"],
        )
        for raw_epic in linked_epic_rows:
            ek = raw_epic.get("key")
            if ek:
                epic_keys.add(ek)
        demo = pick_demo_epic(linked_epic_rows, initiative_summary)
        if demo and demo.get("key"):
            epic_keys.add(demo["key"])
    except Exception as ex:
        errors.append(f"{initiative_key} epics: {ex}")

    extra = await _discover_epic_keys_from_linked_work_items([initiative_key], project_key, errors)
    epic_keys |= extra

    await ingest(
        f'project = {project_key} AND {_JQL_WORK_ITEMS} '
        f'AND issue in linkedIssues("{ik}")'
    )

    epic_list = sorted(epic_keys)
    for i in range(0, len(epic_list), 12):
        chunk = epic_list[i : i + 12]
        or_epic = " OR ".join(f'"Epic Link" = {ek}' for ek in chunk)
        or_parent = " OR ".join(f"parent = {ek}" for ek in chunk)
        await ingest(f'project = {project_key} AND {_JQL_WORK_ITEMS} AND ({or_epic})')
        await ingest(f'project = {project_key} AND {_JQL_WORK_ITEMS} AND ({or_parent})')

    for ek in epic_list:
        for jql in (
            f'project = {project_key} AND {_JQL_WORK_ITEMS} AND "Epic Link" = {ek}',
            f'project = {project_key} AND {_JQL_WORK_ITEMS} AND parent = {ek}',
        ):
            await ingest(jql)

    pending_subs = sorted(subtask_keys - touched)
    for i in range(0, len(pending_subs), 40):
        chunk = pending_subs[i : i + 40]
        keys_clause = ", ".join(chunk)
        await ingest(
            f"project = {project_key} AND key in ({keys_clause})",
            track_subs=False,
        )

    return total, done, count, len(epic_keys), len(touched), issue_done


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
    from services.release_gantt_service import linked_epic_jql_for_initiative, pick_demo_epic

    summary = (fields.get("summary") or "")[:120]
    errs: list[str] = []
    consumed, done, scount, epics, work_touched, issue_done = await _collect_initiative_story_sp(
        project_key, key, story_fields, errs, initiative_summary=summary
    )
    wl_sp, wl_done, wl_issue_count, wl_hours = await _collect_worklog_sp_for_issues(issue_done, errs)
    desc_consumed = _sum_consumed_sp_from_milestone_rows(rows)
    effective, eff_src = _pick_effective_consumed(wl_sp, consumed, desc_consumed)
    linked_rows = await tvjira_search_all(
        linked_epic_jql_for_initiative(key, project_key),
        ["summary", "issuetype"],
    )
    demo = pick_demo_epic(linked_rows, summary)
    demo_key = demo.get("key") if demo else None
    epic_key_list = [r.get("key") for r in linked_rows if r.get("key")]
    sample_issues: list[dict[str, Any]] = []
    for ek in ([demo_key] if demo_key else []) + [k for k in epic_key_list if k != demo_key][:2]:
        try:
            jql = f'project = {project_key} AND {_JQL_WORK_ITEMS} AND "Epic Link" = {ek}'
            for st in (await tvjira_search_all(jql, story_fields))[:8]:
                sf = st.get("fields") or {}
                ik = st.get("key") or ""
                entry: dict[str, Any] = {
                    "key": ik,
                    "epicLink": ek,
                    "type": _field_text(sf.get("issuetype")),
                    "sp": _story_sp(sf),
                    "status": _field_text(sf.get("status")),
                }
                if ik and len(sample_issues) < 5:
                    try:
                        sec = await tvjira_issue_worklog_total_seconds(ik)
                        entry["worklogHours"] = round(sec / 3600.0, 2)
                        entry["worklogSp"] = round(_seconds_to_sp(sec), 2)
                    except Exception as ex:
                        entry["worklogError"] = str(ex)
                sample_issues.append(entry)
        except Exception as ex:
            errs.append(f"{ek}: {ex}")
    return {
        "initiativeKey": key,
        "summary": summary,
        "descriptionSource": src,
        "renderedSource": rend_src,
        "descriptionChars": len(desc_text),
        "descriptionPreview": desc_text[:400],
        "plannedSpFromDescription": planned,
        "consumedSpFromDescription": desc_consumed,
        "milestoneRowCount": len(rows),
        "milestones": rows[:8],
        "demoEpicKey": demo_key,
        "linkedEpicKeys": epic_key_list[:12],
        "linkedEpicCount": epics,
        "linkedWorkItemCount": work_touched,
        "storySpConsumed": consumed,
        "storySpDone": done,
        "storyCount": scount,
        "worklogSpConsumed": wl_sp,
        "worklogSpDone": wl_done,
        "worklogIssueCount": wl_issue_count,
        "worklogHoursTotal": wl_hours,
        "spHoursPerPoint": _sp_hours_per_point(),
        "effectiveSpConsumed": effective,
        "consumptionPctSource": eff_src,
        "sampleEpicWorkItems": sample_issues,
        "storyPointsField": settings.story_points_field,
        "epics": epics,
        "stories": scount,
        "samples": sample_issues,
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

    # description 은 search fields 에 넣으면 TV Jira Server 가 400 반환하는 경우 있음 → 이슈별 get
    fields = list(initiative_search_field_ids())
    inits = await tvjira_search_all(build_initiative_jql(jira_label, project_key), fields)
    per_init: list[dict[str, Any]] = []
    planned_total = 0.0
    story_sp_total = 0.0
    story_sp_done = 0.0
    worklog_sp_total = 0.0
    worklog_sp_done = 0.0
    desc_consumed_total = 0.0
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
        desc_consumed = _sum_consumed_sp_from_milestone_rows(milestone_rows)
        desc_consumed_total += desc_consumed

        actual = 0.0
        done = 0.0
        story_count = 0
        epic_count = 0
        work_touched = 0
        wl_sp = 0.0
        wl_done = 0.0
        issue_done: dict[str, bool] = {}
        try:
            actual, done, story_count, epic_count, work_touched, issue_done = (
                await _collect_initiative_story_sp(
                    project_key,
                    key,
                    story_fields,
                    errors,
                    initiative_summary=(f.get("summary") or ""),
                )
            )
            wl_sp, wl_done, _, _ = await _collect_worklog_sp_for_issues(issue_done, errors)
        except Exception as ex:
            errors.append(f"{key}: {ex}")

        effective_consumed, init_source = _pick_effective_consumed(wl_sp, actual, desc_consumed)
        story_sp_total += actual
        story_sp_done += done
        worklog_sp_total += wl_sp
        worklog_sp_done += wl_done
        completion_numer = wl_done if init_source == "worklogSp" else done
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
                "worklogSpConsumed": wl_sp,
                "worklogSpDone": wl_done,
                "consumedSpFromDescription": desc_consumed,
                "effectiveSpConsumed": effective_consumed,
                "consumptionPctSource": init_source,
                "storySpTotal": actual,
                "storySpDone": done,
                "storyCount": story_count,
                "linkedEpicCount": epic_count,
                "linkedWorkItemCount": work_touched,
                "consumptionPctInitiative": round((effective_consumed / planned) * 1000, 10) / 10
                if planned > 0
                else None,
                "completionPctInitiative": round((completion_numer / planned) * 1000, 10) / 10
                if planned > 0
                else None,
            }
        )

    effective_total, consumption_source = _pick_effective_consumed(
        worklog_sp_total, story_sp_total, desc_consumed_total
    )
    consumption_pct = (
        round((effective_total / planned_total) * 1000, 10) / 10 if planned_total > 0 else None
    )
    completion_numer = (
        worklog_sp_done
        if consumption_source == "worklogSp"
        else story_sp_done
    )
    completion_pct = (
        round((completion_numer / planned_total) * 1000, 10) / 10 if planned_total > 0 else None
    )

    out: dict[str, Any] = {
        "kpiSchemaVersion": 5,
        "model": model,
        "label": jira_label,
        "initiativeCount": len(per_init),
        "initiativesWithPlannedSp": sum(
            1 for x in per_init if (x.get("plannedSpFromDescription") or 0) > 0
        ),
        "totalMilestoneRows": sum(len(x.get("milestones") or []) for x in per_init),
        "definition": {
            "plannedSp": "9 Initiatives · Description 표 컬럼 '예상 SP' 합",
            "worklogSpConsumed": f"Epic 하위 Story worklog 합 → SP (1sp={_sp_hours_per_point()}h, WorklogReport 동일)",
            "storySpConsumed": "Jira Story Points(customfield_10808) — worklog 없을 때 fallback",
            "consumedSpFromDescription": "Description 표 소모 SP — worklog·Jira SP 없을 때 fallback",
            "consumptionPct": "effectiveSpConsumed / plannedSpTotal (소진율, KPI-1)",
            "consumptionPctSource": "worklogSp | jiraStorySp | descriptionConsumedSp",
            "completionPct": "완료 이슈 worklog SP(또는 Story SP) / plannedSpTotal (참고)",
            "notCalendarSp26": "릴리즈 Gantt SP 캘린더 경과율과 무관",
            "worklogScope": "전 기간 worklog 누적 · IR/SP별 분해는 model-status/sprint/dashboard",
        },
        "plannedSpTotal": planned_total,
        "worklogSpConsumed": worklog_sp_total,
        "worklogSpDone": worklog_sp_done,
        "spHoursPerPoint": _sp_hours_per_point(),
        "storySpConsumed": story_sp_total,
        "consumedSpFromDescription": desc_consumed_total,
        "effectiveSpConsumed": effective_total,
        "consumptionPctSource": consumption_source,
        "storySpTotal": story_sp_total,
        "storySpDone": story_sp_done,
        "consumptionPct": consumption_pct,
        "burnPctVsPlan": consumption_pct,
        "storyPointsField": settings.story_points_field,
        "completionPct": completion_pct,
        "byInitiative": per_init,
        "errors": errors,
    }
    if debug_initiative_key and debug_initiative_key.strip():
        try:
            out["debug"] = await debug_initiative_sp_snapshot(
                debug_initiative_key.strip(), project_key=project_key
            )
        except Exception as ex:
            out["debug"] = {"error": str(ex), "initiativeKey": debug_initiative_key.strip()}
    if effective_total <= 0 and per_init and "probe" not in out:
        first = per_init[0]
        out["probe"] = {
            "storyPointsField": settings.story_points_field,
            "hint": "debug_initiative_key=TVPLAT-943406 · sh scripts/upgrade-story-sp-kpi-router.py",
            "sampleInitiative": first.get("initiativeKey"),
            "linkedEpicCount": first.get("linkedEpicCount"),
            "linkedWorkItemCount": first.get("linkedWorkItemCount"),
            "errorsSample": errors[:8],
        }
    return out


async def collect_initiative_scope_issue_done(
    project_key: str,
    jira_label: str,
    *,
    max_initiatives: int = 12,
    errors: list[str] | None = None,
) -> dict[str, bool]:
    """모델 label 하위 Initiative → Epic → Story/Task 이슈 키 (worklog 스코프)."""
    errors = errors if errors is not None else []
    fields = list(initiative_search_field_ids()) + ["summary"]
    inits = await tvjira_search_all(build_initiative_jql(jira_label, project_key), fields)
    story_fields = [
        "summary",
        "status",
        "issuetype",
        "parent",
        settings.story_points_field,
        settings.epic_link_field,
    ]
    merged: dict[str, bool] = {}
    for raw in inits[:max_initiatives]:
        key = raw.get("key") or ""
        if not key:
            continue
        f = raw.get("fields") or {}
        try:
            _, _, _, _, _, issue_done = await _collect_initiative_story_sp(
                project_key,
                key,
                story_fields,
                errors,
                initiative_summary=(f.get("summary") or ""),
            )
            merged.update(issue_done)
        except Exception as ex:
            errors.append(f"{key}: {ex}")
    return merged


async def collect_initiative_scope_issue_done(
    project_key: str,
    jira_label: str,
    *,
    max_initiatives: int = 12,
    errors: list[str] | None = None,
) -> dict[str, bool]:
    """모델 label 하위 Initiative → Epic → Story/Task 이슈 키 (worklog 스코프)."""
    errors = errors if errors is not None else []
    fields = list(initiative_search_field_ids()) + ["summary"]
    inits = await tvjira_search_all(build_initiative_jql(jira_label, project_key), fields)
    story_fields = [
        "summary",
        "status",
        "issuetype",
        "parent",
        settings.story_points_field,
        settings.epic_link_field,
    ]
    merged: dict[str, bool] = {}
    for raw in inits[:max_initiatives]:
        key = raw.get("key") or ""
        if not key:
            continue
        f = raw.get("fields") or {}
        try:
            _, _, _, _, _, issue_done = await _collect_initiative_story_sp(
                project_key,
                key,
                story_fields,
                errors,
                initiative_summary=(f.get("summary") or ""),
            )
            merged.update(issue_done)
        except Exception as ex:
            errors.append(f"{key}: {ex}")
    return merged
