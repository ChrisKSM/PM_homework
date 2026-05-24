"""
조달 KPI 대시보드 — Jira Request + PROCUREMENT / Vendor_* / 단계 label.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client
from services.quality_service import _board_jql_clause, _issue_browse_url

PROCUREMENT_LABEL = "PROCUREMENT"
ISSUE_TYPE = "Request"

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
RESPONSE_PLAN_FIELD = settings.response_plan_field

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
    return cat == settings.done_status_category


def _assignee_name(fields: dict) -> str:
    assignee = fields.get("assignee")
    if not assignee:
        return "Unassigned"
    return assignee.get("displayName") or assignee.get("name") or "Unassigned"


def _health(label_set: set[str], done: bool, due: datetime | None, now: datetime) -> str:
    if "VERIFIED" in label_set and done:
        return "완료"
    if due and not done and due.date() < now.date():
        return "주의"
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
    clauses = [f'issuetype = {ISSUE_TYPE}', f'labels = "{PROCUREMENT_LABEL}"']

    vendor = next((v for v in VENDOR_OPTIONS if v["id"] == vendor_id), VENDOR_OPTIONS[0])
    if vendor["jiraLabel"]:
        clauses.append(f'labels = "{vendor["jiraLabel"]}"')

    phase = next((p for p in PHASE_OPTIONS if p["id"] == phase_id), PHASE_OPTIONS[0])
    if phase["jiraLabel"]:
        clauses.append(f'labels = "{phase["jiraLabel"]}"')

    core = " AND ".join(clauses)
    board_jql = await _board_jql_clause()
    if board_jql:
        return f"({board_jql}) AND {core}"
    if settings.quality_project_key:
        return f"project = {settings.quality_project_key} AND {core}"
    return core


def get_procurement_filters() -> dict[str, Any]:
    return {
        "vendors": [{"id": v["id"], "label": v["label"], "jiraLabel": v["jiraLabel"]} for v in VENDOR_OPTIONS],
        "phases": [{"id": p["id"], "label": p["label"], "jiraLabel": p["jiraLabel"]} for p in PHASE_OPTIONS],
    }


async def _compute_risk_kpi() -> dict[str, Any]:
    """P1/P2 Bug — 대응계획 입력률 (품질 대시보드 연계)."""
    prios = [p.strip() for p in settings.risk_priorities.split(",") if p.strip()]
    if not prios:
        return {"actualPct": 0, "numerator": 0, "denominator": 0}

    pri_jql = ", ".join(f'"{p}"' for p in prios)
    bug_clause = f'issuetype = Bug AND priority in ({pri_jql}) AND statusCategory != Done'
    board_jql = await _board_jql_clause()
    jql = f"({board_jql}) AND {bug_clause}" if board_jql else bug_clause

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
    raw_issues = await _search_all_issues(jql, search_fields)
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
            }
        )

    total = len(parsed)
    signed_count = sum(1 for p in parsed if p["hasSigned"])
    verified_count = sum(1 for p in parsed if p["hasVerified"])
    overdue_count = sum(
        1
        for p in parsed
        if p["dueDt"] and not p["isDone"] and p["dueDt"].date() < now.date()
    )

    contract_targets = total
    contract_met = sum(1 for p in parsed if p["hasContract"])
    contract_pct = round(contract_met / contract_targets * 100) if contract_targets else 0

    with_due = [p for p in parsed if p["dueDt"]]
    delivery_met = 0
    for p in with_due:
        due = p["dueDt"]
        if p["isDone"] and p["resolvedDt"]:
            if p["resolvedDt"].date() <= due.date():
                delivery_met += 1
        elif not p["isDone"] and due.date() >= now.date():
            delivery_met += 1
    delivery_pct = round(delivery_met / len(with_due) * 100) if with_due else 0

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
            "denominator": len(with_due),
            "formula": "due date 이내 Done 또는 due date 미경과 Open / due date 지정 Request",
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
        deliverable = "완료" if all(i["isDone"] for i in items) else "진행"
        risk_note = next((i["summary"] for i in items if i["health"] == "주의"), "—")
        status_items.append(
            {
                "item": sample["summary"][:40] if len(items) == 1 else f"{sample['vendor']} ({len(items)}건)",
                "vendor": sample["vendor"],
                "vendorLabel": vl,
                "contractLabel": contract_lbl,
                "progress": health,
                "deliverable": deliverable,
                "risk": risk_note if health == "주의" else "—",
            }
        )

    schedule = []
    for vl, items in vendor_groups.items():
        if not vl or not items:
            continue
        dates = [i["createdDt"] for i in items if i["createdDt"]]
        dues = [i["dueDt"] for i in items if i["dueDt"]]
        start = min(dates).strftime("%Y.%m") if dates else "—"
        end = max(dues).strftime("%Y.%m") if dues else "—"
        milestone = min(dues).strftime("%Y.%m") if dues else "—"
        done_n = sum(1 for i in items if i["isDone"])
        current = f"{done_n}/{len(items)} Done"
        state = "주의" if any(i["health"] == "주의" for i in items) else (
            "완료" if done_n == len(items) else "정상"
        )
        schedule.append(
            {
                "item": f"{VENDOR_LABEL_TO_NAME.get(vl, vl)} 조달",
                "start": start,
                "end": end,
                "milestone": milestone,
                "current": current,
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
            "missingPlan": False,
        }
        for p in sorted(
            parsed,
            key=lambda r: (
                0 if r["health"] == "주의" else 1,
                r["dueDate"] or "9999",
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
        },
        "summary": {
            "total": total,
            "signed": signed_count,
            "verified": verified_count,
            "overdue": overdue_count,
        },
        "kpis": kpis,
        "statusItems": status_items,
        "pipeline": pipeline,
        "schedule": schedule,
        "acceptance": acceptance,
        "monitoring": monitoring,
        "requests": request_rows,
    }
