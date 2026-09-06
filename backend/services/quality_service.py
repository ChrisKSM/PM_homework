"""
품질 이슈 현황 — Jira Bug + 이벤트 Label 기준 집계.
"""
from __future__ import annotations

import statistics
from datetime import datetime, timezone
from typing import Any

from cache import cached
from config import settings
from jira_client import jira_client

RESPONSE_PLAN_FIELD = settings.response_plan_field
RESPONSE_ACTION_FIELD = settings.response_action_field

EVENT_PHASES: dict[str, list[dict[str, str]]] = {
    "DEV": [
        {"phase": "1", "label": "DEV 1차", "jiraLabel": "DEV1_BUG"},
        {"phase": "2", "label": "DEV 2차", "jiraLabel": "DEV2_BUG"},
        {"phase": "3", "label": "DEV 3차", "jiraLabel": "DEV3_BUG"},
    ],
    "FC": [
        {"phase": "1", "label": "FC 1차", "jiraLabel": "FC1_BUG"},
        {"phase": "2", "label": "FC 2차", "jiraLabel": "FC2_BUG"},
        {"phase": "3", "label": "FC 3차", "jiraLabel": "FC3_BUG"},
        {"phase": "4", "label": "FC 4차", "jiraLabel": "FC4_BUG"},
    ],
    "PV": [
        {"phase": "1", "label": "PV 1차", "jiraLabel": "PV1"},
        {"phase": "2", "label": "PV 2차", "jiraLabel": "PV2"},
        {"phase": "3", "label": "PV 3차", "jiraLabel": "PV3"},
        {"phase": "4", "label": "PV 4차", "jiraLabel": "PV4"},
    ],
    "AUTO": [
        {"phase": "1", "label": "자동화 1차", "jiraLabel": "Auto1"},
        {"phase": "2", "label": "자동화 2차", "jiraLabel": "Auto2"},
    ],
}

AGING_BUCKET_LABELS = ["0–1일", "2–3일", "4–7일", "8–14일", "15일+"]
PRIORITY_ORDER = ["P0", "P1", "P2", "P3"]
HIGH_PRIORITY_OPEN = ("P0", "P1", "P2")

# board 12641 Bug — Jira label 기준 기능 분류 (대소문자 무시)
FEATURE_CATEGORY_LABELS = [
    "VFD",
    "BT",
    "Wireless",
    "Audio",
    "APP",
    "ARC",
    "Demo",
    "EQ",
    "System",
    "APD",
    "Key",
    "USB",
    "eARC",
    "Hidden Key",
]
FEATURE_CATEGORY_OTHER = "기타"

# Agile board API 불가 pod — board_id → project scope fallback (LGE audio)
BOARD_PROJECT_BY_ID: dict[int, str] = {
    12641: "MLCSIXZERO",
}


def _resolve_phase(event: str, phase: str) -> dict[str, str] | None:
    phases = EVENT_PHASES.get(event.upper())
    if not phases:
        return None
    for item in phases:
        if item["phase"] == str(phase):
            return item
    return phases[0] if phases else None


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


def _days_between(start: datetime, end: datetime) -> float:
    return max(0.0, (end - start).total_seconds() / 86400.0)


def _aging_bucket(days: float) -> str:
    d = int(days)
    if d <= 1:
        return "0–1일"
    if d <= 3:
        return "2–3일"
    if d <= 7:
        return "4–7일"
    if d <= 14:
        return "8–14일"
    return "15일+"


def _normalize_priority(name: str | None) -> str:
    if not name:
        return "P3"
    upper = name.strip().upper()
    if upper in PRIORITY_ORDER:
        return upper
    mapping = {
        "BLOCKER": "P0",
        "HIGHEST": "P0",
        "CRITICAL": "P0",
        "HIGH": "P1",
        "MEDIUM": "P2",
        "LOW": "P3",
        "LOWEST": "P3",
    }
    return mapping.get(upper, "P3")


def _issue_labels(fields: dict) -> list[str]:
    return [str(l) for l in (fields.get("labels") or [])]


def _normalize_label_token(label: str) -> str:
    return label.strip().lower().replace("_", " ")


def _feature_category(labels: list[str]) -> str:
    """이슈 labels 중 FEATURE_CATEGORY_LABELS 와 일치하는 첫 항목."""
    normalized = {_normalize_label_token(l): l for l in labels}
    for cat in FEATURE_CATEGORY_LABELS:
        key = _normalize_label_token(cat)
        if key in normalized:
            return cat
    return FEATURE_CATEGORY_OTHER


def _field_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return (value.get("value") or value.get("name") or "").strip()
    return str(value).strip()


def _assignee_name(fields: dict) -> str:
    assignee = fields.get("assignee")
    if not assignee:
        return "Unassigned"
    return assignee.get("displayName") or assignee.get("name") or "Unassigned"


def _is_done(fields: dict) -> bool:
    cat = (
        fields.get("status", {})
        .get("statusCategory", {})
        .get("key", "")
    )
    return cat == settings.done_status_category


def _increment_bucket(buckets: dict[str, int], days: float) -> None:
    label = _aging_bucket(days)
    buckets[label] = buckets.get(label, 0) + 1


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


@cached(ttl=600)
async def _project_key_from_board_api(board_id: int) -> str:
    """Agile board/project API에서 projectKey 추출."""
    for path in (
        f"/rest/agile/1.0/board/{board_id}",
        f"/rest/agile/1.0/board/{board_id}/project",
    ):
        try:
            data = await jira_client.get(path)
        except Exception:
            continue
        location = data.get("location") or {}
        if location.get("projectKey"):
            return str(location["projectKey"])
        if data.get("projectKey"):
            return str(data["projectKey"])
        project = data.get("project") or {}
        if isinstance(project, dict) and project.get("key"):
            return str(project["key"])
        for item in data.get("values") or []:
            if isinstance(item, dict) and item.get("key"):
                return str(item["key"])
    return ""


@cached(ttl=600)
async def _board_jql_clause() -> str:
    """settings.board_id 보드 filter JQL — 타 프로젝트 동일 label 혼입 방지."""
    board_id = settings.board_id
    try:
        if hasattr(jira_client, "get_board_filter_jql"):
            try:
                jql = await jira_client.get_board_filter_jql(board_id=board_id)
            except TypeError:
                jql = await jira_client.get_board_filter_jql()
            if jql:
                return jql
    except Exception:
        pass

    try:
        board_info = await jira_client.get(f"/rest/agile/1.0/board/{board_id}")
        filter_id = (board_info.get("filter") or {}).get("id")
        if filter_id:
            try:
                filt = await jira_client.get(f"/rest/api/2/filter/{filter_id}")
                jql = (filt.get("jql") or "").strip()
                if jql:
                    return jql
            except Exception:
                pass
            return f"filter = {filter_id}"
    except Exception:
        pass

    project_key = await _project_key_from_board_api(board_id)
    if project_key:
        return f"project = {project_key}"

    project_key = (getattr(settings, "quality_project_key", "") or "").strip()
    if project_key:
        return f"project = {project_key}"

    known_project = BOARD_PROJECT_BY_ID.get(board_id)
    if known_project:
        return f"project = {known_project}"

    raise RuntimeError(
        f"board_id={board_id} 보드 filter JQL을 가져올 수 없습니다. "
        "pod .env에 QUALITY_PROJECT_KEY=MLCSIXZERO 추가 또는 Agile board/filter 권한 확인."
    )


async def _build_quality_jql(jira_label: str) -> str:
    """보드 filter(12641) + Bug + event label — label 단독 검색 금지."""
    board_jql = await _board_jql_clause()
    bug_clause = f'issuetype = "Bug" AND labels = "{jira_label}"'
    return f"({board_jql}) AND {bug_clause}"


async def _search_quality_issues(jql: str, search_fields: list[str]) -> list[dict]:
    base_fields = [
        "summary",
        "status",
        "priority",
        "labels",
        "assignee",
        "created",
        "resolutiondate",
    ]
    try:
        return await _search_all_issues(jql, search_fields)
    except Exception as e:
        extra = [f for f in search_fields if f not in base_fields]
        if extra:
            try:
                return await _search_all_issues(jql, base_fields)
            except Exception as e2:
                raise RuntimeError(f"{e2} | jql={jql}") from e2
        raise RuntimeError(f"{e} | jql={jql}") from e


def _issue_browse_url(issue_key: str) -> str:
    base = settings.jira_base_url.rstrip("/")
    return f"{base}/browse/{issue_key}"


def get_quality_filters() -> dict[str, Any]:
    return {
        "eventGroups": [
            {"value": "DEV", "label": "DEV"},
            {"value": "FC", "label": "FC"},
            {"value": "PV", "label": "PV"},
            {"value": "AUTO", "label": "자동화"},
        ],
        "phases": EVENT_PHASES,
        "featureCategories": [
            {"value": "all", "label": "전체"},
            *[{"value": cat, "label": cat} for cat in FEATURE_CATEGORY_LABELS],
            {"value": FEATURE_CATEGORY_OTHER, "label": FEATURE_CATEGORY_OTHER},
        ],
    }


@cached(ttl=300)
async def get_quality_dashboard(
    event: str = "DEV",
    phase: str = "1",
    category: str | None = None,
) -> dict[str, Any]:
    phase_info = _resolve_phase(event, phase)
    if not phase_info:
        raise ValueError(f"Unknown event/phase: {event}/{phase}")

    jira_label = phase_info["jiraLabel"]
    board_jql = await _board_jql_clause()
    jql = await _build_quality_jql(jira_label)

    search_fields = [
        "summary",
        "status",
        "priority",
        "labels",
        "assignee",
        "created",
        "resolutiondate",
    ]
    if RESPONSE_PLAN_FIELD:
        search_fields.append(RESPONSE_PLAN_FIELD)
    if RESPONSE_ACTION_FIELD:
        search_fields.append(RESPONSE_ACTION_FIELD)

    raw_issues = await _search_quality_issues(jql, search_fields)
    now = datetime.now(timezone.utc)

    parsed: list[dict[str, Any]] = []
    for issue in raw_issues:
        fields = issue.get("fields", {})
        labels = _issue_labels(fields)
        cat = _feature_category(labels)
        if category and category.lower() != "all":
            if cat.lower() != category.lower():
                continue

        created_dt = _parse_jira_date(fields.get("created"))
        resolved_dt = _parse_jira_date(fields.get("resolutiondate"))
        done = _is_done(fields)
        pri = _normalize_priority(fields.get("priority", {}).get("name"))

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

        response_plan = _field_text(fields.get(RESPONSE_PLAN_FIELD)) if RESPONSE_PLAN_FIELD else ""
        response_action = _field_text(fields.get(RESPONSE_ACTION_FIELD)) if RESPONSE_ACTION_FIELD else ""

        key = issue.get("key", "")
        parsed.append(
            {
                "issueKey": key,
                "issueUrl": _issue_browse_url(key) if key else "",
                "priority": pri,
                "category": cat,
                "summary": fields.get("summary") or "",
                "status": fields.get("status", {}).get("name") or "",
                "assignee": _assignee_name(fields),
                "ageDays": round(age_days, 1),
                "isDone": done,
                "responsePlan": response_plan or None,
                "responseAction": response_action or None,
            }
        )

    discovered = len(parsed)
    resolved_items = [p for p in parsed if p["isDone"]]
    open_items = [p for p in parsed if not p["isDone"]]
    resolved = len(resolved_items)
    open_count = len(open_items)
    p0p1p2_open = [p for p in open_items if p["priority"] in HIGH_PRIORITY_OPEN]

    by_priority_map: dict[str, dict[str, int]] = {
        p: {"discovered": 0, "resolved": 0, "open": 0} for p in PRIORITY_ORDER
    }
    for p in parsed:
        slot = by_priority_map[p["priority"]]
        slot["discovered"] += 1
        if p["isDone"]:
            slot["resolved"] += 1
        else:
            slot["open"] += 1

    by_category_map: dict[str, int] = {cat: 0 for cat in FEATURE_CATEGORY_LABELS}
    by_category_map[FEATURE_CATEGORY_OTHER] = 0
    for p in parsed:
        by_category_map[p["category"]] = by_category_map.get(p["category"], 0) + 1

    resolve_aging: dict[str, int] = {label: 0 for label in AGING_BUCKET_LABELS}
    open_aging: dict[str, int] = {label: 0 for label in AGING_BUCKET_LABELS}
    resolve_days_list: list[float] = []
    open_days_list: list[float] = []
    p0p1p2_resolve_days: list[float] = []

    for p in resolved_items:
        _increment_bucket(resolve_aging, p["ageDays"])
        resolve_days_list.append(p["ageDays"])
        if p["priority"] in HIGH_PRIORITY_OPEN:
            p0p1p2_resolve_days.append(p["ageDays"])

    for p in open_items:
        _increment_bucket(open_aging, p["ageDays"])
        open_days_list.append(p["ageDays"])

    avg_resolve = round(statistics.mean(resolve_days_list), 1) if resolve_days_list else 0.0
    median_resolve = round(statistics.median(resolve_days_list), 1) if resolve_days_list else 0.0
    avg_open = round(statistics.mean(open_days_list), 1) if open_days_list else 0.0
    p0p1p2_avg = round(statistics.mean(p0p1p2_resolve_days), 1) if p0p1p2_resolve_days else 0.0

    avg_by_pri: list[dict[str, Any]] = []
    for pri in PRIORITY_ORDER:
        days = [p["ageDays"] for p in resolved_items if p["priority"] == pri]
        avg_by_pri.append(
            {"priority": pri, "days": round(statistics.mean(days), 1) if days else 0.0}
        )

    def _sort_open(rows: list[dict]) -> list[dict]:
        order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
        return sorted(rows, key=lambda r: (order.get(r["priority"], 9), -r["ageDays"]))

    p0p1p2_rows = [
        {
            "issueKey": p["issueKey"],
            "issueUrl": p["issueUrl"],
            "priority": p["priority"],
            "category": p["category"],
            "summary": p["summary"],
            "status": p["status"],
            "assignee": p["assignee"],
            "ageDays": p["ageDays"],
            "responsePlan": p["responsePlan"],
            "responseAction": p["responseAction"],
            "missingPlan": not p["responsePlan"],
        }
        for p in _sort_open(p0p1p2_open)
    ]

    open_rows = [
        {
            "issueKey": p["issueKey"],
            "issueUrl": p["issueUrl"],
            "priority": p["priority"],
            "category": p["category"],
            "summary": p["summary"],
            "status": p["status"],
            "assignee": p["assignee"],
            "ageDays": p["ageDays"],
            "responsePlan": p["responsePlan"],
            "responseAction": p["responseAction"],
            "missingPlan": False,
        }
        for p in _sort_open(open_items)
    ]

    resolve_rate = round(resolved / discovered * 100) if discovered else 0

    return {  # noqa: C901
        "meta": {
            "event": event.upper(),
            "phase": str(phase),
            "phaseLabel": phase_info["label"],
            "jiraLabel": jira_label,
            "jql": jql,
            "boardId": settings.board_id,
            "boardScope": board_jql,
            "categoryFilter": category or "all",
            "responsePlanField": RESPONSE_PLAN_FIELD or None,
            "responseActionField": RESPONSE_ACTION_FIELD or None,
        },
        "kpi": {
            "discovered": discovered,
            "resolved": resolved,
            "open": open_count,
            "p0p1p2Open": len(p0p1p2_open),
            "p1p2Open": len(p0p1p2_open),
            "resolveRatePct": resolve_rate,
        },
        "agingKpi": {
            "avgResolveDays": avg_resolve,
            "medianResolveDays": median_resolve,
            "avgOpenAgeDays": avg_open,
            "p0p1p2AvgResolveDays": p0p1p2_avg,
            "p1p2AvgResolveDays": p0p1p2_avg,
        },
        "byPriority": [
            {"priority": pri, **by_priority_map[pri]} for pri in PRIORITY_ORDER
        ],
        "byCategory": [
            {"category": cat, "count": by_category_map.get(cat, 0)}
            for cat in [*FEATURE_CATEGORY_LABELS, FEATURE_CATEGORY_OTHER]
            if by_category_map.get(cat, 0) > 0
        ],
        "resolveAgingBuckets": [
            {"label": label, "count": resolve_aging.get(label, 0)} for label in AGING_BUCKET_LABELS
        ],
        "openAgingBuckets": [
            {"label": label, "count": open_aging.get(label, 0)} for label in AGING_BUCKET_LABELS
        ],
        "avgResolveByPriority": avg_by_pri,
        "p0p1p2OpenIssues": p0p1p2_rows,
        "p1p2OpenIssues": p0p1p2_rows,
        "openIssues": open_rows,
    }


# ── LLM 품질 분석 ────────────────────────────────────────────────────────────

_QUALITY_SYSTEM_PROMPT = (
    "너는 소프트웨어 품질 분석 전문가야. "
    "주어진 품질 이슈 데이터를 분석해서, 이슈가 어디에 치우쳐 있는지, "
    "어떤 패턴이 보이는지, 어떻게 개선하면 좋을지를 한국어 실무 말투(~해요/~네요체)로 분석해. "
    "과장/추측 금지, 숫자 근거 중심. "
    "반드시 아래 JSON 형식만 출력해(코드펜스·설명 금지):\n"
    '{"executive_summary": "전체 현황 2-3문장 요약", '
    '"concentration_analysis": "이슈가 어디에 편중되어 있는지 분석 2-3문장", '
    '"risk_patterns": [{"pattern": "패턴명", "detail": "설명", "severity": "High|Medium|Low"}], '
    '"improvements": [{"action": "개선 조치", "expected_impact": "예상 효과", "priority": 1}], '
    '"prediction": "향후 예측 1-2문장"}'
)


def _build_quality_user_prompt(dashboard: dict[str, Any]) -> str:
    kpi = dashboard["kpi"]
    meta = dashboard["meta"]
    aging = dashboard.get("agingKpi", {})
    by_pri = dashboard.get("byPriority", [])
    by_cat = dashboard.get("byCategory", [])
    open_issues = dashboard.get("openIssues", [])

    pri_text = "\n".join(
        f"  {p['priority']}: 발견 {p['discovered']}건, 처리 {p['resolved']}건, 미결 {p['open']}건"
        for p in by_pri if p["discovered"] > 0
    )
    cat_text = "\n".join(
        f"  {c['category']}: {c['count']}건"
        for c in by_cat if c["count"] > 0
    )
    open_text = "\n".join(
        f"  - [{i['priority']}] {i['issueKey']}: {i['summary']} (담당: {i['assignee']}, {i['ageDays']}일)"
        for i in open_issues[:15]
    )

    return (
        f"이벤트: {meta['event']} {meta['phaseLabel']}\n"
        f"발견 전체: {kpi['discovered']}건 | 처리 완료: {kpi['resolved']}건 | 미결: {kpi['open']}건\n"
        f"처리율: {kpi['resolveRatePct']}%\n"
        f"P0/P1/P2 미결: {kpi['p0p1p2Open']}건\n"
        f"평균 처리 소요일: {aging.get('avgResolveDays', 0)}일\n"
        f"미결 평균 체류일: {aging.get('avgOpenAgeDays', 0)}일\n"
        f"P0/P1/P2 평균 처리 소요일: {aging.get('p0p1p2AvgResolveDays', 0)}일\n\n"
        f"Priority별 현황:\n{pri_text or '  (없음)'}\n\n"
        f"분류(카테고리)별 건수:\n{cat_text or '  (없음)'}\n\n"
        f"미결 이슈 (최대 15건):\n{open_text or '  (없음)'}\n"
    )


def _quality_rule_based(dashboard: dict[str, Any]) -> dict[str, Any]:
    """LLM 불가 시 규칙기반 품질 분석."""
    kpi = dashboard["kpi"]
    aging = dashboard.get("agingKpi", {})
    by_pri = dashboard.get("byPriority", [])
    by_cat = dashboard.get("byCategory", [])
    meta = dashboard["meta"]

    rate = kpi["resolveRatePct"]
    total = kpi["discovered"]
    open_count = kpi["open"]
    p0p1p2 = kpi["p0p1p2Open"]

    # 편중 분석
    cat_sorted = sorted(by_cat, key=lambda c: c["count"], reverse=True)
    top_cat = cat_sorted[0] if cat_sorted else None
    concentration = ""
    if top_cat and total > 0:
        pct = round(top_cat["count"] / total * 100)
        if pct >= 40:
            concentration = f"{top_cat['category']} 영역에 전체의 {pct}%가 집중되어 있어요. 해당 모듈 집중 검토가 필요해요."
        elif pct >= 25:
            concentration = f"{top_cat['category']} 영역이 {pct}%로 가장 많지만 심각한 편중은 아니에요."
        else:
            concentration = "이슈가 카테고리별로 비교적 균등하게 분포되어 있어요."
    else:
        concentration = "이슈 데이터가 부족하여 편중 분석이 어려워요."

    summary = (
        f"{meta['event']} {meta['phaseLabel']} 기준 발견 {total}건 중 {kpi['resolved']}건 처리 (처리율 {rate}%). "
        f"미결 {open_count}건, P0/P1/P2 미결 {p0p1p2}건이에요."
    )

    patterns: list[dict[str, str]] = []
    if p0p1p2 > 0:
        patterns.append({
            "pattern": "고우선순위 미결 잔여",
            "detail": f"P0/P1/P2 미결 {p0p1p2}건이 남아 있어요",
            "severity": "High" if p0p1p2 >= 3 else "Medium",
        })
    avg_open = aging.get("avgOpenAgeDays", 0)
    if avg_open > 7:
        patterns.append({
            "pattern": "미결 이슈 장기 체류",
            "detail": f"미결 이슈 평균 체류 {avg_open}일로 1주일 초과",
            "severity": "High" if avg_open > 14 else "Medium",
        })
    if rate < 80 and total >= 5:
        patterns.append({
            "pattern": "처리율 저조",
            "detail": f"처리율 {rate}%로 80% 미달",
            "severity": "High" if rate < 50 else "Medium",
        })

    improvements: list[dict[str, Any]] = []
    if p0p1p2 > 0:
        improvements.append({
            "action": "P0/P1/P2 미결 이슈 우선 해결 — 담당자 지정 및 기한 설정",
            "expected_impact": "고위험 이슈 해소로 품질 리스크 감소",
            "priority": 1,
        })
    if avg_open > 7:
        improvements.append({
            "action": "장기 미결 이슈 스크럼 리뷰에 포함하여 집중 처리",
            "expected_impact": "미결 체류 시간 단축",
            "priority": 2,
        })
    if not improvements:
        improvements.append({
            "action": "현재 품질 관리 프로세스 유지",
            "expected_impact": "안정적 처리율 지속",
            "priority": 1,
        })

    prediction = f"현재 처리 속도 유지 시 미결 {open_count}건은 약 {max(1, round(avg_open))}일 내 해소 가능해요."

    return {
        "executive_summary": summary,
        "concentration_analysis": concentration,
        "risk_patterns": patterns,
        "improvements": improvements,
        "prediction": prediction,
    }


def _parse_quality_llm_json(text: str) -> dict[str, Any] | None:
    """LLM 응답 JSON 파싱."""
    import re as _re
    if not text:
        return None
    cleaned = _re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=_re.MULTILINE).strip()
    m = _re.search(r"\{.*\}", cleaned, _re.DOTALL)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(data.get("executive_summary"), str):
        return None
    return data


async def get_quality_ai_analysis(
    event: str = "DEV",
    phase: str = "1",
    category: str | None = None,
) -> dict[str, Any]:
    """품질 이슈 AI 분석 — LLM 사용, 실패 시 규칙기반 폴백."""
    import json
    dashboard = await get_quality_dashboard(event=event, phase=phase, category=category)

    source = "rule"
    content = _quality_rule_based(dashboard)
    llm_debug: dict[str, Any] | None = None

    from services import llm_client
    diag = llm_client.diagnostics()
    if not diag["enabled"]:
        failed = [c for c in diag["checks"] if not c["ok"]]
        llm_debug = {
            "phase": "not_enabled",
            "reason": "; ".join(f"{c['id']}: {c['detail']}" for c in failed),
        }
    else:
        try:
            raw = await llm_client.chat(
                _QUALITY_SYSTEM_PROMPT,
                _build_quality_user_prompt(dashboard),
            )
            parsed = _parse_quality_llm_json(raw)
            if parsed:
                content = parsed
                source = "llm"
            else:
                llm_debug = {
                    "phase": "parse_failed",
                    "reason": "LLM 응답 JSON 파싱 실패",
                    "rawPreview": (raw or "")[:500],
                }
        except Exception as exc:
            llm_debug = {
                "phase": "call_failed",
                "reason": f"{type(exc).__name__}: {exc}",
            }

    result: dict[str, Any] = {
        "source": source,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "event": event.upper(),
        "phaseLabel": dashboard["meta"]["phaseLabel"],
        **content,
        "kpi_snapshot": dashboard["kpi"],
    }
    if llm_debug:
        result["llmDebug"] = llm_debug
    return result
