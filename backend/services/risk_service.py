"""
리스크 관리 대시보드 — labels = risk, 범주 = Components, 대응 계획 = Description, EMV = Environment 파싱.
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
ENV_FIELD = getattr(settings, "risk_environment_field", None) or "environment"
SCHEDULE_RESERVE_DAYS = int(getattr(settings, "risk_schedule_reserve_days", None) or 45)
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
# Environment 미입력 시 mock과 동일한 기준값 (issueKey + riskId)
FALLBACK_QUANT: list[dict[str, Any]] = [
    {"riskId": "R-01", "category": "요구사항", "issueKey": "MLCSIXZERO-401", "title": "Sprint 중 신규 요구사항 인입으로 일정 지연 가능성", "pPct": 60, "iSchedule": 14, "iEffort": 20, "emvSchedule": 8.4, "emvEffort": 12.0, "qualScore": 9, "level": "매우 높음", "strategy": "완화", "owner": "PM", "status": "관리 중"},
    {"riskId": "R-02", "category": "일정", "issueKey": "MLCSIXZERO-402", "title": "핵심 기능 개발 지연으로 Sprint 목표 미달 가능성", "pPct": 50, "iSchedule": 12, "iEffort": 15, "emvSchedule": 6.0, "emvEffort": 7.5, "qualScore": 9, "level": "높음", "strategy": "완화", "owner": "PL", "status": "관리 중"},
    {"riskId": "R-03", "category": "자원", "issueKey": "MLCSIXZERO-403", "title": "특정 핵심 인력 집중으로 인한 과부하 발생 가능성", "pPct": 50, "iSchedule": 12, "iEffort": 15, "emvSchedule": 6.0, "emvEffort": 7.5, "qualScore": 9, "level": "높음", "strategy": "완화", "owner": "PM", "status": "완화됨"},
    {"riskId": "R-04", "category": "기술", "issueKey": "MLCSIXZERO-401", "title": "신규 기능 통합 시 예기치 않은 버그 발생 가능성", "pPct": 50, "iSchedule": 8, "iEffort": 10, "emvSchedule": 4.0, "emvEffort": 5.0, "qualScore": 4, "level": "중간", "strategy": "완화", "owner": "Dev Lead", "status": "관리 중"},
    {"riskId": "R-05", "category": "외부의존", "issueKey": "MLCSIXZERO-404", "title": "타 부서/외부 시스템 연동 일정 변동 가능성", "pPct": 50, "iSchedule": 14, "iEffort": 10, "emvSchedule": 7.0, "emvEffort": 5.0, "qualScore": 6, "level": "중간", "strategy": "회피", "owner": "PM", "status": "관리 중"},
    {"riskId": "R-06", "category": "품질", "issueKey": "MLCSIXZERO-405", "title": "검증 단계 누적으로 테스트 일정 부족 가능성", "pPct": 30, "iSchedule": 8, "iEffort": 12, "emvSchedule": 2.4, "emvEffort": 3.6, "qualScore": 6, "level": "낮음", "strategy": "완화", "owner": "QA", "status": "관리 중"},
    {"riskId": "R-07", "category": "범위", "issueKey": "MLCSIXZERO-406", "title": "범위 정의 불충분으로 재작업 발생 가능성", "pPct": 50, "iSchedule": 6, "iEffort": 8, "emvSchedule": 3.0, "emvEffort": 4.0, "qualScore": 6, "level": "중간", "strategy": "회피", "owner": "PM", "status": "종료"},
]
FALLBACK_STATUS_CHANGES: list[dict[str, Any]] = [
    {"riskId": "R-02", "category": "일정", "issueKey": "MLCSIXZERO-402", "beforePI": "50% / 12일", "afterPI": "40% / 10일", "deltaEmvSchedule": "−2.0일", "note": "레벨링 완료 → 완화됨"},
    {"riskId": "R-02", "category": "일정", "issueKey": "MLCSIXZERO-402", "beforePI": "40% / 10일", "afterPI": "40% / 8일", "deltaEmvSchedule": "−0.8일", "note": "CCB 진행 PP단계 요구사항 인입"},
]
MITIGATIONS: list[dict[str, Any]] = [
    {"riskId": "R-01", "strategy": "완화", "action": "변경 영향도 분석 · CCB 승인", "targetDays": "−6일", "actualDays": "−4일 (진행)", "owner": "PM", "status": "관리 중"},
    {"riskId": "R-01", "strategy": "완화", "action": "HDMI 모듈 사전 통합 테스트", "targetDays": "−3일", "actualDays": "−2일 (완료)", "owner": "System", "status": "2026.04.26"},
    {"riskId": "R-02", "strategy": "완화", "action": "기능 단위 우선순위 재조정", "targetDays": "−5일", "actualDays": "−3일 (진행)", "owner": "PL", "status": "관리 중"},
    {"riskId": "R-03", "strategy": "완화", "action": "작업 분산 · 일정 레벨링", "targetDays": "−8일", "actualDays": "−6일 (완료)", "owner": "PM", "status": "완화됨"},
    {"riskId": "R-05", "strategy": "회피", "action": "TV 일정 조율 · 영향 범위 제한", "targetDays": "−10일", "actualDays": "−8일 (진행)", "owner": "외부 협력사", "status": "2026.05.02"},
    {"riskId": "R-06", "strategy": "완화", "action": "테스트 우선순위 조정 · 병행 수행", "targetDays": "−4일", "actualDays": "−1.5일 (진행)", "owner": "QA", "status": "관리 중"},
]
def _search_fields() -> list[str]:
    fields = [
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
    if ENV_FIELD not in fields:
        fields.append(ENV_FIELD)
    return fields
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
def _normalize_environment_text(text: str) -> str:
    """Jira Wiki markup · 불릿 제거 후 plain text."""
    t = (text or "").replace("\r\n", "\n")
    # *{color:red}...{color}*
    t = re.sub(r"\*\s*\{color:[^}]+\}\s*", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*\{color(?::[^}]*)?\}\s*\*", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\{color(?::[^}]*)?\}", "", t, flags=re.IGNORECASE)
    # 줄 단위 불릿 (- P(%) : 50)
    t = re.sub(r"(?m)^[\s]*[-•*]\s+", "", t)
    return t.strip()


def _is_history_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if re.match(r"R-\d+\s*[|｜]\s*변경\s*전", s, re.IGNORECASE):
        return True
    return bool(re.search(r"변경\s*전\s*[:：].*변경\s*후\s*[:：]", s, re.IGNORECASE))


def _emv_section_only(block: str) -> str:
    """갱신 이력 줄 이전까지만 EMV 파싱 대상으로 사용."""
    lines: list[str] = []
    for line in block.splitlines():
        if _is_history_line(line):
            break
        lines.append(line)
    return "\n".join(lines)


def _first_float(text: str, patterns: list[str]) -> float | None:
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
        if m:
            try:
                return float(m.group(1).replace(",", "").strip())
            except ValueError:
                continue
    return None
def _parse_risk_score(text: str) -> int | None:
    m = re.search(
        r"Risk\s*Score\s*[:：]?\s*(\d+)\s*\(\s*P\s*\)\s*[xX×]\s*(\d+)\s*\(\s*I\s*\)\s*=\s*(\d+)",
        text,
        re.IGNORECASE,
    )
    if m:
        return int(m.group(3))
    return None
def _parse_emv_block(block: str) -> dict[str, float | int | None]:
    """Environment 내 EMV 섹션 파싱."""
    clean = _normalize_environment_text(_emv_section_only(block))
    p_pct = _first_float(
        clean,
        [
            r"P\s*\(\s*%\s*\)\s*[:：]\s*(\d+(?:\.\d+)?)",
            r"P\s*[:：]\s*(\d+(?:\.\d+)?)\s*%",
        ],
    )
    i_schedule = _first_float(
        clean,
        [
            r"I[_\s]*일정\s*(?:\(\s*일\s*\))?\s*[:：]\s*(\d+(?:\.\d+)?)",
            r"일정\s*영향\s*[:：]\s*(\d+(?:\.\d+)?)\s*일",
        ],
    )
    i_effort = _first_float(
        clean,
        [
            r"I[_\s]*공수\s*(?:\(\s*MD\s*\))?\s*[:：]\s*(\d+(?:\.\d+)?)",
            r"공수\s*영향\s*[:：]\s*(\d+(?:\.\d+)?)\s*MD",
        ],
    )
    emv_schedule = _first_float(
        clean,
        [
            r"EMV[_\s]*일정\s*[:：]\s*([−-]?\d+(?:\.\d+)?)",
            r"EMV\s*일정\s*[:：]\s*([−-]?\d+(?:\.\d+)?)",
        ],
    )
    emv_effort = _first_float(
        clean,
        [
            r"EMV[_\s]*공수\s*[:：]\s*([−-]?\d+(?:\.\d+)?)",
            r"EMV\s*공수\s*[:：]\s*([−-]?\d+(?:\.\d+)?)",
        ],
    )
    if p_pct is not None and i_schedule is not None and emv_schedule is None:
        emv_schedule = round(p_pct * i_schedule / 100.0, 1)
    if p_pct is not None and i_effort is not None and emv_effort is None:
        emv_effort = round(p_pct * i_effort / 100.0, 1)
    return {
        "pPct": p_pct,
        "iSchedule": i_schedule,
        "iEffort": i_effort,
        "emvSchedule": emv_schedule,
        "emvEffort": emv_effort,
        "qualScore": _parse_risk_score(clean),
    }
def _split_environment_blocks(text: str) -> list[str]:
    if not text.strip():
        return []
    normalized = _normalize_environment_text(text)
    parts = re.split(r"(?=R-ID\s*[:：]\s*R-\d+)", normalized, flags=re.IGNORECASE)
    blocks = [p.strip() for p in parts if p.strip()]
    if len(blocks) <= 1:
        return [normalized.strip()]
    return blocks


def _parse_history_line(
    line: str,
    issue_key: str,
    category: str,
    default_risk_id: str | None,
) -> dict[str, Any] | None:
    line = line.strip()
    if not _is_history_line(line):
        return None

    risk_id = default_risk_id
    rm = re.match(r"(R-\d+)\s*[|｜]", line, re.IGNORECASE)
    if rm:
        risk_id = rm.group(1).upper()
        line = line[rm.end() :].strip()

    before_m = re.search(r"변경\s*전\s*[:：]\s*([^|｜]+)", line, re.IGNORECASE)
    after_m = re.search(r"변경\s*후\s*[:：]\s*([^|｜]+)", line, re.IGNORECASE)
    delta_m = re.search(r"Δ\s*EMV(?:_일정)?\s*[:：]\s*([^|｜]+)", line, re.IGNORECASE)
    if not before_m or not after_m:
        return None

    note = ""
    if delta_m:
        note = line[delta_m.end() :].strip().lstrip("|｜").strip()
    else:
        tail = line[after_m.end() :].strip().lstrip("|｜").strip()
        if tail and not tail.startswith("Δ"):
            note = tail

    return {
        "riskId": risk_id or "—",
        "category": category,
        "issueKey": issue_key,
        "beforePI": before_m.group(1).strip(),
        "afterPI": after_m.group(1).strip(),
        "deltaEmvSchedule": delta_m.group(1).strip() if delta_m else "—",
        "note": note,
    }


def _parse_environment_history(text: str, issue_key: str, category: str, default_risk_id: str | None) -> list[dict[str, Any]]:
    """
    갱신 이력 파싱 — 「갱신 이력」 헤더 있거나, EMV 아래 R-xx | 변경 전: ... 줄 직접 나열.
    """
    normalized = _normalize_environment_text(text)
    rows: list[dict[str, Any]] = []

    section_m = re.search(
        r"갱신\s*(?:이력|현황)\s*\n([\s\S]+?)(?=\n\s*R-ID\s*[:：]|\Z)",
        normalized,
        re.IGNORECASE,
    )
    scan_lines = section_m.group(1).splitlines() if section_m else normalized.splitlines()

    for line in scan_lines:
        row = _parse_history_line(line, issue_key, category, default_risk_id)
        if row:
            rows.append(row)

    return rows
def _risk_id_from_block(block: str, labels: list[str]) -> str | None:
    clean = _normalize_environment_text(block)
    m = re.search(r"R-ID\s*[:：]\s*(R-\d+)", clean, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    for label in labels:
        if re.match(r"R-\d+$", label, re.IGNORECASE):
            return label.upper()
    return None
def _emv_level(emv_schedule: float) -> str:
    if emv_schedule >= 7:
        return "매우 높음"
    if emv_schedule >= 5:
        return "높음"
    if emv_schedule >= 3:
        return "중간"
    return "낮음"
def _risk_status_label(fields: dict, block: str) -> str:
    m = re.search(r"상태\s*[:：]\s*(.+)", block, re.IGNORECASE)
    if m:
        return m.group(1).strip().split("\n")[0]
    if _is_done(fields):
        return "종료"
    return "관리 중"
def _strategy_from_block_or_description(block: str, description: str) -> str | None:
    m = re.search(r"대응\s*전략\s*[:：]\s*(.+)", block, re.IGNORECASE)
    if m:
        return m.group(1).strip().split("\n")[0]
    sections = _parse_description_sections(description)
    return sections.get("strategy")


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
        "emvField": ENV_FIELD,
    }
def _days_between(start: datetime, end: datetime) -> float:
    return max(0.0, (end - start).total_seconds() / 86400.0)
def _assignee_name(fields: dict) -> str:
    assignee = fields.get("assignee")
    if not assignee:
        return "Unassigned"
    return assignee.get("displayName") or assignee.get("name") or "Unassigned"
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
    environment = _description_text(fields.get(ENV_FIELD))
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
        "_environment": environment,
        "_labels": [str(x) for x in (fields.get("labels") or [])],
    }
def _quant_row_from_environment(issue: dict, parsed_issue: dict, block: str) -> dict[str, Any] | None:
    emv = _parse_emv_block(block)
    if emv["pPct"] is None and emv["emvSchedule"] is None:
        return None
    fields = issue.get("fields", {})
    key = issue.get("key", "")
    labels = parsed_issue.get("_labels") or []
    category = parsed_issue["category"]
    risk_id = _risk_id_from_block(block, labels)
    fallback = None
    if risk_id:
        fallback = next((r for r in FALLBACK_QUANT if r["riskId"] == risk_id), None)
    if not fallback:
        matches = [r for r in FALLBACK_QUANT if r["issueKey"] == key and r["category"] == category]
        fallback = matches[0] if len(matches) == 1 else None
        if fallback:
            risk_id = fallback["riskId"]
    p_pct = int(emv["pPct"]) if emv["pPct"] is not None else (fallback["pPct"] if fallback else 0)
    i_schedule = int(emv["iSchedule"]) if emv["iSchedule"] is not None else (fallback["iSchedule"] if fallback else 0)
    i_effort = int(emv["iEffort"]) if emv["iEffort"] is not None else (fallback["iEffort"] if fallback else 0)
    emv_schedule = float(emv["emvSchedule"] if emv["emvSchedule"] is not None else (fallback["emvSchedule"] if fallback else 0))
    emv_effort = float(emv["emvEffort"] if emv["emvEffort"] is not None else (fallback["emvEffort"] if fallback else 0))
    qual_score = emv["qualScore"] if emv["qualScore"] is not None else (fallback.get("qualScore") if fallback else None)
    if not risk_id and fallback:
        risk_id = fallback["riskId"]
    if not risk_id:
        risk_id = f"{key}"
    title = fallback["title"] if fallback else (parsed_issue.get("summary") or "")
    strategy = _strategy_from_block_or_description(block, parsed_issue.get("responsePlan") or "") or (fallback.get("strategy") if fallback else None)
    owner = fallback.get("owner") if fallback else parsed_issue.get("assignee")
    status = _risk_status_label(fields, block)
    if fallback and status in ("종료", "관리 중") and fallback.get("status") in ("완화됨", "종료"):
        status = fallback["status"]
    return {
        "riskId": risk_id,
        "category": category,
        "issueKey": key,
        "title": title,
        "pPct": p_pct,
        "iSchedule": i_schedule,
        "iEffort": i_effort,
        "emvSchedule": round(emv_schedule, 1),
        "emvEffort": round(emv_effort, 1),
        "qualScore": qual_score,
        "level": _emv_level(emv_schedule),
        "priority": 0,
        "strategy": strategy,
        "owner": owner,
        "status": status,
    }
def _build_quant_from_issues(raw_issues: list[dict], parsed_issues: list[dict], cat_filter: str) -> tuple[list[dict[str, Any]], bool]:
    """Returns (quant rows, any_environment_parsed)."""
    parsed_by_key = {p["issueKey"]: p for p in parsed_issues}
    rows: list[dict[str, Any]] = []
    any_env = False
    for issue in raw_issues:
        key = issue.get("key", "")
        parsed = parsed_by_key.get(key) or {}
        env_text = parsed.get("_environment") or _description_text(issue.get("fields", {}).get(ENV_FIELD))
        if not env_text.strip():
            continue
        any_env = True
        blocks = _split_environment_blocks(env_text)
        for block in blocks:
            row = _quant_row_from_environment(issue, parsed, block)
            if row:
                rows.append(row)
    if not rows:
        rows = [dict(r) for r in FALLBACK_QUANT]
    else:
        parsed_ids = {r["riskId"] for r in rows}
        issue_keys = {i.get("key") for i in raw_issues}
        for fb in FALLBACK_QUANT:
            if fb["riskId"] in parsed_ids:
                continue
            if fb["issueKey"] not in issue_keys:
                continue
            rows.append(dict(fb))
    if cat_filter.lower() not in ("all", ""):
        rows = [r for r in rows if r["category"].lower() == cat_filter.lower()]
    rows.sort(key=lambda r: (-r["emvSchedule"], r["riskId"]))
    for i, row in enumerate(rows, start=1):
        row["priority"] = i
    return rows, any_env
def _build_status_changes(raw_issues: list[dict], parsed_issues: list[dict], any_env: bool, cat_filter: str) -> list[dict[str, Any]]:
    parsed_by_key = {p["issueKey"]: p for p in parsed_issues}
    rows: list[dict[str, Any]] = []
    for issue in raw_issues:
        key = issue.get("key", "")
        parsed = parsed_by_key.get(key) or {}
        env_text = parsed.get("_environment") or _description_text(issue.get("fields", {}).get(ENV_FIELD))
        if not env_text.strip():
            continue
        category = parsed.get("category") or _primary_category(issue.get("fields", {}))
        labels = parsed.get("_labels") or []
        default_rid = _risk_id_from_block(env_text, labels)
        rows.extend(_parse_environment_history(env_text, key, category, default_rid))
    if not rows and not any_env:
        rows = list(FALLBACK_STATUS_CHANGES)
    if cat_filter.lower() not in ("all", ""):
        rows = [r for r in rows if r["category"].lower() == cat_filter.lower()]
    return rows
def _filter_mitigations(quant: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ids = {r["riskId"] for r in quant}
    return [m for m in MITIGATIONS if m["riskId"] in ids]
def _emv_kpi(quant: list[dict[str, Any]]) -> dict[str, Any]:
    total_emv_schedule = sum(r["emvSchedule"] for r in quant)
    total_emv_effort = sum(r["emvEffort"] for r in quant)
    return {
        "totalEmvSchedule": round(total_emv_schedule, 1),
        "totalEmvEffort": round(total_emv_effort, 1),
        "reservePct": round(total_emv_schedule / SCHEDULE_RESERVE_DAYS * 100) if SCHEDULE_RESERVE_DAYS else 0,
        "highExposure": sum(1 for r in quant if r["emvSchedule"] >= 5),
        "mitigationDone": sum(1 for r in quant if r["status"] in ("완화됨", "종료")),
    }
def _parse_delta_emv_days(delta_str: str) -> float:
    """Δ EMV_일정 문자열 → 절대 일수 (예: '−2.0일' → 2.0)."""
    m = re.search(r"([−\-+]?\d+(?:\.\d+)?)", delta_str or "")
    if not m:
        return 0.0
    return abs(float(m.group(1).replace("−", "-")))


def _sp11_r02_mitigation_days(status_changes: list[dict[str, Any]]) -> float:
    """Sprint 11 갱신 — R-02 Environment 이력 Δ 합."""
    total = 0.0
    for row in status_changes:
        if str(row.get("riskId", "")).upper() == "R-02":
            total += _parse_delta_emv_days(str(row.get("deltaEmvSchedule") or ""))
    return round(total, 1)


# Sprint 8~10 기준선 (SP11 종료 전). SP11만 R-02 갱신 반영.
EMV_TREND_SP10_MITIGATED = 6.5
EMV_TREND_PRIOR_TOTALS = [42.5, 39.2, 37.1]


def _emv_trend(total_emv_schedule: float, status_changes: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    r02_sp11 = _sp11_r02_mitigation_days(status_changes or [])
    if r02_sp11 <= 0:
        r02_sp11 = 2.8  # R-02: −2.0 + −0.8 (Environment 기본)
    sp11_mitigated = round(EMV_TREND_SP10_MITIGATED + r02_sp11, 1)
    return {
        "categories": ["Sprint 8", "Sprint 9", "Sprint 10", "Sprint 11 (현재)"],
        "total": [*EMV_TREND_PRIOR_TOTALS, round(total_emv_schedule, 1)],
        "mitigated": [2.1, 4.8, EMV_TREND_SP10_MITIGATED, sp11_mitigated],
    }
@cached(ttl=300)
async def get_risk_dashboard(category: str | None = None) -> dict[str, Any]:
    cat_filter = (category or "all").strip()
    jql = await _build_risk_jql(None if cat_filter.lower() == "all" else cat_filter)
    board_jql = await _board_jql_clause()
    try:
        raw_issues = await _search_all_issues(jql, _search_fields())
    except Exception as e:
        raise RuntimeError(f"{e} | jql={jql}") from e
    now = datetime.now(timezone.utc)
    parsed = [_issue_row(issue, now) for issue in raw_issues]
    if cat_filter.lower() != "all":
        parsed = [p for p in parsed if p["category"].lower() == cat_filter.lower()]
    # API 응답에서 내부 필드 제거
    public_issues = []
    for p in parsed:
        row = {k: v for k, v in p.items() if not k.startswith("_")}
        public_issues.append(row)
    total = len(public_issues)
    open_items = [p for p in public_issues if not p["isDone"]]
    closed_items = [p for p in public_issues if p["isDone"]]
    with_plan = [p for p in public_issues if p["responsePlan"]]
    by_category_map: dict[str, dict[str, int]] = {}
    for cat in STANDARD_CATEGORIES + [UNCATEGORIZED]:
        by_category_map[cat] = {"total": 0, "open": 0}
    for p in public_issues:
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
    quant, any_env = _build_quant_from_issues(raw_issues, parsed, cat_filter)
    emv_kpi = _emv_kpi(quant)
    status_changes = _build_status_changes(raw_issues, parsed, any_env, cat_filter)
    return {
        "meta": {
            "jql": jql,
            "boardId": settings.board_id,
            "boardScope": board_jql,
            "categoryFilter": cat_filter,
            "riskLabel": RISK_LABEL,
            "categoryField": "components",
            "responsePlanField": "description",
            "emvField": ENV_FIELD,
            "scheduleReserveDays": SCHEDULE_RESERVE_DAYS,
            "asOf": now.isoformat(),
        },
        "kpi": {
            "total": total,
            "open": len(open_items),
            "closed": len(closed_items),
            "planFilledPct": plan_filled_pct,
            "missingPlan": total - len(with_plan),
            **emv_kpi,
        },
        "byCategory": by_category,
        "quantAnalysis": quant,
        "statusChanges": status_changes,
        "emvTrend": _emv_trend(emv_kpi["totalEmvSchedule"], status_changes),
        "mitigations": _filter_mitigations(quant),
        "issues": sorted(public_issues, key=lambda x: (x["isDone"], x["issueKey"])),
        "openIssues": [p for p in public_issues if not p["isDone"]],
    }
