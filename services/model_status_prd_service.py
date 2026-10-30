"""
모델현황 PRD — Polarion ALM workitem (type PRD, 적용모델 필터).

alm page.js 와 동일하게 davis-db-api /alm/workitems/list 가 있으면 우선 사용.
"""
from __future__ import annotations

import re
from typing import Any

import httpx

from config import settings
from polarion_client import (
    _quote_polarion_value,
    _safe_text,
    fetch_list_page,
    flatten_workitem,
    workitem_id,
)
from services.model_status_initiative_service import normalize_model_code

APPLY_MODEL_FIELD_CANDIDATES: tuple[str, ...] = (
    "applyModel",
    "applicationModel",
    "appliedModel",
    "targetModel",
    "modelApply",
    "적용모델",
    "ApplyModel",
)

PRD_TYPE_TOKENS: tuple[str, ...] = ("PRD", "prd", "requirement", "systemRequirement")


def apply_model_search_terms(model: str | None) -> list[str]:
    """UI model code → ALM 적용모델 검색어 (PO: Sound Suite H7 / Sound suite_H7 등)."""
    code = normalize_model_code(model) or (model or "").strip()
    terms: list[str] = []
    if code:
        terms.append(code.replace("_", " "))
        terms.append(code)
    if code == "H7_VI":
        terms.extend(
            [
                "Sound Suite H7",
                "Sound suite_H7",
                "SoundSuite_H7",
                "Sound Suite H7(VI)",
                "SoundSuite_H7(VI)",
                "Sound suite H7",
            ]
        )
    elif code == "H5":
        terms.extend(["Sound Suite H5", "SoundSuite_H5", "Sound suite_H5"])
    elif code == "M7_VI":
        terms.extend(["Sound Suite M7_VI", "M7_VI", "Sound suite M7"])
    elif code == "W5":
        terms.extend(["Sound Suite W5", "SoundSuite W5", "W5"])
    elif code == "S90C":
        terms.append("S90C")
    elif code == "S80C":
        terms.append("S80C")

    seen: set[str] = set()
    out: list[str] = []
    for t in terms:
        s = (t or "").strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out


def _extract_apply_model(flat: dict[str, Any]) -> str:
    for key in APPLY_MODEL_FIELD_CANDIDATES:
        v = _safe_text(flat, key)
        if v:
            return v
    for key, val in flat.items():
        lk = str(key).lower()
        if "apply" in lk or "적용" in str(key):
            v = _safe_text(flat, key)
            if v:
                return v
    return ""


def normalize_prd_workitem(row: dict[str, Any], *, project_key: str) -> dict[str, Any]:
    flat = flatten_workitem(row)
    wid = workitem_id(flat, row)
    portal_base = "https://alm-lge-hlm.singlex.com"
    return {
        "id": wid,
        "title": _safe_text(flat, "title") or _safe_text(flat, "summary") or wid,
        "status": _safe_text(flat, "status"),
        "type": _safe_text(flat, "type"),
        "applyModel": _extract_apply_model(flat),
        "assignee": _safe_text(flat, "assignee"),
        "created": _safe_text(flat, "created")[:10],
        "updated": _safe_text(flat, "updated")[:10],
        "polarionUrl": f"{portal_base}/polarion/#/project/{project_key}/workitem?id={wid}",
    }


def build_prd_probe_queries(terms: list[str]) -> list[str]:
    """Lucene 후보 — type PRD × 적용모델 필드 × 검색어."""
    if not terms:
        return ["type:PRD"]
    queries: list[str] = []
    text_or = " OR ".join(_quote_polarion_value(t) for t in terms)
    for ttype in PRD_TYPE_TOKENS:
        queries.append(f"type:{ttype}")
        for field in APPLY_MODEL_FIELD_CANDIDATES[:6]:
            part = " OR ".join(f'{field}:{_quote_polarion_value(t)}' for t in terms)
            queries.append(f"type:{ttype} AND ({part})")
        queries.append(f"type:{ttype} AND ({text_or})")
        for t in terms:
            if "H7" in t:
                queries.append(f"type:{ttype} AND applyModel:*H7*")
    # dedupe preserve order
    seen: set[str] = set()
    uniq: list[str] = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            uniq.append(q)
    return uniq[:40]


async def _probe_polarion_query(query: str, project_key: str) -> dict[str, Any]:
    if not (settings.polarion_pat or "").strip():
        return {"query": query, "count": 0, "error": "POLARION_PAT not configured"}
    try:
        rows, total = await fetch_list_page(page=1, query=query, page_size=20, project_key=project_key)
        return {"query": query, "count": int(total or len(rows)), "error": None}
    except Exception as e:
        return {"query": query, "count": 0, "error": str(e)[:200]}


async def _fetch_polarion_items(query: str, project_key: str, limit: int = 50) -> list[dict[str, Any]]:
    rows: list[dict] = []
    total = 0
    for page in range(1, 6):
        batch, total = await fetch_list_page(page=page, query=query, page_size=100, project_key=project_key)
        if not batch:
            break
        rows.extend(batch)
        if len(rows) >= total or len(rows) >= limit:
            break
    return [normalize_prd_workitem(r, project_key=project_key) for r in rows[:limit]]


async def _fetch_davis_alm(query: str, project_id: str, alm_type: str) -> tuple[list[dict], str | None]:
    base = (getattr(settings, "davis_db_api_base_url", "") or "").strip().rstrip("/")
    key = (getattr(settings, "davis_db_api_key", "") or "").strip()
    if not base or not key:
        return [], None
    url = f"{base}/alm/workitems/list"
    params = {
        "project_id": project_id,
        "alm_type": alm_type,
        "fields": "id,type,title,status,applyModel,applicationModel,targetModel,description,assignee,created,updated",
        "page_size": 100,
        "page_number": 1,
        "query": query,
    }
    headers = {"X-API-Key": key, "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    inner = data.get("data") or data or {}
    items = inner.get("data") or inner.get("workitems") or inner.get("items") or []
    if not isinstance(items, list):
        items = []
    normalized = []
    for item in items:
        attrs = item.get("attributes") or item
        flat = flatten_workitem(item)
        flat.update({k: attrs.get(k) for k in attrs if k not in flat})
        normalized.append(
            {
                "id": _safe_text(flat, "id") or workitem_id(flat, item),
                "title": _safe_text(flat, "title"),
                "status": _safe_text(flat, "status"),
                "type": _safe_text(flat, "type"),
                "applyModel": _extract_apply_model(flat),
                "assignee": _safe_text(flat, "assignee"),
                "created": _safe_text(flat, "created")[:10],
                "updated": _safe_text(flat, "updated")[:10],
                "polarionUrl": "",
            }
        )
    return normalized, "davis-db-api"


async def get_prd_for_model(
    model: str | None,
    *,
    probe: bool = False,
    project_key: str | None = None,
    alm_type: str = "tv",
) -> dict[str, Any]:
    proj = (project_key or getattr(settings, "polarion_prd_project_key", "") or settings.polarion_project_key).strip()
    terms = apply_model_search_terms(model)
    probe_queries = build_prd_probe_queries(terms)

    source = "polarion"
    probe_results: list[dict[str, Any]] = []
    winning_query: str | None = None
    items: list[dict[str, Any]] = []

    if probe:
        for q in probe_queries:
            probe_results.append(await _probe_polarion_query(q, proj))
        for pr in probe_results:
            if pr.get("count") and not pr.get("error"):
                winning_query = str(pr["query"])
                break

    if not winning_query:
        # 기본: 첫 번째 applyModel OR 쿼리
        for q in probe_queries:
            if "applyModel" in q or "applicationModel" in q:
                winning_query = q
                break
        if not winning_query and probe_queries:
            winning_query = probe_queries[0]

    if winning_query and (settings.polarion_pat or "").strip():
        try:
            items = await _fetch_polarion_items(winning_query, proj)
        except Exception as e:
            return {
                "meta": {
                    "model": model,
                    "projectKey": proj,
                    "source": source,
                    "terms": terms,
                    "winningQuery": winning_query,
                    "error": str(e),
                    "polarionConfigured": bool(settings.polarion_pat),
                },
                "probe": probe_results if probe else [],
                "items": [],
            }

    if not items:
        davis_project = (getattr(settings, "davis_alm_project_id", "") or proj).strip()
        for q in probe_queries[:8]:
            try:
                davis_items, src = await _fetch_davis_alm(q, davis_project, alm_type)
                if davis_items:
                    items = davis_items
                    winning_query = q
                    source = src or "davis-db-api"
                    break
            except Exception:
                continue

    discovered: set[str] = set()
    for it in items:
        if it.get("applyModel"):
            discovered.add("applyModel(value)")

    return {
        "meta": {
            "model": model,
            "projectKey": proj,
            "almType": alm_type,
            "source": source,
            "terms": terms,
            "winningQuery": winning_query,
            "total": len(items),
            "polarionConfigured": bool((settings.polarion_pat or "").strip()),
            "davisConfigured": bool(
                (getattr(settings, "davis_db_api_base_url", "") or "").strip()
                and (getattr(settings, "davis_db_api_key", "") or "").strip()
            ),
        },
        "probe": probe_results if probe else [],
        "items": items,
        "discoveredFields": sorted(discovered),
    }
