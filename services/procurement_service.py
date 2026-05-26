"""
조달 KPI 대시보드 — Jira Request + PROCUREMENT / Vendor_* / 단계 label.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client
from services.quality_service import _board_jql_clause, _issue_browse_url

PROCUREMENT_LABEL = "PROCUREMENT"
ISSUE_TYPE = getattr(settings, "procurement_issue_type", "Request")

VENDOR_OPTIONS: list[dict[str, str]] = [
    {"id": "all", "label": "전체", "jiraLabel": ""},
    {"id": "mcs", "label": "MCS", "jiraLabel": "Vendor_MCS"},
    {"id": "tonly", "label": "Tonly", "jiraLabel": "Vendor_Tonly"},
    {"id": "ite", "label": "ITE", "jiraLabel": "Vendor_ITE"},
    {"id": "actions", "label": "Actions", "jiraLabel": "Vendor_Actions"},
]

PHASE_OPTIONS: list[dict[str, str]] = [
    {"id": "all", "label": "전체 단계", "jiraLabel": ""},
    {"id": "plan", "label": "계획", "jiraLabel": "PROC_PLAN"},
    {"id": "contract", "label": "계약", "jiraLabel": "CONTRACT"},
    {"id": "signed", "label": "체결", "jiraLabel": "SIGNED"},
    {"id": "execute", "label": "수행", "jiraLabel": "PROC_EXECUTE"},
    {"id": "verified", "label": "검증완료", "jiraLabel": "VERIFIED"},
    {"id": "close", "label": "종료", "jiraLabel": "PROC_CLOSE"},
]

PIPELINE_PHASES: list[tuple[str, str]] = [
    ("PROC_PLAN", "계획"),
    ("CONTRACT", "계약"),
    ("SIGNED", "체결"),
    ("PROC_EXECUTE", "수행"),
    ("VERIFIED", "검증완료"),
    ("PROC_CLOSE", "종료"),
]

VENDOR_LABEL_TO_NAME = {
    "Vendor_MCS": "MCS",
    "Vendor_Tonly": "Tonly",
    "Vendor_ITE": "ITE",
    "Vendor_Actions": "Actions",
}

CONTRACT_LABELS = frozenset({"CONTRACT", "SIGNED"})
SPRINT_DAYS = 14
RESPONSE_PLAN_FIELD = getattr(settings, "response_plan_field", "") or "customfield_10901"
# Request(조달) DoD — Story 계획 추적성 dod_field(18874)와 필드 ID가 다름
PROCUREMENT_DOD_FIELD = getattr(settings, "procurement_dod_field", None) or "customfield_10504"
RISK_PRIORITIES = getattr(settings, "risk_priorities", "P0,P1,P2")
DONE_STATUS_CATEGORY = getattr(settings, "done_status_category", "done")

# 인도 검수 계획 — 품목별 정적 기준 (검수 Task 건수는 Request 집계로 보강)
ACCEPTANCE_TEMPLATE: list[dict[str, str]] = [
    {
        "item": "Main SoC FW",
        "criteria": "기능 동작 · 성능 ±5%",
        "method": "품질 TC · 기능 테스트",
        "targetDate": "2026.03",
        "vendorHint": "Vendor_MCS",
    },
    {
        "item": "BT/Wireless FW",
        "criteria": "Spec v2.1",
        "method": "사양 검토 · 성능 지표",
        "targetDate": "2026.03",
        "vendorHint": "Vendor_Tonly",
    },
    {
        "item": "HDMI FW",
        "criteria": "기능 동작 · 성능 ±5%",
        "method": "품질 TC · 성능 지표",
        "targetDate": "2026.03",
        "vendorHint": "Vendor_ITE",
    },
    {
        "item": "시험 리포트",
        "criteria": "시험 완료 · 기준 충족",
        "method": "리뷰",
        "targetDate": "2024.27",
        "vendorHint": "Vendor_Actions",
    },
]

MONITORING_TEMPLATE: list[dict[str, str]] = [
    {
        "date": "2026.02.10",
        "category": "일정",
        "verdict": "일부 지연",
        "note": "Dolby Atmos 인증 일정 3월로 조정",
        "vendor": "Vendor_Tonly",
    },
    {
        "date": "2026.04.02",
        "category": "품질",
        "verdict": "충족",
        "note": "품질 충족률 100% 유지",
        "vendor": "전체",
    },
]


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


def _fmt_schedule_month(dt: datetime) -> str:
    return dt.strftime("%Y.%m")


def _schedule_current_label(
    start: datetime,
    end: datetime,
    now: datetime,
    all_done: bool,
) -> str:
    if all_done:
        return "완료"
    total_days = max(0, (end.date() - start.date()).days)
    total_sprints = max(1, (total_days + SPRINT_DAYS - 1) // SPRINT_DAYS)
    elapsed = (now.date() - start.date()).days
    if elapsed < 0:
        current = 1
    else:
        current = min(total_sprints, elapsed // SPRINT_DAYS + 1)
    return f"Sprint {current}/{total_sprints}"


def _schedule_row_state(items: list[dict[str, Any]]) -> str:
    done_n = sum(1 for i in items if i["isDone"])
    if any(i["health"] == "주의" for i in items):
        return "주의"
    if done_n == len(items):
        return "완료"
    return "정상"


def _labels(fields: dict) -> set[str]:
    return {str(l) for l in (fields.get("labels") or [])}


def _vendor_from_labels(label_set: set[str]) -> tuple[str, str]:
    for jl, name in VENDOR_LABEL_TO_NAME.items():
        if jl in label_set:
            return name, jl
    return "—", ""


def _phase_labels_present(label_set: set[str]) -> list[str]:
    order = [p[0] for p in PIPELINE_PHASES]
    return [l for l in order if l in label_set]


def _highest_phase(label_set: set[str]) -> str:
    present = _phase_labels_present(label_set)
    return present[-1] if present else "—"


def _is_done(fields: dict) -> bool:
    cat = fields.get("status", {}).get("statusCategory", {}).get("key", "")
    return cat == DONE_STATUS_CATEGORY


def _assignee_name(fields: dict) -> str:
    assignee = fields.get("assignee")
    if not assignee:
        return "Unassigned"
    return assignee.get("displayName") or assignee.get("name") or "Unassigned"


def _adf_to_text(node: Any) -> str:
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return "\n".join(filter(None, (_adf_to_text(n) for n in node)))
    if isinstance(node, dict):
        if node.get("type") == "text":
            return node.get("text") or ""
        if node.get("type") == "hardBreak":
            return "\n"
        parts = [_adf_to_text(node.get("text")), _adf_to_text(node.get("content"))]
        return "".join(p for p in parts if p)
    return ""


def _procurement_field_text(value: Any) -> str:
    """Jira Server/Cloud — string · {value} · ADF · list."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        if "content" in value:
            return _adf_to_text(value).strip()
        for key in ("value", "name", "displayName", "text"):
            part = value.get(key)
            if part:
                return _procurement_field_text(part)
        return ""
    if isinstance(value, list):
        parts = [_procurement_field_text(v) for v in value if v is not None]
        return "\n".join(p for p in parts if p).strip()
    return str(value).strip()


def _dod_field_text(fields: dict) -> str:
    if not PROCUREMENT_DOD_FIELD:
        return ""
    return _procurement_field_text(fields.get(PROCUREMENT_DOD_FIELD)).strip()


def _dod_field_debug(fields: dict) -> dict[str, Any]:
    """DoD 필드 raw / parsed — pod 디버깅용."""
    raw = fields.get(PROCUREMENT_DOD_FIELD) if PROCUREMENT_DOD_FIELD else None
    return {
        "dodField": PROCUREMENT_DOD_FIELD,
        "rawType": type(raw).__name__ if raw is not None else "null",
        "raw": raw,
        "parsed": _dod_field_text(fields),
    }


async def debug_procurement_dod(issue_key: str) -> dict[str, Any]:
    """Request 이슈 DoD 필드 조회 — customfield 후보 포함."""
    issue = await jira_client.get_issue(issue_key.strip().upper())
    fields = issue.get("fields", {})
    custom: dict[str, Any] = {
        k: v
        for k, v in fields.items()
        if k.startswith("customfield") and v is not None
    }
    text_fields: list[dict[str, str]] = []
    for key, raw in custom.items():
        text = _procurement_field_text(raw)
        if text:
            text_fields.append(
                {
                    "field": key,
                    "text": text if len(text) <= 200 else text[:200] + "…",
                }
            )
    return {
        "issueKey": issue.get("key", issue_key),
        "issuetype": (fields.get("issuetype") or {}).get("name"),
        "labels": fields.get("labels") or [],
        "dod": _dod_field_debug(fields),
        "customFieldsWithText": text_fields,
    }


def _pick_group_dod(items: list[dict[str, Any]]) -> str:
    ordered = sorted(
        items,
        key=lambda i: (
            0 if i["health"] == "주의" else 1,
            0 if i.get("dodText") else 1,
        ),
    )
    for item in ordered:
        if item.get("dodText"):
            return item["dodText"]
    return "—"


def _health(label_set: set[str], done: bool, due: datetime | None, now: datetime) -> str:
    if "VERIFIED" in label_set and done:
        return "완료"
    if done:
        return "완료"
    if "CONTRACT" in label_set and "SIGNED" not in label_set:
        return "주의"
    return "정상"


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


async def _build_procurement_jql(vendor_id: str, phase_id: str) -> str:
    clauses = [
        f'issuetype = "{ISSUE_TYPE}"',
        f'labels = "{PROCUREMENT_LABEL}"',
    ]

    vendor = next((v for v in VENDOR_OPTIONS if v["id"] == vendor_id), VENDOR_OPTIONS[0])
    if vendor["jiraLabel"]:
        clauses.append(f'labels = "{vendor["jiraLabel"]}"')

    phase = next((p for p in PHASE_OPTIONS if p["id"] == phase_id), PHASE_OPTIONS[0])
    if phase["jiraLabel"]:
        clauses.append(f'labels = "{phase["jiraLabel"]}"')

    core = " AND ".join(clauses)
    board_jql = await _board_jql_clause()
    return f"({board_jql}) AND {core}"


def get_procurement_filters() -> dict[str, Any]:
    return {
        "vendors": [{"id": v["id"], "label": v["label"], "jiraLabel": v["jiraLabel"]} for v in VENDOR_OPTIONS],
        "phases": [{"id": p["id"], "label": p["label"], "jiraLabel": p["jiraLabel"]} for p in PHASE_OPTIONS],
    }


async def _compute_risk_kpi() -> dict[str, Any]:
    """P1/P2 Bug — 대응계획 입력률 (품질 대시보드 연계)."""
    prios = [p.strip() for p in RISK_PRIORITIES.split(",") if p.strip()]
    if not prios:
        return {"actualPct": 0, "numerator": 0, "denominator": 0}

    pri_jql = ", ".join(f'"{p}"' for p in prios)
    bug_clause = f'issuetype = Bug AND priority in ({pri_jql}) AND statusCategory != Done'
    board_jql = await _board_jql_clause()
    jql = f"({board_jql}) AND {bug_clause}"

    fields = ["priority"]
    if RESPONSE_PLAN_FIELD:
        fields.append(RESPONSE_PLAN_FIELD)

    try:
        issues = await _search_all_issues(jql, fields)
    except Exception:
        return {"actualPct": 0, "numerator": 0, "denominator": 0}

    total = len(issues)
    if not total:
        return {"actualPct": 100, "numerator": 0, "denominator": 0}

    with_plan = 0
    for issue in issues:
        fields_data = issue.get("fields", {})
        plan = fields_data.get(RESPONSE_PLAN_FIELD) if RESPONSE_PLAN_FIELD else None
        if plan and str(plan).strip():
            with_plan += 1

    pct = round(with_plan / total * 100) if total else 100
    return {"actualPct": pct, "numerator": with_plan, "denominator": total}


@cached(ttl=300)
async def get_procurement_dashboard(
    vendor: str = "all",
    phase: str = "all",
) -> dict[str, Any]:
    jql = await _build_procurement_jql(vendor, phase)
    search_fields = ["summary", "status", "labels", "assignee", "duedate", "created", "resolutiondate"]
    if PROCUREMENT_DOD_FIELD:
        search_fields.append(PROCUREMENT_DOD_FIELD)
    try:
        raw_issues = await _search_all_issues(jql, search_fields)
    except Exception as e:
        raise RuntimeError(f"{e} | jql={jql}") from e
    now = datetime.now(timezone.utc)

    parsed: list[dict[str, Any]] = []
    for issue in raw_issues:
        fields = issue.get("fields", {})
        label_set = _labels(fields)
        vendor_name, vendor_label = _vendor_from_labels(label_set)
        due_dt = _parse_jira_date(fields.get("duedate"))
        created_dt = _parse_jira_date(fields.get("created"))
        resolved_dt = _parse_jira_date(fields.get("resolutiondate"))
        done = _is_done(fields)
        key = issue.get("key", "")
        dod_text = _dod_field_text(fields)

        parsed.append(
            {
                "issueKey": key,
                "issueUrl": _issue_browse_url(key) if key else "",
                "summary": fields.get("summary") or "",
                "vendor": vendor_name,
                "vendorLabel": vendor_label,
                "phaseLabel": _highest_phase(label_set),
                "phaseLabels": _phase_labels_present(label_set),
                "dueDate": due_dt.strftime("%Y-%m-%d") if due_dt else None,
                "status": fields.get("status", {}).get("name") or "",
                "assignee": _assignee_name(fields),
                "isDone": done,
                "health": _health(label_set, done, due_dt, now),
                "hasContract": bool(label_set & CONTRACT_LABELS),
                "hasSigned": "SIGNED" in label_set,
                "hasVerified": "VERIFIED" in label_set,
                "dueDt": due_dt,
                "resolvedDt": resolved_dt,
                "createdDt": created_dt,
                "dodText": dod_text,
            }
        )

    total = len(parsed)
    signed_count = sum(1 for p in parsed if p["hasSigned"])
    verified_count = sum(1 for p in parsed if p["hasVerified"])
    open_count = sum(1 for p in parsed if not p["isDone"])

    contract_targets = total
    contract_met = sum(1 for p in parsed if p["hasContract"])
    contract_pct = round(contract_met / contract_targets * 100) if contract_targets else 0

    delivery_met = sum(1 for p in parsed if p["isDone"])
    delivery_pct = round(delivery_met / total * 100) if total else 0

    verify_targets = [p for p in parsed if p["hasSigned"]]
    quality_met = sum(1 for p in verify_targets if p["hasVerified"])
    quality_pct = round(quality_met / len(verify_targets) * 100) if verify_targets else 0

    risk = await _compute_risk_kpi()

    kpis = [
        {
            "id": "contract",
            "label": "계약 이행률",
            "target": "100%",
            "targetNum": 100,
            "actualPct": contract_pct,
            "numerator": contract_met,
            "denominator": contract_targets,
            "formula": "CONTRACT 또는 SIGNED label 보유 Request / 조달 대상 Request 전체",
            "met": contract_pct >= 100,
        },
        {
            "id": "delivery",
            "label": "납기 준수율",
            "target": "95% 이상",
            "targetNum": 95,
            "actualPct": delivery_pct,
            "numerator": delivery_met,
            "denominator": total,
            "formula": "statusCategory = Done인 Request / 조달 Request 전체 (due date 미사용)",
            "met": delivery_pct >= 95,
        },
        {
            "id": "quality",
            "label": "품질 충족률",
            "target": "100%",
            "targetNum": 100,
            "actualPct": quality_pct,
            "numerator": quality_met,
            "denominator": len(verify_targets),
            "formula": "VERIFIED label 보유 Request / SIGNED(체결) Request",
            "met": quality_pct >= 100,
        },
        {
            "id": "risk",
            "label": "리스크 조기 대응률",
            "target": "100%",
            "targetNum": 100,
            "actualPct": risk["actualPct"],
            "numerator": risk["numerator"],
            "denominator": risk["denominator"],
            "formula": "P1/P2 미결 Bug 중 대응계획 입력 / P1/P2 미결 전체",
            "met": risk["actualPct"] >= 100,
        },
    ]

    pipeline = [
        {
            "phase": phase_name,
            "label": phase_label,
            "count": sum(1 for p in parsed if phase_label in p["phaseLabels"]),
        }
        for phase_label, phase_name in PIPELINE_PHASES
    ]

    vendor_groups: dict[str, list[dict]] = {}
    for p in parsed:
        vl = p["vendorLabel"] or "unknown"
        vendor_groups.setdefault(vl, []).append(p)

    status_items = []
    for vl, items in vendor_groups.items():
        if not vl:
            continue
        sample = items[0]
        contract_lbl = "SIGNED" if any(i["hasSigned"] for i in items) else (
            "CONTRACT" if any(i["hasContract"] for i in items) else "—"
        )
        health = "주의" if any(i["health"] == "주의" for i in items) else (
            "완료" if all(i["health"] == "완료" for i in items) else "정상"
        )
        risk_note = next((i["summary"] for i in items if i["health"] == "주의"), "—")
        dod_text = _pick_group_dod(items)
        status_items.append(
            {
                "item": sample["summary"][:40] if len(items) == 1 else f"{sample['vendor']} ({len(items)}건)",
                "vendor": sample["vendor"],
                "vendorLabel": vl,
                "contractLabel": contract_lbl,
                "progress": health,
                "dodStatus": dod_text,
                "dodDetail": dod_text if dod_text != "—" else "",
                "risk": risk_note if health == "주의" else "—",
            }
        )

    schedule = []
    for vl, items in vendor_groups.items():
        if not vl or not items:
            continue
        dues = [i["dueDt"] for i in items if i["dueDt"]]
        done_n = sum(1 for i in items if i["isDone"])
        all_done = done_n == len(items)
        state = _schedule_row_state(items)

        if not dues:
            schedule.append(
                {
                    "item": f"{VENDOR_LABEL_TO_NAME.get(vl, vl)} 조달",
                    "start": "—",
                    "end": "—",
                    "milestone": "—",
                    "current": "완료" if all_done else "—",
                    "status": state,
                }
            )
            continue

        start_dt = min(d - timedelta(days=SPRINT_DAYS) for d in dues)
        end_dt = max(dues)
        milestone_dt = min(dues)
        schedule.append(
            {
                "item": f"{VENDOR_LABEL_TO_NAME.get(vl, vl)} 조달",
                "start": _fmt_schedule_month(start_dt),
                "end": _fmt_schedule_month(end_dt),
                "milestone": _fmt_schedule_month(milestone_dt),
                "current": _schedule_current_label(start_dt, end_dt, now, all_done),
                "status": state,
            }
        )

    acceptance = []
    for tmpl in ACCEPTANCE_TEMPLATE:
        related = [p for p in parsed if p["vendorLabel"] == tmpl["vendorHint"]]
        verified_n = sum(1 for p in related if p["hasVerified"])
        total_n = len(related) if related else 1
        state = "완료" if verified_n == total_n and total_n > 0 else (
            "주의" if verified_n < total_n // 2 else "정상"
        )
        acceptance.append(
            {
                "item": tmpl["item"],
                "criteria": tmpl["criteria"],
                "method": tmpl["method"],
                "targetDate": tmpl["targetDate"],
                "verifiedCount": verified_n,
                "totalCount": total_n,
                "status": state,
            }
        )

    monitoring = [
        {
            "date": m["date"],
            "category": m["category"],
            "verdict": m["verdict"],
            "note": m["note"],
            "vendor": m["vendor"],
        }
        for m in MONITORING_TEMPLATE
    ]

    request_rows = [
        {
            "issueKey": p["issueKey"],
            "issueUrl": p["issueUrl"],
            "vendor": p["vendor"],
            "vendorLabel": p["vendorLabel"],
            "summary": p["summary"],
            "phaseLabel": p["phaseLabel"],
            "dueDate": p["dueDate"],
            "status": p["status"],
            "health": p["health"],
            "dodStatus": p["dodText"] or "—",
            "dodDetail": p["dodText"] or "",
            "missingPlan": False,
        }
        for p in sorted(
            parsed,
            key=lambda r: (
                0 if r["health"] == "주의" else 1,
                0 if r["isDone"] else 1,
                r["issueKey"],
            ),
        )
    ]

    return {
        "meta": {
            "vendor": vendor,
            "phase": phase,
            "jql": jql,
            "boardId": settings.board_id,
            "asOf": now.strftime("%Y-%m-%d"),
            "dodField": PROCUREMENT_DOD_FIELD,
        },
        "summary": {
            "total": total,
            "signed": signed_count,
            "verified": verified_count,
            "open": open_count,
        },
        "kpis": kpis,
        "statusItems": status_items,
        "pipeline": pipeline,
        "schedule": schedule,
        "acceptance": acceptance,
        "monitoring": monitoring,
        "requests": request_rows,
    }
