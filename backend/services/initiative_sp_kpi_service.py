"""
KPI-1 작업 완료율 (Story Point) — 설계 메모

목표 정의 (PM 요청):
  · **분모(계획 SP)**: 라벨 하위 각 Initiative **Description** 안 Milestones 표의
    「예상 SP」열 합 (9 Initiative 합산 또는 모델 단위 합).
  · **분자(실적 SP)**: 동일 Initiative → linked Epic → Epic Link 하위 **Story** 의
    `settings.story_points_field` 합. 완료율은 status Done/Closed 기준 completed SP / planned SP.

현재 릴리즈 Gantt KPI-1(76.9% 등)은 **2026 SP01~26 캘린더 중 종료 SP 비율**이라
위 정의와 **다릅니다**. FE 요약 카드는 본 API 연동 후 교체 예정.

구현 단계:
  1. Initiative search fields + `description` fetch
  2. `parse_planned_sp_from_description(html)` — wiki 표 | M* | SP 패턴
  3. Epic/Story JQL per initiative (release_gantt linkedIssues 패턴 재사용)
  4. `GET /api/model-status/initiatives/story-sp-kpi`
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
from tvjira_client import tvjira_search_all


def parse_planned_sp_from_description(description: str | None) -> tuple[float, list[dict[str, Any]]]:
    """Description wiki/HTML 에서 Milestone 표 예상 SP 추출 (best-effort)."""
    if not description or not str(description).strip():
        return 0.0, []
    text = unescape(str(description))
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    rows: list[dict[str, Any]] = []
    total = 0.0
    for m in re.finditer(r"(M\d+|IR\d+\s*M\d+)[^\d]{0,40}?(\d+(?:\.\d+)?)\s*SP", text, re.I):
        sp = float(m.group(2))
        rows.append({"milestone": m.group(1), "plannedSp": sp})
        total += sp
    if total <= 0:
        nums = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)\s*SP", text, re.I)]
        total = sum(nums)
        for i, sp in enumerate(nums[:20]):
            rows.append({"milestone": f"row{i+1}", "plannedSp": sp})
    return total, rows


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
    """Initiative Description 계획 SP + (샘플) Story SP — 진단/FE 연동용."""
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
        desc = f.get("description") or ""
        planned, planned_rows = parse_planned_sp_from_description(desc)
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
                "plannedSpFromDescription": planned,
                "plannedRowsSample": planned_rows[:5],
                "storySpTotal": actual,
                "storySpDone": done,
                "storyCount": story_count,
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
            "plannedSp": "Initiative description Milestones table (예상 SP sum)",
            "actualSp": "Sum story points on Stories under Initiative linked Epics",
            "completionPct": "storySpDone / plannedSp (when planned > 0)",
            "notCalendarSp26": "Release Gantt KPI-1 calendar elapsed ≠ this metric",
        },
        "plannedSpTotal": planned_total,
        "storySpTotal": story_sp_total,
        "storySpDone": story_sp_done,
        "completionPct": pct,
        "burnPctVsPlan": pct_actual_vs_plan,
        "byInitiative": per_init,
        "errors": errors,
    }
