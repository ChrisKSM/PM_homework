"""
MR 품질 이슈 서비스 — Polarion testDefect 데이터 집계.
H7/M7/W7 모델별 defect 현황, 제품/앱 분류, 기능별 분류 제공.
"""
from __future__ import annotations

from typing import Any

from cache import cached
from polarion_client import fetch_all_defects

FIXED_STATUSES = {"fixed", "closed", "resolved", "verified", "done", "완료"}
CRITICAL_SEVERITIES = {"critical", "major", "blocker"}

SOURCE_APP_KEYWORDS = {"app", "thinq", "앱", "application"}


def _is_fixed(status: str) -> bool:
    return status.strip().lower() in FIXED_STATUSES


def _is_critical_major(severity: str) -> bool:
    return severity.strip().lower() in CRITICAL_SEVERITIES


def _guess_source(item: dict[str, Any]) -> str:
    """제품/앱 구분 — category, tcPackage, title 기반 추정."""
    for field in ("category", "tcPackage", "testClass", "title"):
        val = (item.get(field) or "").lower()
        if any(kw in val for kw in SOURCE_APP_KEYWORDS):
            return "앱"
    return "제품"


def _count_by(items: list[dict], field: str) -> list[dict[str, Any]]:
    counter: dict[str, int] = {}
    for item in items:
        key = item.get(field) or "기타"
        if not key.strip():
            key = "기타"
        counter[key] = counter.get(key, 0) + 1
    return sorted(
        [{"name": k, "value": v} for k, v in counter.items()],
        key=lambda x: -x["value"],
    )


@cached(ttl=300)
async def get_mr_quality_dashboard(model_name: str = "") -> dict[str, Any]:
    """MR 품질 이슈 대시보드 데이터."""
    raw = await fetch_all_defects(model_name=model_name)

    for item in raw:
        item["source"] = _guess_source(item)
        item["isFixed"] = _is_fixed(item.get("status", ""))

    total = len(raw)
    fixed = sum(1 for i in raw if i["isFixed"])
    open_count = total - fixed
    critical_major_open = sum(
        1 for i in raw
        if not i["isFixed"] and _is_critical_major(i.get("severity", ""))
    )
    in_progress = sum(
        1 for i in raw
        if not i["isFixed"] and (i.get("status", "").lower() in ("in progress", "진행중", "open"))
    )

    source_data = _count_by(raw, "source")
    model_data = _count_by(raw, "model")
    category_data = _count_by(raw, "category")

    open_issues = sorted(
        [i for i in raw if not i["isFixed"]],
        key=lambda x: (
            0 if _is_critical_major(x.get("severity", "")) else 1,
            -(len(x.get("title", ""))),
        ),
    )

    open_rows = [
        {
            "key": i.get("id", ""),
            "title": i.get("title", ""),
            "model": i.get("model", ""),
            "category": i.get("category", ""),
            "source": i.get("source", ""),
            "assignee": i.get("assignee", ""),
            "status": i.get("status", ""),
            "severity": i.get("severity", ""),
            "swVersion": i.get("swVersion", ""),
        }
        for i in open_issues
    ]

    return {
        "kpi": {
            "total": total,
            "fixed": fixed,
            "open": open_count,
            "criticalMajor": critical_major_open,
            "inProgress": in_progress,
            "fixRate": round(fixed / total * 100) if total else 0,
        },
        "charts": {
            "bySource": source_data,
            "byModel": model_data,
            "byCategory": category_data,
        },
        "openIssues": open_rows,
        "modelFilter": model_name or "all",
    }
