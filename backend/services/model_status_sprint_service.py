"""
모델현황 — 스프린트 · Velocity (TV Jira / TVPLAT).

Harmony MLCSIXZERO 보드가 아님. Initiative · 릴리즈·Epic · story-sp-kpi 와 동일 데이터:
  - release_gantt (2026 IR/SP 캘린더, Epic Milestone)
  - initiative Description 마일스톤 표 (Target Sprint, 예상 SP)
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from services.model_status_initiative_service import normalize_model_code, resolve_initiative_label
from services.release_sprint_calendar_2026 import calendar_payload, sprint_for_day

_SP_IN_TEXT = re.compile(r"(?:IR\d+)?SP\s*0*(\d+)", re.I)


def resolve_sprint_model_label(model: str | None, label: str | None) -> str | None:
    return resolve_initiative_label(model, label)


def parse_sp_number(raw: str | None) -> int | None:
    if not raw:
        return None
    s = str(raw).strip()
    m = _SP_IN_TEXT.search(s.replace("_", " "))
    if m:
        return int(m.group(1))
    m2 = re.search(r"\b(\d{1,2})\b", s)
    if m2:
        n = int(m2.group(1))
        if 1 <= n <= 26:
            return n
    return None


def _milestone_done(status: str | None) -> bool:
    n = (status or "").lower()
    return any(x in n for x in ("done", "closed", "complete", "resolved", "완료"))


def _aggregate_milestone_rows(kpi: dict[str, Any], gantt: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for init in kpi.get("byInitiative") or []:
        ikey = init.get("initiativeKey") or ""
        for m in init.get("milestones") or []:
            rows.append({**m, "initiativeKey": ikey, "source": "description"})
    cal = gantt.get("calendar") or {}
    for epic in cal.get("epics") or []:
        for m in epic.get("milestones") or []:
            sp = m.get("sprint")
            if sp is None:
                sp = parse_sp_number(m.get("label") or m.get("summary"))
            rows.append(
                {
                    "milestone": m.get("label") or m.get("issueKey"),
                    "summary": m.get("summary") or "",
                    "targetSprint": f"SP{sp:02d}" if sp else "",
                    "dueDate": m.get("dueDate") or "",
                    "plannedSp": 0,
                    "completionStatus": m.get("status") or "",
                    "issueKey": m.get("issueKey"),
                    "epicKey": epic.get("issueKey"),
                    "source": "jira_milestone",
                    "sprintSp": sp,
                }
            )
    return rows


def build_sp_velocity(rows: list[dict[str, Any]], sp_min: int, sp_max: int) -> list[dict[str, Any]]:
    buckets: dict[int, dict[str, float]] = {}
    for row in rows:
        sp = row.get("sprintSp")
        if sp is None:
            sp = parse_sp_number(str(row.get("targetSprint") or ""))
        if sp is None or sp < sp_min or sp > sp_max:
            continue
        planned = float(row.get("plannedSp") or 0)
        if planned <= 0 and row.get("source") == "jira_milestone":
            planned = 1.0
        done = planned if _milestone_done(str(row.get("completionStatus") or "")) else 0.0
        b = buckets.setdefault(sp, {"committed": 0.0, "completed": 0.0})
        b["committed"] += planned
        b["completed"] += done
    out: list[dict[str, Any]] = []
    for sp in range(sp_min, sp_max + 1):
        b = buckets.get(sp, {"committed": 0.0, "completed": 0.0})
        out.append(
            {
                "sprintName": f"SP{sp:02d}",
                "committed": round(b["committed"], 1),
                "completed": round(b["completed"], 1),
            }
        )
    return out


def build_sp_burndown(velocity: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(v["committed"] for v in velocity)
    if total <= 0:
        return {"sprintName": "IR/SP plan", "totalPoints": 0, "points": []}
    cum_plan = 0.0
    cum_done = 0.0
    points: list[dict[str, Any]] = []
    for i, v in enumerate(velocity):
        cum_plan += v["committed"]
        cum_done += v["completed"]
        remaining_plan = max(0.0, total - cum_plan)
        remaining_actual = max(0.0, total - cum_done)
        points.append(
            {
                "day": v["sprintName"],
                "ideal": round(remaining_plan, 1),
                "actual": round(remaining_actual, 1),
            }
        )
    return {"sprintName": "Milestone plan (누적)", "totalPoints": round(total, 1), "points": points}


def build_alerts(kpi: dict[str, Any], velocity: list[dict[str, Any]], current_sp: int | None) -> list[str]:
    alerts: list[str] = []
    pct = kpi.get("consumptionPct")
    if pct is not None and float(pct) < 70:
        alerts.append(f"KPI-1 SP 소진율 {pct}% — Initiative Description 계획 대비 저조")
    comp = kpi.get("completionPct")
    if comp is not None and float(comp) < 60:
        alerts.append(f"Story 완료율 {comp}% — Epic 하위 Story 진척 리스크")
    if current_sp and velocity:
        cur = next((v for v in velocity if v["sprintName"] == f"SP{current_sp:02d}"), None)
        if cur and cur["committed"] > 0 and cur["completed"] / cur["committed"] < 0.5:
            alerts.append(f"현재 {cur['sprintName']} Milestone 완료 {cur['completed']}/{cur['committed']} SP — 스프린트 리스크")
    for e in (kpi.get("errors") or [])[:3]:
        alerts.append(str(e)[:120])
    return alerts


async def get_sprint_dashboard_for_model(
    model: str | None = None,
    label: str | None = None,
    project_key: str = "TVPLAT",
) -> dict[str, Any]:
    jira_label = resolve_sprint_model_label(model, label)
    if not jira_label:
        raise ValueError(f"Unknown model for TV sprint (model={model!r}, label={label!r})")

    from services.initiative_sp_kpi_service import preview_story_sp_kpi
    from services.release_gantt_service import get_release_gantt

    kpi = await preview_story_sp_kpi(model=model, label=jira_label, project_key=project_key)
    gantt = await get_release_gantt(
        model=model,
        label=jira_label,
        project_key=project_key,
        all_initiatives=True,
    )
    cal = gantt.get("calendar") or calendar_payload()
    sp_min = int(cal.get("sprintMin") or 1)
    sp_max = int(cal.get("sprintMax") or 26)
    sprints = cal.get("sprints") or []

    today = datetime.now(timezone.utc).date()
    current_sp = sprint_for_day(today)
    current_label = ""
    for s in sprints:
        if s.get("sp") == current_sp:
            current_label = s.get("label") or f"SP{current_sp:02d}"
            break

    rows = _aggregate_milestone_rows(kpi, gantt)
    velocity = build_sp_velocity(rows, sp_min, sp_max)
    burndown = build_sp_burndown(velocity)
    alerts = build_alerts(kpi, velocity, current_sp)

    milestone_total = sum(1 for r in rows if r.get("milestone") or r.get("issueKey"))
    milestone_done = sum(1 for r in rows if _milestone_done(str(r.get("completionStatus") or "")))

    summary = {
        "sprintName": current_label or (f"SP{current_sp:02d}" if current_sp else "—"),
        "remainingPoints": round(float(kpi.get("plannedSpTotal") or 0) - float(kpi.get("effectiveSpConsumed") or kpi.get("storySpConsumed") or 0), 1),
        "completionRate": round(float(kpi.get("completionPct") or 0), 1),
        "blockerCount": len(alerts),
        "endDate": "",
        "daysLeft": 0,
        "plannedSpTotal": kpi.get("plannedSpTotal"),
        "consumptionPct": kpi.get("consumptionPct"),
        "currentSp": current_sp,
    }

    issues = [
        {
            "issueKey": r.get("issueKey") or r.get("milestone") or "—",
            "issueUrl": "",
            "issueType": "Milestone",
            "summary": (r.get("summary") or r.get("milestone") or "")[:120],
            "assignee": r.get("initiativeKey") or "—",
            "status": r.get("completionStatus") or "—",
            "storyPoints": int(float(r.get("plannedSp") or 0)),
            "priority": r.get("targetSprint") or "",
        }
        for r in rows
        if not _milestone_done(str(r.get("completionStatus") or ""))
    ][:40]

    return {
        "meta": {
            "model": normalize_model_code(model) or model,
            "label": jira_label,
            "projectKey": project_key,
            "source": "tvjira",
            "currentSp": current_sp,
            "currentSprintLabel": current_label,
            "initiativeCount": kpi.get("initiativeCount"),
            "epicCount": gantt.get("meta", {}).get("epicCount"),
            "milestoneRows": milestone_total,
            "milestoneDone": milestone_done,
            "asOf": datetime.now(timezone.utc).isoformat(),
            "hint": "Initiative · release/gantt · story-sp-kpi 와 동일 TVPLAT 스코프",
        },
        "summary": summary,
        "burndown": burndown,
        "velocity": velocity,
        "workload": [],
        "issues": issues,
        "alerts": alerts,
        "kpi": {
            "plannedSpTotal": kpi.get("plannedSpTotal"),
            "effectiveSpConsumed": kpi.get("effectiveSpConsumed"),
            "consumptionPct": kpi.get("consumptionPct"),
            "completionPct": kpi.get("completionPct"),
            "byInitiative": kpi.get("byInitiative"),
        },
    }
