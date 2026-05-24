"""
Daily dashboard report — data collection and HTML rendering.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from config import settings
from services import jira_service

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


def _epic_progress_pct(epic: dict[str, Any]) -> int:
    total = epic.get("total") or 0
    if total <= 0:
        return 0
    return round((epic.get("done", 0) / total) * 100)


async def collect_report_data() -> dict[str, Any]:
    """Collect manager + devteam dashboard data in parallel."""
    (
        summary,
        epics,
        distribution,
        velocity,
        risks,
        sprint_summary,
        burndown,
        workload,
    ) = await asyncio.gather(
        jira_service.get_project_summary(),
        jira_service.get_epic_progress(),
        jira_service.get_issue_distribution(),
        jira_service.get_velocity(),
        jira_service.get_risk_issues(),
        jira_service.get_sprint_summary(),
        jira_service.get_burndown(),
        jira_service.get_team_workload(),
    )

    epics_sorted = sorted(epics, key=lambda e: _epic_progress_pct(e), reverse=True)
    velocity_recent = velocity[-3:] if len(velocity) > 3 else velocity
    risks_top = risks[:5]
    workload_top = sorted(workload, key=lambda w: w.get("storyPoints", 0), reverse=True)[:5]

    burndown_points = burndown.get("points") or []
    burndown_latest = burndown_points[-1] if burndown_points else {}

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "dashboard_url": settings.report_dashboard_url,
        "board_id": settings.board_id,
        "manager": {
            "summary": summary,
            "epics_top": epics_sorted[:5],
            "distribution": distribution,
            "velocity_recent": velocity_recent,
            "risks": risks_top,
        },
        "devteam": {
            "sprint": sprint_summary,
            "burndown": {
                "sprint_name": burndown.get("sprintName", ""),
                "total_points": burndown.get("totalPoints", 0),
                "latest_ideal": burndown_latest.get("ideal"),
                "latest_actual": burndown_latest.get("actual"),
                "point_count": len(burndown_points),
            },
            "workload_top": workload_top,
        },
    }


def render_report_html(context: dict[str, Any]) -> str:
    """Render daily_report.html with collected context."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("daily_report.html")
    return template.render(**context)


async def build_daily_report_html() -> str:
    """Collect data and return rendered HTML."""
    context = await collect_report_data()
    return render_report_html(context)
