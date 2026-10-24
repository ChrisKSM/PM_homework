"""
모델현황 PRD — Polarion ALM workitem (type PRD, 적용모델 필터).

alm page.js 와 동일하게 davis-db-api /alm/workitems/list 가 있으면 우선 사용.
"""
from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

import httpx

from config import settings
from polarion_client import (
    _fetch_detail_batch,
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

# UI 목록 최대 건수 (Polarion page fetch 상한)
PRD_LIST_LIMIT = 80

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
                "SoundSuite_H7(VI)",
                "Sound Suite H7",
                "Sound suite_H7",
                "SoundSuite_H7",
                "Sound Suite H7(VI)",
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


def polarion_component_values_for_model(model: str | None) -> list[str]:
    """Polarion PRD components 필드 값 — OR 로 묶어 검색."""
    code = normalize_model_code(model) or (model or "").strip()
    mapping: dict[str, list[str]] = {
        "H7_VI": ["SoundSuite_H7(VI)", "H7_VI"],
        "H5": ["SoundSuite_H5"],
        "M7_VI": ["SoundSuite_M7(VI)", "M7_VI"],
        "W5": ["SoundSuite_W5"],
    }
    seen: set[str] = set()
    out: list[str] = []
    for v in mapping.get(code, []):
        s = (v or "").strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out


def polarion_component_for_model(model: str | None) -> str | None:
    """meta 표시용 — 복수 component 는 | 로."""
    vals = polarion_component_values_for_model(model)
    if not vals:
        return None
    return " | ".join(vals)


def build_components_query(components: str | list[str]) -> str:
    """
    Polarion UI — components:(…) 필드만 사용 (title 아님).
    H7_VI canonical: components:(\"SoundSuite_H7(VI)\" OR H7_VI)
    """
    if isinstance(components, str):
        raw = [components]
    else:
        raw = list(components)
    parts = [_quote_polarion_value(c.strip()) for c in raw if (c or "").strip()]
    if not parts:
        return "components:(*)"
    if len(parts) == 1:
        return f"components:({parts[0]})"
    return f"components:({' OR '.join(parts)})"


def build_components_lucene_queries(comps: list[str]) -> list[str]:
    """components 후보 — UI 한 줄 OR + 필드별 OR + 단일 값."""
    parts = [_quote_polarion_value(c.strip()) for c in comps if (c or "").strip()]
    if not parts:
        return []
    queries: list[str] = []
    if len(parts) == 1:
        queries.append(f"components:({parts[0]})")
        return queries
    queries.append(f"components:({' OR '.join(parts)})")
    queries.append(f"({' OR '.join(f'components:({p})' for p in parts)})")
    for p in parts:
        queries.append(f"components:({p})")
    return _dedupe_queries(queries, limit=10)


def build_prd_component_queries(model: str | None) -> list[str]:
    return build_components_lucene_queries(polarion_component_values_for_model(model))


def _prd_list_path_candidates(primary: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for p in (primary, "workitems/PRD", "PRD", "workitems"):
        s = (p or "").strip().strip("/")
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def _workitem_self_url(row: dict[str, Any], flat: dict[str, Any] | None = None) -> str:
    f = flat if flat is not None else flatten_workitem(row)
    links = row.get("links") if isinstance(row.get("links"), dict) else {}
    links = links or (f.get("links") if isinstance(f.get("links"), dict) else {})
    if isinstance(links, dict):
        u = links.get("self") or links.get("Self")
        if isinstance(u, str) and u.strip():
            return u.strip()
    for key in ("uri", "self", "url"):
        u = f.get(key) or row.get(key)
        if isinstance(u, str) and u.strip().startswith("http"):
            return u.strip()
    return ""


def _extract_workitem_title(flat: dict[str, Any], wid: str) -> str:
    for key in ("title", "summary", "name", "Subject", "headline"):
        t = _safe_text(flat, key)
        if t and t != wid:
            return t
    desc = _safe_text(flat, "description")
    if desc:
        plain = re.sub(r"<[^>]+>", " ", desc)
        plain = re.sub(r"\s+", " ", plain).strip()
        if plain and not plain.startswith(wid):
            return plain[:400]
    return _safe_text(flat, "title") or _safe_text(flat, "summary") or wid


def resolve_prd_polarion(project_key: str | None = None) -> tuple[str, str]:
    """(projectKey, listPath) — PRD 전용 Polarion REST/UI 경로."""
    proj = (
        (project_key or "").strip()
        or (getattr(settings, "polarion_prd_project_key", "") or "").strip()
        or settings.polarion_project_key.strip()
    )
    path = (
        (getattr(settings, "polarion_prd_list_path", "") or "").strip().strip("/")
        or "workitems/PRD"
    )
    return proj, path


def _extract_alm_labels(flat: dict[str, Any]) -> list[str]:
    raw = flat.get("labels") or flat.get("label") or flat.get("Labels") or flat.get("tags")
    out: list[str] = []
    if isinstance(raw, list):
        for item in raw:
            t = _field_text(item)
            if t:
                out.append(t)
    elif isinstance(raw, str):
        for part in re.split(r"[,;|\n]+", raw):
            t = part.strip()
            if t:
                out.append(t)
    elif isinstance(raw, dict):
        t = _field_text(raw)
        if t:
            out.append(t)
    seen: set[str] = set()
    uniq: list[str] = []
    for x in out:
        k = x.lower()
        if k not in seen:
            seen.add(k)
            uniq.append(x)
    return uniq


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
    detail = row.get("_detailMerged")
    if isinstance(detail, dict):
        flat = {**flat, **detail}
    wid = workitem_id(flat, row)
    portal_base = "https://alm-lge-hlm.singlex.com"
    return {
        "id": wid,
        "title": _extract_workitem_title(flat, wid),
        "status": _safe_text(flat, "status"),
        "type": _safe_text(flat, "type"),
        "applyModel": _extract_apply_model(flat),
        "assignee": _safe_text(flat, "assignee"),
        "created": _safe_text(flat, "created")[:10],
        "updated": _safe_text(flat, "updated")[:10],
        "almLabels": _extract_alm_labels(flat),
        "polarionUrl": f"{portal_base}/polarion/#/project/{project_key}/workitem?id={wid}",
    }


def build_prd_probe_queries(terms: list[str], *, model: str | None = None) -> list[str]:
    """Lucene 후보 — 매핑된 모델은 components 만."""
    comps = polarion_component_values_for_model(model)
    if comps:
        return build_components_lucene_queries(comps)
    queries: list[str] = []
    if not terms:
        return queries or ["type:PRD"]
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


def build_prd_discovery_queries(terms: list[str], *, model: str | None = None) -> list[str]:
    """type/필드명 불명일 때 — 매핑된 모델은 components 만."""
    comps = polarion_component_values_for_model(model)
    if comps:
        return build_components_lucene_queries(comps)
    queries: list[str] = []
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
    for ttype in PRD_TYPE_TOKENS[:4]:
        for term in terms[:4]:
            qv = _quote_polarion_value(term)
            queries.append(f"type:{ttype} AND (applyModel:{qv} OR model_name:{qv})")
            queries.append(f"type:{ttype} AND title:{qv}")
    for ttype in PRD_TYPE_TOKENS[:3]:
        queries.append(f"type:{ttype}")
    return _dedupe_queries(queries, limit=32)


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


def workitem_matches_model_scope(flat: dict[str, Any], terms: list[str]) -> bool:
    """모델현황 UI — 적용모델·labels·title 기준 (넓은 type:PRD 전체 제외)."""
    if not terms:
        return True
    apply = _norm_match_text(_extract_apply_model(flat))
    for term in terms:
        nt = _norm_match_text(term)
        if len(nt) >= 3 and apply and nt in apply:
            return True
    for label in _extract_alm_labels(flat):
        nlb = _norm_match_text(label)
        for term in terms:
            nt = _norm_match_text(term)
            if len(nt) >= 3 and nt in nlb:
                return True
    title = _norm_match_text(_safe_text(flat, "title") or _safe_text(flat, "summary"))
    for term in terms:
        nt = _norm_match_text(term)
        if len(nt) >= 5 and nt in title:
            return True
    if any("h7" in _norm_match_text(t) for t in terms):
        if "h7" in title and ("sound" in title or "suite" in title):
            return True
        if "h7" in apply:
            return True
    return False


POLARION_UI_BASE = "https://alm-lge-hlm.singlex.com/polarion/#/project"


def polarion_workitems_search_url(
    project_key: str,
    query: str,
    *,
    list_path: str | None = None,
) -> str:
    """Polarion UI — workitems Lucene 검색 URL (브라우저에 붙여넣기)."""
    key = (project_key or settings.polarion_project_key).strip()
    path = (list_path or getattr(settings, "polarion_prd_list_path", "") or "workitems/PRD").strip(
        "/"
    )
    enc = quote(query, safe="")
    return f"{POLARION_UI_BASE}/{key}/{path}?query={enc}"


def _probe_query_priority(query: str) -> int:
    """높을수록 적용모델/타입이 명시된 쿼리 (type:PRD 단독은 최하위)."""
    ql = (query or "").lower()
    score = 0
    if "components:" in ql:
        score += 250
    if "applymodel" in ql or "applicationmodel" in ql:
        score += 120
    if "model_name" in ql:
        score += 110
    if "type:" in ql and " and " in ql:
        score += 90
    if "title:" in ql:
        score += 75
    if "title:" in ql and ("h7" in ql or "sound" in ql):
        score += 85
    if "project_name:" in ql:
        score += 40
    if ql.startswith("type:") and " and " not in ql:
        score += 5
    if ql.startswith("(") and "type:" not in ql:
        score += 15
    return score


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
    strict_model_scope: bool = False,
    enrich_details: bool = True,
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
        match_fn = workitem_matches_model_scope if strict_model_scope else workitem_matches_apply_terms
        filtered = []
        for r in rows:
            flat = flatten_workitem(r)
            if match_fn(flat, terms):
                filtered.append(r)
        rows = filtered
    slice_rows = rows[:limit]
    if enrich_details and slice_rows:
        urls = [_workitem_self_url(r) for r in slice_rows]
        if any(urls):
            details = await _fetch_detail_batch(urls)
            merged_rows: list[dict[str, Any]] = []
            for row, det in zip(slice_rows, details):
                if det:
                    merged_rows.append({**row, "_detailMerged": det})
                else:
                    merged_rows.append(row)
            slice_rows = merged_rows
    return [normalize_prd_workitem(r, project_key=project_key) for r in slice_rows]


def _query_needs_client_filter(query: str) -> bool:
    q = (query or "").lower()
    if q.startswith("type:") and "and" not in q:
        return True
    return "title:" in q or q.startswith("(")


def _query_is_lucene_model_scoped(query: str, terms: list[str]) -> bool:
    """title:\"H7 VI\" / applyModel:… 처럼 Lucene이 이미 모델을 좁힌 경우 — BE 재필터 생략."""
    ql = (query or "").lower()
    if "components:" in ql:
        return True
    if "applymodel" in ql or "applicationmodel" in ql or "model_name:" in ql:
        return True
    if "title:" in ql:
        for term in terms:
            t = (term or "").strip()
            if len(t) >= 4 and t.lower() in ql:
                return True
            if "h7" in t.lower() and "h7" in ql:
                return True
    return False


def _fetch_filter_flags(query: str, terms: list[str]) -> tuple[bool, bool]:
    """(client_filter, strict_model_scope)"""
    if _query_is_lucene_model_scoped(query, terms):
        return False, False
    if _query_needs_client_filter(query):
        return True, True
    return False, False


async def _fetch_from_discovery_probes(
    discovery: dict[str, Any],
    project_key: str,
    terms: list[str],
    *,
    limit: int = PRD_LIST_LIMIT,
) -> tuple[list[dict[str, Any]], str | None, str | None]:
    """discovery — **구체적 쿼리 우선**, 항상 모델 scope 필터."""
    probes = [p for p in (discovery.get("probes") or []) if p.get("count") and not p.get("error")]
    probes.sort(
        key=lambda p: (
            -_probe_query_priority(str(p.get("query") or "")),
            int(p.get("count") or 0),
        )
    )
    for pr in probes:
        q = str(pr["query"])
        if _probe_query_priority(q) < 20:
            continue
        lp = pr.get("listPath")
        cf, strict = _fetch_filter_flags(q, terms)
        items = await _fetch_polarion_items(
            q,
            project_key,
            limit=limit,
            list_path=lp if lp else None,
            terms=terms,
            client_filter=cf,
            strict_model_scope=strict,
        )
        if items:
            return items, q, lp if lp else None
    for pr in probes:
        q = str(pr["query"])
        if _probe_query_priority(q) >= 20:
            continue
        lp = pr.get("listPath")
        cf, strict = _fetch_filter_flags(q, terms)
        items = await _fetch_polarion_items(
            q,
            project_key,
            limit=limit,
            list_path=lp if lp else None,
            terms=terms,
            client_filter=cf,
            strict_model_scope=strict,
        )
        if items:
            return items, q, lp if lp else None
    return [], None, None


async def _try_components_queries(
    project_key: str,
    model: str | None,
    terms: list[str],
    *,
    list_path: str,
) -> tuple[list[dict[str, Any]], str | None, str | None]:
    """Polarion PRD — components SoundSuite_H7(VI) / H7_VI (경로·값별 merge)."""
    comps = polarion_component_values_for_model(model)
    paths = _prd_list_path_candidates(list_path)
    merged: dict[str, dict[str, Any]] = {}
    winning_query: str | None = None
    winning_path: str | None = None

    async def _pull(q: str, path: str) -> list[dict[str, Any]]:
        return await _fetch_polarion_items(
            q,
            project_key,
            limit=PRD_LIST_LIMIT,
            list_path=path,
            client_filter=False,
            enrich_details=True,
        )

    canonical = build_components_query(comps) if comps else None
    lucene_qs = build_components_lucene_queries(comps) if comps else []

    if comps and lucene_qs:
        for path in paths:
            for q in lucene_qs:
                pr = await _probe_polarion_query(q, project_key, list_path=path)
                if int(pr.get("count") or 0) <= 0 or pr.get("error"):
                    continue
                for it in await _pull(q, path):
                    merged[it["id"]] = it
            if merged:
                winning_query = canonical
                winning_path = path
                break

    if merged:
        items = list(merged.values())[:PRD_LIST_LIMIT]
        return items, winning_query or canonical, winning_path

    if comps:
        return [], canonical, None

    for path in paths:
        for t in terms[:6]:
            s = (t or "").strip()
            if not s:
                continue
            q = build_components_query(s)
            pr = await _probe_polarion_query(q, project_key, list_path=path)
            if int(pr.get("count") or 0) <= 0 or pr.get("error"):
                continue
            for it in await _pull(q, path):
                merged[it["id"]] = it
            if merged:
                return list(merged.values())[:PRD_LIST_LIMIT], q, path

    return [], None, None


async def _try_title_term_queries(
    project_key: str,
    terms: list[str],
    *,
    list_path: str | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """폴백 — title:\"H7 VI\" 등 (RelProjMgmt 등 legacy)."""
    ordered = sorted(terms, key=lambda t: len(t or ""), reverse=True)
    for term in ordered:
        t = (term or "").strip()
        if len(t) < 4:
            continue
        q = f"title:{_quote_polarion_value(t)}"
        pr = await _probe_polarion_query(q, project_key, list_path=list_path)
        if int(pr.get("count") or 0) <= 0 or pr.get("error"):
            continue
        items = await _fetch_polarion_items(
            q,
            project_key,
            limit=PRD_LIST_LIMIT,
            list_path=list_path,
            client_filter=False,
        )
        if items:
            return items, q
    return [], None


async def _try_tight_apply_model_queries(
    project_key: str,
    terms: list[str],
    probe_queries: list[str],
    *,
    list_path: str | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """applyModel / type+field probe hit 만 사용 (UI 1차)."""
    for q in probe_queries:
        ql = q.lower()
        if "applymodel" not in ql and "model_name" not in ql:
            continue
        if "type:" not in ql:
            continue
        pr = await _probe_polarion_query(q, project_key, list_path=list_path)
        count = int(pr.get("count") or 0)
        if count <= 0 or pr.get("error") or count > 400:
            continue
        items = await _fetch_polarion_items(
            q,
            project_key,
            limit=PRD_LIST_LIMIT,
            list_path=list_path,
            terms=terms,
            client_filter=True,
            strict_model_scope=True,
        )
        if items:
            return items, q
    return [], None


async def _run_discovery(
    project_key: str,
    terms: list[str],
    *,
    model: str | None = None,
    list_path: str | None = None,
) -> dict[str, Any]:
    """Polarion type/필드 후보 탐색 + 샘플 attribute 키."""
    discovery_probes: list[dict[str, Any]] = []
    sample_rows: list[dict] = []
    winning: dict[str, Any] | None = None
    queries = build_prd_discovery_queries(terms, model=model)
    default_path = list_path

    for q in queries:
        pr = await _probe_polarion_query(q, project_key, list_path=default_path)
        discovery_probes.append(pr)
        if pr.get("count") and not pr.get("error") and not winning:
            winning = pr

    if not winning:
        alt_paths: list[str | None] = [default_path, "workitems", "requirements", "requirement"]
        seen_lp: set[str | None] = set()
        for lp in alt_paths:
            if lp in seen_lp:
                continue
            seen_lp.add(lp)
            for q in queries[:8]:
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
                "almLabels": _extract_alm_labels(flat),
                "polarionUrl": "",
            }
        )
    return normalized, "davis-db-api"


async def get_prd_query_catalog(
    model: str | None,
    *,
    project_key: str | None = None,
    max_queries: int = 50,
) -> dict[str, Any]:
    """
    Polarion Lucene 후보 전부 probe — count + UI URL.
    BE pod / 브라우저에서 query 확인용.
    """
    proj, prd_path = resolve_prd_polarion(project_key)
    terms = apply_model_search_terms(model)
    probe_queries = build_prd_probe_queries(terms, model=model)
    discovery_queries = build_prd_discovery_queries(terms, model=model)
    all_queries = _dedupe_queries(probe_queries + discovery_queries, limit=max_queries)

    catalog: list[dict[str, Any]] = []
    if not (settings.polarion_pat or "").strip():
        return {
            "meta": {
                "model": model,
                "projectKey": proj,
                "terms": terms,
                "polarionConfigured": False,
                "error": "POLARION_PAT not configured",
            },
            "queryCatalog": [],
            "recommended": [],
        }

    for q in all_queries:
        pr = await _probe_polarion_query(q, proj, list_path=prd_path)
        count = int(pr.get("count") or 0)
        catalog.append(
            {
                "query": q,
                "count": count,
                "error": pr.get("error"),
                "priority": _probe_query_priority(q),
                "polarionUrl": polarion_workitems_search_url(proj, q, list_path=prd_path),
            }
        )

    catalog.sort(key=lambda row: (-int(row.get("priority") or 0), -int(row.get("count") or 0)))
    hits = [row for row in catalog if row.get("count") and not row.get("error")]
    recommended = hits[:8] if hits else catalog[:12]

    return {
        "meta": {
            "model": model,
            "projectKey": proj,
            "listPath": prd_path,
            "polarionComponent": polarion_component_for_model(model),
            "terms": terms,
            "polarionConfigured": True,
            "probed": len(catalog),
            "hitCount": len(hits),
            "hint": "recommended[].polarionUrl 을 브라우저에서 열어 hit 쿼리 확인",
        },
        "queryCatalog": catalog,
        "recommended": recommended,
    }


async def get_prd_for_model(
    model: str | None,
    *,
    probe: bool = False,
    discover: bool = False,
    project_key: str | None = None,
    alm_type: str = "tv",
) -> dict[str, Any]:
    proj, prd_path = resolve_prd_polarion(project_key)
    terms = apply_model_search_terms(model)
    probe_queries = build_prd_probe_queries(terms, model=model)
    polarion_component = polarion_component_for_model(model)

    source = "polarion"
    probe_results: list[dict[str, Any]] = []
    winning_query: str | None = None
    winning_list_path: str | None = None
    items: list[dict[str, Any]] = []
    discovery: dict[str, Any] | None = None

    list_mode = not probe
    component_scoped = bool(polarion_component_values_for_model(model))
    effective_discover = discover or (list_mode and not component_scoped)

    if probe:
        probe_qs = probe_queries
        if component_scoped:
            probe_qs = build_prd_component_queries(model)
            winning_query = build_components_query(polarion_component_values_for_model(model))
        for q in probe_qs:
            probe_results.append(await _probe_polarion_query(q, proj, list_path=prd_path))
        if not component_scoped:
            for pr in probe_results:
                if pr.get("count") and not pr.get("error"):
                    winning_query = str(pr["query"])
                    break

    if (settings.polarion_pat or "").strip() and list_mode:
        items, winning_query, comp_path = await _try_components_queries(
            proj, model, terms, list_path=prd_path
        )
        if items:
            source = "polarion+components"
            winning_list_path = comp_path or prd_path
        elif component_scoped and not winning_query:
            winning_query = build_components_query(polarion_component_values_for_model(model))

    if (settings.polarion_pat or "").strip() and list_mode and not items and not component_scoped:
        items, winning_query = await _try_title_term_queries(proj, terms, list_path=prd_path)
        if items:
            source = "polarion+title"
            winning_list_path = prd_path

    if (settings.polarion_pat or "").strip() and list_mode and not items and not component_scoped:
        items, winning_query = await _try_tight_apply_model_queries(
            proj, terms, probe_queries, list_path=prd_path
        )
        if items:
            source = "polarion+applyModel"

    if (settings.polarion_pat or "").strip() and list_mode and effective_discover and not items:
        discovery = await _run_discovery(proj, terms, model=model, list_path=prd_path)
        items, winning_query, winning_list_path = await _fetch_from_discovery_probes(
            discovery, proj, terms
        )
        if items:
            source = "polarion+discovery"

    run_discovery = (
        not component_scoped
        and (discover or (probe and not any(p.get("count") for p in probe_results)))
    )
    if run_discovery and (settings.polarion_pat or "").strip() and not discovery:
        discovery = await _run_discovery(proj, terms, model=model, list_path=prd_path)
        best = (discovery or {}).get("bestProbe") or {}
        if best.get("count") and not winning_query:
            winning_query = str(best.get("query"))
            winning_list_path = best.get("listPath")

    if not items and not list_mode:
        if not winning_query:
            for q in probe_queries:
                if "applyModel" in q or "applicationModel" in q or "model_name" in q:
                    winning_query = q
                    break
            if not winning_query and probe_queries:
                winning_query = probe_queries[0]

        if winning_query:
            try:
                items = await _fetch_polarion_items(
                    winning_query,
                    proj,
                    list_path=winning_list_path or prd_path,
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

    if (
        not items
        and (settings.polarion_pat or "").strip()
        and discovery
        and not component_scoped
    ):
        items, winning_query, winning_list_path = await _fetch_from_discovery_probes(
            discovery, proj, terms
        )
        if items:
            source = "polarion+discovery"

    if (
        not items
        and (settings.polarion_pat or "").strip()
        and not component_scoped
    ):
        for q in build_prd_discovery_queries(terms, model=model):
            try:
                items = await _fetch_polarion_items(
                    q,
                    proj,
                    limit=PRD_LIST_LIMIT,
                    list_path=prd_path,
                    terms=terms,
                    client_filter=True,
                    strict_model_scope=True,
                )
                if items:
                    winning_query = q
                    source = "polarion+clientFilter"
                    break
            except Exception:
                continue

    if (
        list_mode
        and not items
        and (settings.polarion_pat or "").strip()
        and not component_scoped
    ):
        cat = await get_prd_query_catalog(model, project_key=proj, max_queries=24)
        rec = cat.get("recommended") or []
        if rec:
            for row in rec:
                if not row.get("count"):
                    continue
                q = str(row["query"])
                items = await _fetch_polarion_items(
                    q,
                    proj,
                    limit=PRD_LIST_LIMIT,
                    list_path=prd_path,
                    terms=terms,
                    client_filter=True,
                    strict_model_scope=False,
                )
                if items:
                    winning_query = q
                    source = "polarion+relaxedFilter"
                    break

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

    from services.model_status_prd_labels import merge_labels_into_items
    from services.model_status_prd_status import PRD_WORKFLOW_COLUMNS, enrich_prd_item_workflow

    items = [enrich_prd_item_workflow(i) for i in items]
    items, label_meta = merge_labels_into_items(model or "", items)

    discovered: set[str] = set()
    for it in items:
        if it.get("applyModel"):
            discovered.add("applyModel(value)")
        if it.get("almLabels"):
            discovered.add("labels")

    return {
        "meta": {
            "model": model,
            "projectKey": proj,
            "listPath": prd_path,
            "polarionComponent": polarion_component,
            "almType": alm_type,
            "source": source,
            "terms": terms,
            "winningQuery": winning_query,
            "polarionUrl": (
                polarion_workitems_search_url(
                    proj,
                    winning_query,
                    list_path=winning_list_path or prd_path,
                )
                if winning_query
                else None
            ),
            "listLimit": PRD_LIST_LIMIT,
            "filterMode": (
                "luceneOnly"
                if winning_query and _query_is_lucene_model_scoped(str(winning_query), terms)
                else ("modelScope" if list_mode else "probe")
            ),
            "discoveryHits": (discovery or {}).get("hits") if discovery else None,
            "total": len(items),
            "polarionConfigured": bool((settings.polarion_pat or "").strip()),
            "davisConfigured": bool(
                (getattr(settings, "davis_db_api_base_url", "") or "").strip()
                and (getattr(settings, "davis_db_api_key", "") or "").strip()
            ),
            "labelStore": label_meta,
            "queryCatalogHint": (
                f"/api/model-status/prd/query-catalog?model={model or ''}"
                if list_mode and not items
                else None
            ),
        },
        "workflowColumns": [{"id": c["id"], "label": c["label"], "order": c["order"]} for c in PRD_WORKFLOW_COLUMNS],
        "probe": probe_results if probe else [],
        "discovery": discovery,
        "items": items,
        "discoveredFields": sorted(discovered),
    }
