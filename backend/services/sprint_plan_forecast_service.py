"""
Release/Sprint Plan — 1단계 예측 (Burndown · Velocity · EMV · 자원).
개발팀 대시보드 / GET /api/sprint-plan/forecast
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

from cache import cached
from config import settings
from services import jira_service
from services.risk_service import SCHEDULE_RESERVE_DAYS, get_risk_dashboard


def _status_from_delay(delay_days: float) -> str:
    if delay_days <= 0:
        return "ok"
    if delay_days <= 2:
        return "warning"
    return "critical"


def _status_from_pct(pct: float, warn: float = 70, crit: float = 85) -> str:
    if pct < warn:
        return "ok"
    if pct < crit:
        return "warning"
    return "critical"


def _burndown_forecast(burndown: dict, summary: dict) -> dict[str, Any]:
    points = burndown.get("points") or []
    sprint_name = burndown.get("sprintName") or summary.get("sprintName") or "N/A"
    days_left = int(summary.get("daysLeft") or 0)
    planned_end = summary.get("endDate") or ""

    remaining = float(summary.get("remainingPoints") or 0)
    if points:
        remaining = float(points[-1].get("actual") or remaining)

    required_daily = round(remaining / days_left, 2) if days_left > 0 else remaining

    actual_daily = 0.0
    if len(points) >= 2:
        sample = points[-4:] if len(points) >= 4 else points
        burns: list[float] = []
        for i in range(1, len(sample)):
            delta = float(sample[i - 1].get("actual") or 0) - float(sample[i].get("actual") or 0)
            if delta >= 0:
                burns.append(delta)
        if burns:
            actual_daily = round(sum(burns) / len(burns), 2)

    predicted_end: str | None = None
    delay_days = 0.0
    today = datetime.now(timezone.utc).date()

    if actual_daily > 0.05 and remaining > 0:
        days_needed = remaining / actual_daily
        predicted = today + timedelta(days=days_needed)
        predicted_end = predicted.isoformat()
        if planned_end:
            try:
                end_dt = datetime.fromisoformat(planned_end).date()
                delay_days = round((predicted - end_dt).days, 1)
            except ValueError:
                delay_days = max(0.0, round(days_needed - days_left, 1))
    elif remaining > 0 and days_left > 0:
        delay_days = float(days_left)

    status = _status_from_delay(delay_days)
    if remaining <= 0:
        status = "ok"
        summary_text = f"{sprint_name} — 잔여 SP 없음, 스프린트 목표 달성 가능"
    elif actual_daily <= 0.05:
        status = "critical"
        summary_text = f"최근 SP 소진 없음 · 필요 {required_daily} SP/일"
    elif delay_days > 0:
        summary_text = f"예측 +{delay_days:.0f}일 지연 · 필요 {required_daily} vs 실제 {actual_daily} SP/일"
    else:
        summary_text = f"정상 궤도 · 실제 {actual_daily} SP/일 (필요 {required_daily})"

    return {
        "sprintName": sprint_name,
        "remainingSp": round(remaining, 1),
        "daysLeft": days_left,
        "requiredDailyBurn": required_daily,
        "actualDailyBurn": actual_daily,
        "predictedCompletionDate": predicted_end,
        "plannedEndDate": planned_end,
        "delayDays": delay_days,
        "status": status,
        "summary": summary_text,
    }


def _velocity_forecast(velocity: list[dict], burndown: dict) -> dict[str, Any]:
    completed = [float(v.get("completed") or 0) for v in velocity if float(v.get("completed") or 0) > 0]
    planned = [float(v.get("planned") or 0) for v in velocity if float(v.get("planned") or 0) > 0]
    avg_completed = round(sum(completed) / len(completed), 1) if completed else 0.0
    avg_planned = round(sum(planned) / len(planned), 1) if planned else 0.0

    current = velocity[-1] if velocity else {}
    current_planned = float(current.get("planned") or burndown.get("totalPoints") or 0)
    current_completed = float(current.get("completed") or 0)
    velocity_gap = round(current_planned - avg_completed, 1)
    achievement = round(current_completed / current_planned * 100, 1) if current_planned else 0.0

    if avg_completed <= 0:
        status = "warning"
        summary_text = "Velocity 이력 부족 — 예측 신뢰도 낮음"
    elif velocity_gap > avg_completed * 0.15:
        status = "critical"
        summary_text = f"커밋 {current_planned} SP vs 평균 완료 {avg_completed} SP — 과대 계획 위험"
    elif velocity_gap > 0:
        status = "warning"
        summary_text = f"평균 Velocity {avg_completed} SP 대비 +{velocity_gap} SP 커밋"
    else:
        status = "ok"
        summary_text = f"평균 Velocity {avg_completed} SP · 달성률 {achievement}%"

    return {
        "avgCompletedSp": avg_completed,
        "avgPlannedSp": avg_planned,
        "currentSprintPlanned": round(current_planned, 1),
        "currentSprintCompleted": round(current_completed, 1),
        "velocityGap": velocity_gap,
        "commitAchievementPct": achievement,
        "status": status,
        "summary": summary_text,
    }


def _emv_forecast(risk_data: dict | None) -> dict[str, Any]:
    reserve = SCHEDULE_RESERVE_DAYS
    if not risk_data:
        return {
            "totalEmvSchedule": 0.0,
            "totalEmvEffort": 0.0,
            "scheduleReserveDays": reserve,
            "reserveUsedPct": 0.0,
            "openRisks": 0,
            "highExposure": 0,
            "status": "ok",
            "summary": "리스크 EMV 데이터 없음",
        }

    kpi = risk_data.get("kpi") or {}
    total_sched = float(kpi.get("totalEmvSchedule") or 0)
    total_effort = float(kpi.get("totalEmvEffort") or 0)
    reserve_pct = float(kpi.get("reservePct") or 0)
    open_risks = int(kpi.get("open") or 0)
    high_exp = int(kpi.get("highExposure") or 0)
    status = _status_from_pct(reserve_pct)

    if reserve_pct >= 85:
        summary_text = f"Σ EMV_일정 {total_sched}일 — Reserve {reserve_pct:.0f}% 사용, 대응 전략 점검 필요"
    elif reserve_pct >= 70:
        summary_text = f"Σ EMV_일정 {total_sched}일 — Reserve {reserve_pct:.0f}% (주의)"
    else:
        summary_text = f"Σ EMV_일정 {total_sched}일 · EMV_공수 {total_effort} MD — Reserve {reserve_pct:.0f}%"

    return {
        "totalEmvSchedule": total_sched,
        "totalEmvEffort": total_effort,
        "scheduleReserveDays": reserve,
        "reserveUsedPct": round(reserve_pct, 1),
        "openRisks": open_risks,
        "highExposure": high_exp,
        "status": status,
        "summary": summary_text,
    }


def _resource_forecast(workload: list[dict]) -> dict[str, Any]:
    members = [w for w in workload if (w.get("name") or "").lower() not in ("unassigned", "미할당")]
    if not members:
        return {
            "teamSize": 0,
            "avgSpPerMember": 0.0,
            "maxSpPerMember": 0.0,
            "overloadedCount": 0,
            "status": "ok",
            "summary": "워크로드 데이터 없음",
        }

    sps = [float(m.get("storyPoints") or 0) for m in members]
    avg_sp = sum(sps) / len(sps)
    max_sp = max(sps)
    threshold = avg_sp * 1.3 if avg_sp > 0 else 0
    overloaded = sum(1 for sp in sps if threshold > 0 and sp > threshold)

    if overloaded >= 2:
        status = "critical"
        summary_text = f"{overloaded}명 과부하 (평균 {avg_sp:.1f} SP 대비 130% 초과)"
    elif overloaded == 1:
        status = "warning"
        summary_text = f"1명 과부하 · 최대 {max_sp:.1f} SP"
    else:
        status = "ok"
        summary_text = f"팀 {len(members)}명 · 평균 {avg_sp:.1f} SP/인"

    return {
        "teamSize": len(members),
        "avgSpPerMember": round(avg_sp, 1),
        "maxSpPerMember": round(max_sp, 1),
        "overloadedCount": overloaded,
        "status": status,
        "summary": summary_text,
    }


def _build_alerts(
    burndown_fc: dict,
    velocity_fc: dict,
    emv_fc: dict,
    resource_fc: dict,
) -> list[str]:
    alerts: list[str] = []
    for block in (burndown_fc, velocity_fc, emv_fc, resource_fc):
        if block.get("status") in ("warning", "critical"):
            alerts.append(str(block.get("summary") or ""))
    return [a for a in alerts if a]


@cached(ttl=120)
async def get_sprint_plan_forecast() -> dict[str, Any]:
    now = datetime.now(timezone.utc)

    async def _safe(coro):
        try:
            return await coro
        except Exception:
            return None

    burndown, velocity, summary, workload, risk_data = await asyncio.gather(
        _safe(jira_service.get_burndown()),
        _safe(jira_service.get_velocity()),
        _safe(jira_service.get_sprint_summary()),
        _safe(jira_service.get_team_workload()),
        _safe(get_risk_dashboard()),
    )

    burndown = burndown or {"sprintName": "N/A", "totalPoints": 0, "points": []}
    velocity = velocity or []
    summary = summary or {
        "sprintName": burndown.get("sprintName"),
        "remainingPoints": 0,
        "daysLeft": 0,
        "endDate": "",
    }
    workload = workload or []

    burndown_fc = _burndown_forecast(burndown, summary)
    velocity_fc = _velocity_forecast(velocity, burndown)
    emv_fc = _emv_forecast(risk_data)
    resource_fc = _resource_forecast(workload)
    alerts = _build_alerts(burndown_fc, velocity_fc, emv_fc, resource_fc)

    return {
        "asOf": now.isoformat(),
        "sprintBurndown": burndown_fc,
        "velocity": velocity_fc,
        "emv": emv_fc,
        "resource": resource_fc,
        "alerts": alerts,
        "meta": {
            "dataSource": "jira",
            "boardId": settings.board_id,
            "methods": "burndown_slope · velocity_gap · EMV_reserve · workload_ratio",
        },
    }
