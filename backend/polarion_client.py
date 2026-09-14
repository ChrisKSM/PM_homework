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

TIMEOUT = 60.0
MAX_PAGES = 50
SLEEP_BETWEEN = 0.05


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
) -> list[dict[str, Any]]:
    """Polarion workitem 목록 페이지 조회."""
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
    return data if isinstance(data, list) else data.get("data", data.get("workitems", []))


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


async def fetch_all_defects(model_name: str = "") -> list[dict[str, Any]]:
    """
    testDefect 전체 조회 → 정규화.
    model_name이 지정되면 해당 모델만 필터.
    """
    query = f'type:testDefect AND model_name:"{model_name}"' if model_name else "type:testDefect"

    all_rows: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        rows = await fetch_list_page(page=page, query=query)
        if not rows:
            break
        all_rows.extend(rows)

    results: list[dict[str, Any]] = []
    for row in all_rows:
        self_url = (row.get("links") or {}).get("self", "")
        location = row.get("location", "")

        if self_url:
            try:
                attrs = await fetch_detail(self_url)
            except Exception:
                attrs = row.get("attributes", row)
        else:
            attrs = row.get("attributes", row)

        item = normalize_workitem(attrs, location)
        if item.get("id") or item.get("title"):
            results.append(item)

    return results
