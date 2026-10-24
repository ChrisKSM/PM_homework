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
    "model_name",
    "modelName",
    "productModel",
    "targetProduct",
    "적용모델",
    "ApplyModel",
)

PRD_TYPE_TOKENS: tuple[str, ...] = (
    "PRD",
    "prd",
    "requirement",
    "Requirement",
    "systemRequirement",
    "systemrequirement",
    "ProductRequirement",
    "productRequirement",
    "requirementDocument",
    "req",
)

_APPLY_KEY_RE = re.compile(r"apply|model|product|적용|target", re.I)


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
        for field in APPLY_MODEL_FIELD_CANDIDATES[:8]:
            part = " OR ".join(f'{field}:{_quote_polarion_value(t)}' for t in terms)
            queries.append(f"type:{ttype} AND ({part})")
        queries.append(f"type:{ttype} AND ({text_or})")
        for t in terms:
            if "H7" in t:
                queries.append(f"type:{ttype} AND applyModel:*H7*")
                queries.append(f"type:{ttype} AND model_name:*H7*")
    return _dedupe_queries(queries, limit=40)


def build_prd_discovery_queries(terms: list[str]) -> list[str]:
    """type/필드명 불명일 때 — title·model_name·project_name 등 넓은 probe."""
    queries: list[str] = []
    for ttype in PRD_TYPE_TOKENS[:6]:
        queries.append(f"type:{ttype}")
    for term in terms[:5]:
        qv = _quote_polarion_value(term)
        queries.append(f"title:{qv}")
        queries.append(f"model_name:{qv}")
        queries.append(f"project_name:{qv}")
        for field in ("applyModel", "applicationModel", "model_name"):
            queries.append(f"{field}:{qv}")
    if any("H7" in t for t in terms):
        queries.extend(
            [
                "title:*Sound*Suite*H7*",
                "title:*Sound* AND title:*H7*",
                "model_name:*H7*",
                "applyModel:*H7*",
            ]
        )
    part = " OR ".join(_quote_polarion_value(t) for t in terms[:6])
    queries.append(f"({part})")
    return _dedupe_queries(queries, limit=28)


def _dedupe_queries(queries: list[str], *, limit: int) -> list[str]:
    seen: set[str] = set()
    uniq: list[str] = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            uniq.append(q)
    return uniq[:limit]


def _field_text(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, dict):
        return str(val.get("name") or val.get("value") or val.get("id") or "").strip()
    if isinstance(val, list):
        return " ".join(_field_text(v) for v in val if v)
    return str(val).strip()


def _workitem_text_blob(flat: dict[str, Any]) -> str:
    chunks: list[str] = []
    for k, v in flat.items():
        if k in ("links", "uri", "self"):
            continue
        t = _field_text(v)
        if t:
            chunks.append(t)
    return " ".join(chunks).lower()


def _norm_match_text(s: str) -> str:
    return re.sub(r"[\s_]+", " ", (s or "").lower()).strip()


def workitem_matches_apply_terms(flat: dict[str, Any], terms: list[str]) -> bool:
    if not terms:
        return True
    blob = _norm_match_text(_workitem_text_blob(flat))
    for term in terms:
        if _norm_match_text(term) in blob:
            return True
    for key in APPLY_MODEL_FIELD_CANDIDATES:
        v = _norm_match_text(_field_text(flat.get(key)))
        if v and any(_norm_match_text(term) in v for term in terms):
            return True
    return False


def analyze_workitems_for_apply_fields(
    rows: list[dict[str, Any]], terms: list[str]
) -> dict[str, Any]:
    """샘플 workitem에서 적용모델 후보 필드·type 분포 추출."""
    type_counts: dict[str, int] = {}
    apply_hints: dict[str, set[str]] = {}
    all_keys: set[str] = set()
    for row in rows[:10]:
        flat = flatten_workitem(row)
        all_keys.update(str(k) for k in flat.keys())
        wtype = _safe_text(flat, "type") or "?"
        type_counts[wtype] = type_counts.get(wtype, 0) + 1
        for key, val in flat.items():
            ks = str(key)
            if not _APPLY_KEY_RE.search(ks):
                continue
            text = _field_text(val)
            if not text:
                continue
            if terms and not any(t.lower() in text.lower() for t in terms):
                continue
            apply_hints.setdefault(ks, set()).add(text[:120])
    hint_list = [
        {"field": k, "samples": sorted(v)[:5]} for k, v in sorted(apply_hints.items())
    ]
    interesting_keys = sorted(k for k in all_keys if _APPLY_KEY_RE.search(k))[:40]
    return {
        "typesSeen": type_counts,
        "applyFieldHints": hint_list,
        "interestingKeys": interesting_keys,
    }


async def _probe_polarion_query(
    query: str,
    project_key: str,
    *,
    list_path: str | None = None,
) -> dict[str, Any]:
    if not (settings.polarion_pat or "").strip():
        return {"query": query, "count": 0, "error": "POLARION_PAT not configured"}
    try:
        rows, total = await fetch_list_page(
            page=1,
            query=query,
            page_size=20,
            project_key=project_key,
            list_path=list_path,
        )
        out: dict[str, Any] = {
            "query": query,
            "count": int(total or len(rows)),
            "error": None,
        }
        if list_path:
            out["listPath"] = list_path
        return out
    except Exception as e:
        out = {"query": query, "count": 0, "error": str(e)[:200]}
        if list_path:
            out["listPath"] = list_path
        return out


async def _fetch_polarion_items(
    query: str,
    project_key: str,
    limit: int = 50,
    *,
    list_path: str | None = None,
    terms: list[str] | None = None,
    client_filter: bool = False,
) -> list[dict[str, Any]]:
    rows: list[dict] = []
    total = 0
    for page in range(1, 6):
        batch, total = await fetch_list_page(
            page=page,
            query=query,
            page_size=100,
            project_key=project_key,
            list_path=list_path,
        )
        if not batch:
            break
        rows.extend(batch)
        if len(rows) >= total or len(rows) >= limit * 3:
            break
    if client_filter and terms:
        filtered = []
        for r in rows:
            flat = flatten_workitem(r)
            if workitem_matches_apply_terms(flat, terms):
                filtered.append(r)
        rows = filtered
    return [normalize_prd_workitem(r, project_key=project_key) for r in rows[:limit]]


async def _run_discovery(
    project_key: str,
    terms: list[str],
) -> dict[str, Any]:
    """Polarion type/필드 후보 탐색 + 샘플 attribute 키."""
    discovery_probes: list[dict[str, Any]] = []
    sample_rows: list[dict] = []
    winning: dict[str, Any] | None = None
    queries = build_prd_discovery_queries(terms)

    for q in queries:
        pr = await _probe_polarion_query(q, project_key)
        discovery_probes.append(pr)
        if pr.get("count") and not pr.get("error") and not winning:
            winning = pr

    if not winning:
        alt_paths: list[str | None] = []
        prd_path = (getattr(settings, "polarion_prd_list_path", "") or "").strip()
        if prd_path:
            alt_paths.append(prd_path)
        alt_paths.extend(["requirements", "requirement"])
        for lp in alt_paths:
            for q in queries[:5]:
                pr = await _probe_polarion_query(q, project_key, list_path=lp)
                discovery_probes.append(pr)
                if pr.get("count") and not pr.get("error") and not winning:
                    winning = pr

    if winning:
        lp = winning.get("listPath")
        sample_rows, _ = await fetch_list_page(
            page=1,
            query=str(winning["query"]),
            page_size=15,
            project_key=project_key,
            list_path=lp if lp else None,
        )

    analysis = analyze_workitems_for_apply_fields(sample_rows, terms) if sample_rows else {}
    hits = [p for p in discovery_probes if (p.get("count") or 0) > 0 and not p.get("error")]
    return {
        "probes": discovery_probes,
        "hits": len(hits),
        "bestProbe": winning,
        "sampleAnalysis": analysis,
    }


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
    discover: bool = False,
    project_key: str | None = None,
    alm_type: str = "tv",
) -> dict[str, Any]:
    proj = (project_key or getattr(settings, "polarion_prd_project_key", "") or settings.polarion_project_key).strip()
    terms = apply_model_search_terms(model)
    probe_queries = build_prd_probe_queries(terms)

    source = "polarion"
    probe_results: list[dict[str, Any]] = []
    winning_query: str | None = None
    winning_list_path: str | None = None
    items: list[dict[str, Any]] = []
    discovery: dict[str, Any] | None = None

    if probe:
        for q in probe_queries:
            probe_results.append(await _probe_polarion_query(q, proj))
        for pr in probe_results:
            if pr.get("count") and not pr.get("error"):
                winning_query = str(pr["query"])
                break

    run_discovery = discover or (probe and not any(p.get("count") for p in probe_results))
    if run_discovery and (settings.polarion_pat or "").strip():
        discovery = await _run_discovery(proj, terms)
        best = (discovery or {}).get("bestProbe") or {}
        if best.get("count") and not winning_query:
            winning_query = str(best.get("query"))
            winning_list_path = best.get("listPath")

    if not winning_query:
        # 기본: 첫 번째 applyModel OR 쿼리
        for q in probe_queries:
            if "applyModel" in q or "applicationModel" in q or "model_name" in q:
                winning_query = q
                break
        if not winning_query and probe_queries:
            winning_query = probe_queries[0]

    if winning_query and (settings.polarion_pat or "").strip():
        try:
            items = await _fetch_polarion_items(
                winning_query,
                proj,
                list_path=winning_list_path,
            )
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
                "discovery": discovery,
                "items": [],
            }

    if not items and (settings.polarion_pat or "").strip():
        for q in build_prd_discovery_queries(terms)[:6]:
            try:
                items = await _fetch_polarion_items(
                    q,
                    proj,
                    limit=80,
                    terms=terms,
                    client_filter=True,
                )
                if items:
                    winning_query = q
                    source = "polarion+clientFilter"
                    break
            except Exception:
                continue

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
        "discovery": discovery,
        "items": items,
        "discoveredFields": sorted(discovered),
    }
