"""
Polarion ALM REST API 비동기 HTTP 클라이언트.
PAT Bearer 토큰 인증, testDefect workitem 조회 전용.
"""
from __future__ import annotations

import warnings
from typing import Any

import httpx

from config import settings

if not settings.polarion_verify_ssl:
    warnings.filterwarnings("ignore", message="Unverified HTTPS request")

import asyncio

TIMEOUT = 120.0
MAX_PAGES = 50
CONCURRENT_DETAIL = 20


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.polarion_pat}",
        "Accept": "application/json",
    }


def _base_url() -> str:
    return settings.polarion_base_url.rstrip("/")


def _list_endpoint() -> str:
    return f"{_base_url()}/projects/{settings.polarion_project_key}/workitems"


def _safe_text(attrs: dict, key: str) -> str:
    """속성값을 안전하게 문자열로 추출. dict이면 name/id 시도."""
    val = attrs.get(key)
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, dict):
        return (val.get("name") or val.get("value") or val.get("id") or "").strip()
    return str(val).strip()


async def fetch_list_page(
    page: int = 1,
    query: str = "type:testDefect",
    page_size: int = 100,
) -> tuple[list[dict[str, Any]], int]:
    """Polarion workitem 목록 페이지 조회. (workitems, totalCount) 반환."""
    params: dict[str, Any] = {
        "query": query,
        "page": page,
        "pageSize": page_size,
    }
    async with httpx.AsyncClient(
        headers=_headers(),
        verify=settings.polarion_verify_ssl,
        timeout=TIMEOUT,
    ) as client:
        resp = await client.get(_list_endpoint(), params=params)
        resp.raise_for_status()
        data = resp.json()

    # 응답 구조: {"data": [{"page":1, "totalCount":N, "workitems":[...]}]}
    #         또는 [{"page":1, ...}]
    #         또는 {"workitems":[...]}
    if isinstance(data, dict) and "data" in data:
        inner = data["data"]
        obj = inner[0] if isinstance(inner, list) and inner else inner
    elif isinstance(data, list) and data and isinstance(data[0], dict):
        obj = data[0]
    elif isinstance(data, dict):
        obj = data
    else:
        return [], 0

    if not isinstance(obj, dict):
        return [], 0

    workitems = obj.get("workitems", [])
    total_count = obj.get("totalCount", len(workitems))
    return workitems, total_count


async def fetch_detail(self_url: str) -> dict[str, Any]:
    """workitem 상세 조회 (self link 사용)."""
    async with httpx.AsyncClient(
        headers=_headers(),
        verify=settings.polarion_verify_ssl,
        timeout=TIMEOUT,
    ) as client:
        resp = await client.get(self_url)
        resp.raise_for_status()
        data = resp.json()
    attrs = data.get("attributes", data) if isinstance(data, dict) else data
    return attrs


def normalize_workitem(attrs: dict[str, Any], location: str = "") -> dict[str, Any]:
    """Polarion workitem 속성을 대시보드용 flat dict로 정규화."""
    title = _safe_text(attrs, "title") or _safe_text(attrs, "name") or _safe_text(attrs, "id")

    tc_package = attrs.get("TCPackage")
    test_class = attrs.get("TestClass")
    test_item = attrs.get("TestItem")
    issue_type_raw = attrs.get("IssueType")
    defect_cat_raw = attrs.get("defectCategory")

    return {
        "id": _safe_text(attrs, "id"),
        "title": title,
        "status": _safe_text(attrs, "status"),
        "assignee": _safe_text(attrs, "assignee"),
        "model": _safe_text(attrs, "model_name"),
        "devEvent": _safe_text(attrs, "ModelDevEvent"),
        "eventSequence": _safe_text(attrs, "eventSequence"),
        "severity": _safe_text(attrs, "testDefectSeverity"),
        "category": defect_cat_raw.get("name", "") if isinstance(defect_cat_raw, dict) else str(defect_cat_raw or ""),
        "issueType": issue_type_raw.get("name", "") if isinstance(issue_type_raw, dict) else (str(issue_type_raw or "") or "신규"),
        "swVersion": _safe_text(attrs, "swVersion"),
        "reproducibility": _safe_text(attrs, "reproducibility"),
        "consensus": _safe_text(attrs, "DefectConsensus"),
        "description": _safe_text(attrs, "description"),
        "bugDescription": _safe_text(attrs, "bugDescription"),
        "tcPackage": tc_package.get("name", "") if isinstance(tc_package, dict) else str(tc_package or ""),
        "testClass": test_class.get("name", "") if isinstance(test_class, dict) else str(test_class or ""),
        "testItem": test_item.get("name", "") if isinstance(test_item, dict) else str(test_item or ""),
        "occurCount": _safe_text(attrs, "occurCount"),
        "executionCount": _safe_text(attrs, "executionCount"),
        "frequency": _safe_text(attrs, "frequency"),
        "location": location,
    }


def _escape_polarion_value(value: str) -> str:
    """Polarion query 특수문자 이스케이프 — [] () 등."""
    return (
        value
        .replace("[", "\\[")
        .replace("]", "\\]")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def build_query(
    project_name: str = "",
    event_sequence: str = "",
    model_name: str = "",
) -> str:
    """Polarion testDefect 검색 query 조합."""
    parts = ["type:testDefect"]

    if project_name:
        escaped = _escape_polarion_value(project_name)
        parts.append(f"project_name:({escaped})")

    if event_sequence:
        seq = event_sequence.strip()
        if seq.upper() == "ALL":
            parts.append("eventSequence.1:[00000000001 TO 00000000005]")
        else:
            parts.append(f"eventSequence.KEY:{seq}")

    if model_name:
        parts.append(f'model_name:"{model_name}"')

    return " AND ".join(parts)


async def _fetch_detail_batch(self_urls: list[str]) -> list[dict[str, Any]]:
    """여러 workitem 상세를 동시 조회 (concurrent)."""
    sem = asyncio.Semaphore(CONCURRENT_DETAIL)

    async def _get(url: str) -> dict[str, Any] | None:
        async with sem:
            try:
                return await fetch_detail(url)
            except Exception:
                return None

    tasks = [_get(url) for url in self_urls]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


async def fetch_all_defects(
    project_name: str = "",
    event_sequence: str = "",
    model_name: str = "",
) -> list[dict[str, Any]]:
    """
    testDefect 목록 조회 → 상세 동시 조회 → 정규화.
    """
    query = build_query(
        project_name=project_name,
        event_sequence=event_sequence,
        model_name=model_name,
    )

    all_rows: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        rows, total = await fetch_list_page(page=page, query=query)
        if not rows:
            break
        all_rows.extend(rows)
        if len(all_rows) >= total:
            break

    # self link 수집
    detail_urls: list[str] = []
    locations: list[str] = []
    for row in all_rows:
        self_url = (row.get("links") or {}).get("self", "")
        location = row.get("location", "")
        if self_url:
            detail_urls.append(self_url)
            locations.append(location)

    if not detail_urls:
        return []

    # 동시 상세 조회
    details = await _fetch_detail_batch(detail_urls)

    results: list[dict[str, Any]] = []
    for i, attrs in enumerate(details):
        loc = locations[i] if i < len(locations) else ""
        item = normalize_workitem(attrs, loc)
        if item.get("id") or item.get("title"):
            results.append(item)

    return results
