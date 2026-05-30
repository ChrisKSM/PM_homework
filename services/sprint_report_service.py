"""
주간 스프린트 요약 보고 — 번다운/완료율/Velocity/블로커 지표를 모아
LLM(사내 게이트웨이)으로 한 줄 요약 + 리스크 + 권고를 생성한다.

LLM 비활성/실패 시에는 규칙기반(deterministic) 요약으로 폴백하므로
항상 결과를 반환한다(오프라인·mock 환경 안전).
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from cache import cached
from services import jira_service, llm_client


# ── 지표 집계 ────────────────────────────────────────────────────────────────

def _burndown_gap(burndown: dict[str, Any]) -> float:
    """최신 일자의 (실제 잔여 - 이상 잔여). 양수면 이상선보다 지연."""
    points = burndown.get("points") or []
    if not points:
        return 0.0
    last = points[-1]
    return round(float(last.get("actual", 0)) - float(last.get("ideal", 0)), 1)


def _velocity_trend(velocity: list[dict[str, Any]]) -> tuple[str, float, float]:
    """(추세 라벨, 최근 완료, 직전 평균) 반환."""
    completed = [float(v.get("completed", 0)) for v in velocity if v]
    if len(completed) < 2:
        return ("데이터 부족", completed[-1] if completed else 0.0, 0.0)
    latest = completed[-1]
    prior = completed[:-1]
    prior_avg = round(sum(prior) / len(prior), 1) if prior else 0.0
    if latest > prior_avg * 1.1:
        label = "상승"
    elif latest < prior_avg * 0.9:
        label = "하락"
    else:
        label = "유지"
    return (label, round(latest, 1), prior_avg)


async def _collect_metrics() -> dict[str, Any]:
    sprint = await jira_service.get_sprint_summary()
    burndown = await jira_service.get_burndown()
    velocity = await jira_service.get_velocity()
    workload = await jira_service.get_team_workload()
    blockers = await jira_service.get_risk_issues()

    gap = _burndown_gap(burndown)
    trend_label, latest_v, prior_avg_v = _velocity_trend(velocity)

    overloaded = [w for w in workload if float(w.get("storyPoints", 0)) >= 20]

    return {
        "sprintName": sprint.get("sprintName", "N/A"),
        "completionRate": sprint.get("completionRate", 0),
        "remainingPoints": sprint.get("remainingPoints", 0),
        "daysLeft": sprint.get("daysLeft", 0),
        "totalPoints": burndown.get("totalPoints", 0),
        "burndownGap": gap,
        "blockerCount": len(blockers),
        "blockers": blockers,
        "velocityTrend": trend_label,
        "velocityLatest": latest_v,
        "velocityPriorAvg": prior_avg_v,
        "overloadedMembers": [w.get("name") for w in overloaded],
    }


# ── 규칙기반 폴백 ────────────────────────────────────────────────────────────

def _rule_based(m: dict[str, Any]) -> dict[str, Any]:
    rate = m["completionRate"]
    gap = m["burndownGap"]
    days = m["daysLeft"]
    remaining = m["remainingPoints"]

    if gap > 0:
        pace = f"이상선보다 {gap} SP 뒤처져 있어요"
    elif gap < 0:
        pace = f"이상선보다 {abs(gap)} SP 앞서 있어요"
    else:
        pace = "이상선과 거의 일치해요"

    summary = (
        f"{m['sprintName']} 완료율 {rate}%, 잔여 {remaining} SP (D-{days}). "
        f"번다운은 {pace}. Velocity는 직전 평균 {m['velocityPriorAvg']} SP 대비 "
        f"이번 {m['velocityLatest']} SP로 {m['velocityTrend']} 추세예요."
    )

    risks: list[str] = []
    if m["blockerCount"] > 0:
        risks.append(f"미해결 P0 Story {m['blockerCount']}건 — 스프린트 목표 달성을 직접 위협")
    if gap > 0:
        # 남은 일자에 따른 위험도
        if days and remaining / max(days, 1) > (m["totalPoints"] / 10 if m["totalPoints"] else remaining):
            risks.append(f"잔여 {remaining} SP를 D-{days}에 소진하려면 일일 소진 속도가 부족")
        else:
            risks.append(f"번다운 {gap} SP 지연 — 현재 페이스 유지 시 미완료 가능")
    if m["velocityTrend"] == "하락":
        risks.append("Velocity 하락 추세 — 팀 처리량 저하 또는 과다 계획 가능")
    if m["overloadedMembers"]:
        risks.append("워크로드 집중: " + ", ".join(m["overloadedMembers"]) + " (20+ SP)")
    if not risks:
        risks.append("두드러진 리스크 없음 — 현재 페이스 양호")

    recommendations: list[str] = []
    if m["blockerCount"] > 0:
        recommendations.append("데일리에서 블로커 P0 Story 우선 처리 담당자/기한 확정")
    if gap > 0:
        recommendations.append("스코프 재조정 또는 잔여 작업 분할로 소진 속도 확보")
    if m["overloadedMembers"]:
        recommendations.append("과부하 인원 작업 일부 재분배 검토")
    if not recommendations:
        recommendations.append("현 상태 유지, 남은 기간 리스크 모니터링")

    return {"summary": summary, "risks": risks, "recommendations": recommendations}


# ── LLM 생성 ─────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "너는 애자일 스프린트를 점검하는 개발팀 동료야. "
    "주어진 수치만 근거로, 한국어 실무 캐주얼 말투(반말 아님, ~해요/~네요체)로 "
    "이번 주차 스프린트를 간결하게 브리핑해. 과장/추측 금지, 숫자 근거 중심. "
    "반드시 아래 JSON 형식만 출력해(코드펜스·설명 금지):\n"
    '{"summary": "2~3문장 요약", "risks": ["리스크1", "리스크2"], '
    '"recommendations": ["권고1", "권고2"]}'
)


def _build_user_prompt(m: dict[str, Any]) -> str:
    blocker_lines = "\n".join(
        f"  - {b.get('issueKey')} [{b.get('status')}] {b.get('summary')} (담당 {b.get('assignee')})"
        for b in m["blockers"][:10]
    ) or "  - 없음"
    return (
        f"스프린트: {m['sprintName']}\n"
        f"완료율: {m['completionRate']}%\n"
        f"잔여 Story Point: {m['remainingPoints']} SP / 총 {m['totalPoints']} SP\n"
        f"남은 기간: D-{m['daysLeft']}\n"
        f"번다운 갭(실제-이상): {m['burndownGap']} SP (양수=지연)\n"
        f"Velocity: 이번 {m['velocityLatest']} SP, 직전 평균 {m['velocityPriorAvg']} SP, 추세 {m['velocityTrend']}\n"
        f"미해결 P0 Story({m['blockerCount']}건):\n{blocker_lines}\n"
        f"워크로드 과부하(20+ SP): {', '.join(m['overloadedMembers']) or '없음'}\n"
    )


def _parse_llm_json(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    summary = data.get("summary")
    risks = data.get("risks")
    recs = data.get("recommendations")
    if not isinstance(summary, str) or not isinstance(risks, list) or not isinstance(recs, list):
        return None
    return {
        "summary": summary.strip(),
        "risks": [str(r).strip() for r in risks if str(r).strip()],
        "recommendations": [str(r).strip() for r in recs if str(r).strip()],
    }


# ── 공개 API ─────────────────────────────────────────────────────────────────

async def get_sprint_report(refresh: bool = False) -> dict[str, Any]:
    """버튼 클릭 시 호출. refresh=True면 캐시 무시하고 재생성."""
    if refresh:
        return await _generate_report()
    return await _cached_report()


@cached(ttl=1800)
async def _cached_report() -> dict[str, Any]:
    return await _generate_report()


async def _generate_report() -> dict[str, Any]:
    metrics = await _collect_metrics()

    source = "rule"
    content = _rule_based(metrics)

    if llm_client.is_enabled():
        try:
            raw = await llm_client.chat(_SYSTEM_PROMPT, _build_user_prompt(metrics))
            parsed = _parse_llm_json(raw)
            if parsed:
                content = parsed
                source = "llm"
        except Exception:
            # LLM 실패 시 규칙기반 유지
            source = "rule"

    return {
        "sprintName": metrics["sprintName"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "summary": content["summary"],
        "risks": content["risks"],
        "recommendations": content["recommendations"],
        "metrics": {
            "completionRate": metrics["completionRate"],
            "remainingPoints": metrics["remainingPoints"],
            "daysLeft": metrics["daysLeft"],
            "totalPoints": metrics["totalPoints"],
            "burndownGap": metrics["burndownGap"],
            "blockerCount": metrics["blockerCount"],
            "velocityTrend": metrics["velocityTrend"],
        },
    }
