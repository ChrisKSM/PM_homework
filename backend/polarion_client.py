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
# Polarion gateway가 동시 요청이 많으면 503을 반환함
CONCURRENT_DETAIL = 5
RETRY_STATUSES = {429, 502, 503, 504}
RETRY_DELAYS = (1.0, 3.0, 6.0)


async def _get_with_retry(url: str, params: dict[str, Any] | None = None) -> httpx.Response:
    """429/502/503/504 · 네트워크 오류 시 backoff 재시도."""
    last_exc: Exception | None = None
    async with httpx.AsyncClient(
        headers=_headers(),
        verify=settings.polarion_verify_ssl,
        timeout=TIMEOUT,
    ) as client:
        for attempt in range(len(RETRY_DELAYS) + 1):
            try:
                resp = await client.get(url, params=params)
                if resp.status_code in RETRY_STATUSES and attempt < len(RETRY_DELAYS):
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
                resp.raise_for_status()
                return resp
            except httpx.TransportError as exc:
                last_exc = exc
                if attempt < len(RETRY_DELAYS):
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
                raise
    raise last_exc or RuntimeError("Polarion request failed")


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
    resp = await _get_with_retry(_list_endpoint(), params=params)
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
    resp = await _get_with_retry(self_url)
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


def _quote_polarion_value(value: str) -> str:
    """Polarion Lucene 값 인용 — 공백/[]() 는 따옴표로 보호."""
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def normalize_project_names(project_name: str | list[str] | None) -> list[str]:
    """단일/복수 project_name 입력을 중복 없는 리스트로 정규화."""
    if project_name is None:
        return []
    items = [project_name] if isinstance(project_name, str) else list(project_name)
    seen: set[str] = set()
    names: list[str] = []
    for item in items:
        name = (item or "").strip()
        if name and name not in seen:
            seen.add(name)
            names.append(name)
    return names


def to_polarion_date(value: str) -> str:
    """YYYY-MM-DD / YYYYMMDD → Polarion YYYYMMDD."""
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    return digits[:8] if len(digits) >= 8 else ""


def build_query(
    project_name: str | list[str] = "",
    event_sequence: str = "",
    model_name: str = "",
    created_from: str = "",
    created_to: str = "",
) -> str:
    """
    Polarion testDefect 검색 query 조합.
    - project_name: OR
    - eventSequence / created: AND
    """
    parts = ["type:testDefect"]

    names = normalize_project_names(project_name)
    if names:
        joined = " OR ".join(_quote_polarion_value(name) for name in names)
        parts.append(f"project_name:({joined})")

    if event_sequence:
        seq = event_sequence.strip()
        if seq.upper() == "ALL":
            parts.append("eventSequence.1:[00000000001 TO 00000000005]")
        else:
            parts.append(f"eventSequence.KEY:{seq}")

    from_d = to_polarion_date(created_from)
    to_d = to_polarion_date(created_to)
    if from_d and to_d:
        parts.append(f"created:[{from_d} TO {to_d}]")
    elif from_d:
        parts.append(f"created:[{from_d} TO *]")
    elif to_d:
        parts.append(f"created:[* TO {to_d}]")

    if model_name:
        parts.append(f"model_name:{_quote_polarion_value(model_name)}")

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
    project_name: str | list[str] = "",
    event_sequence: str = "",
    model_name: str = "",
    created_from: str = "",
    created_to: str = "",
) -> list[dict[str, Any]]:
    """
    testDefect 목록 조회 → 상세 동시 조회 → 정규화.
    """
    query = build_query(
        project_name=project_name,
        event_sequence=event_sequence,
        model_name=model_name,
        created_from=created_from,
        created_to=created_to,
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
