"""
Polarion ALM REST API 비동기 HTTP 클라이언트.
PAT Bearer 토큰 인증, testDefect workitem 조회 전용.
"""
from __future__ import annotations

import re
import warnings
from typing import Any

import httpx

from config import settings
from dej_variables import runtime_get

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


_RESOLVED_POLARION_PAT_SOURCE = "none"


def _polarion_pat_candidates() -> list[tuple[str, str]]:
    import os

    from dej_variables import dej_get

    out: list[tuple[str, str]] = []
    v = dej_get("POLARION_PAT")
    if v:
        out.append(("variables:POLARION_PAT", v))
    e = (os.getenv("POLARION_PAT") or "").strip()
    if e:
        out.append(("env:POLARION_PAT", e))
    s = (settings.polarion_pat or "").strip()
    if s:
        out.append(("settings.polarion_pat", s))
    return out


_POLARION_PAT_SOURCE_PRIORITY = (
    "variables:POLARION_PAT",
    "env:POLARION_PAT",
    "settings.polarion_pat",
)


def _pick_polarion_pat(candidates: list[tuple[str, str]]) -> tuple[str, str]:
    from dej_variables import normalize_polarion_pat, polarion_pat_plausible

    normed: list[tuple[str, str]] = []
    for source, raw in candidates:
        token = normalize_polarion_pat(raw)
        if token:
            normed.append((source, token))
    if not normed:
        return "", "none"
    for prefer in _POLARION_PAT_SOURCE_PRIORITY:
        for source, token in normed:
            if source == prefer and polarion_pat_plausible(token):
                return token, source
    for prefer in _POLARION_PAT_SOURCE_PRIORITY:
        for source, token in normed:
            if source == prefer:
                return token, source
    return normed[0][1], normed[0][0]


def polarion_pat() -> str:
    """
    variables.get → env → settings (Worker 기준). JWT(eyJ…) 또는 classic PAT 정규화.
    .env 의 다른 토큰으로 Variables JWT 를 덮어쓰지 않음.
    """
    global _RESOLVED_POLARION_PAT_SOURCE
    token, source = _pick_polarion_pat(_polarion_pat_candidates())
    _RESOLVED_POLARION_PAT_SOURCE = source
    return token


def polarion_pat_source() -> str:
    """실제 REST 에 쓰인 PAT 출처 (polarion_pat() 호출 후 의미 있음)."""
    if _RESOLVED_POLARION_PAT_SOURCE != "none":
        return _RESOLVED_POLARION_PAT_SOURCE
    _, source = _pick_polarion_pat(_polarion_pat_candidates())
    return source


def polarion_pat_configured() -> bool:
    return bool(polarion_pat())


def _polarion_pat() -> str:
    return polarion_pat()


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_polarion_pat()}",
        "Accept": "application/json",
    }


def _base_url() -> str:
    return settings.polarion_base_url.rstrip("/")


def _is_ootb_rest_v1() -> bool:
    """OOTB .../polarion/rest/v1 vs customs .../restful/customs/v1."""
    u = _base_url().lower()
    return "/rest/v1" in u and "restful/customs" not in u


def _list_path_segment(list_path: str | None) -> str:
    return (
        list_path
        or getattr(settings, "polarion_list_path", "")
        or "workitems"
    ).strip().strip("/")


def _ootb_uses_jsonapi_pagination(list_path: str | None) -> bool:
    """
    OOTB .../projects/{key}/workitems — page[number]/page[size].
    UI alias .../workitems/PRD 는 page[number] 400 (diagnose 스크립트 확인).
    """
    if not _is_ootb_rest_v1():
        return False
    seg = _list_path_segment(list_path)
    return seg == "workitems"


def _list_query_params(
    query: str,
    page: int,
    page_size: int,
    *,
    list_path: str | None = None,
) -> dict[str, Any]:
    if _ootb_uses_jsonapi_pagination(list_path):
        return {
            "query": query,
            "page[number]": page,
            "page[size]": page_size,
        }
    if _is_ootb_rest_v1():
        return {"query": query, "page": page, "pageSize": page_size}
    return {"query": query, "page": page, "pageSize": page_size}


def _list_endpoint(project_key: str | None = None, list_path: str | None = None) -> str:
    path = (list_path or getattr(settings, "polarion_list_path", "") or "workitems").strip("/")
    key = (project_key or settings.polarion_project_key).strip()
    return f"{_base_url()}/projects/{key}/{path}"


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


def _unwrap_ootb_workitem(row: dict[str, Any]) -> dict[str, Any]:
    """Polarion rest/v1 JSON:API → flat row (attributes + id + links)."""
    if "attributes" in row and isinstance(row.get("attributes"), dict):
        flat = dict(row["attributes"])
        if row.get("id") and not flat.get("id"):
            flat["id"] = row["id"]
        if row.get("links"):
            flat["links"] = row["links"]
        return flat
    return row


def _parse_polarion_list_page(data: Any) -> tuple[list[dict[str, Any]], int]:
    """Polarion rest/v1 (JSON:API) · customs list JSON → (workitems, totalCount)."""
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        raw_list = data["data"]
        if raw_list and isinstance(raw_list[0], dict) and (
            "attributes" in raw_list[0] or raw_list[0].get("type") == "workitems"
        ):
            workitems = [_unwrap_ootb_workitem(it) for it in raw_list if isinstance(it, dict)]
            meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
            total_raw = meta.get("totalCount", meta.get("total", meta.get("totalItems")))
            try:
                total_count = int(total_raw) if total_raw is not None else len(workitems)
            except (TypeError, ValueError):
                total_count = len(workitems)
            return workitems, total_count

    obj: dict[str, Any] | None = None
    if isinstance(data, dict) and "data" in data:
        inner = data["data"]
        if isinstance(inner, list) and inner:
            obj = inner[0] if isinstance(inner[0], dict) else None
        elif isinstance(inner, dict):
            obj = inner
    elif isinstance(data, list) and data and isinstance(data[0], dict):
        obj = data[0]
    elif isinstance(data, dict):
        obj = data

    if not obj:
        return [], 0

    workitems: list[dict[str, Any]] = []
    for key in ("workitems", "workItems", "items", "Workitems", "WorkItems"):
        raw = obj.get(key)
        if isinstance(raw, list):
            workitems = [_unwrap_ootb_workitem(it) if isinstance(it, dict) else it for it in raw]
            break

    total_raw = obj.get("totalCount", obj.get("total", obj.get("totalItems")))
    try:
        total_count = int(total_raw) if total_raw is not None else len(workitems)
    except (TypeError, ValueError):
        total_count = len(workitems)
    return workitems, total_count


async def fetch_list_page(
    page: int = 1,
    query: str = "type:testDefect",
    page_size: int = 100,
    project_key: str | None = None,
    list_path: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Polarion workitem 목록 페이지 조회. (workitems, totalCount) 반환."""
    params = _list_query_params(query, page, page_size, list_path=list_path)
    resp = await _get_with_retry(_list_endpoint(project_key, list_path=list_path), params=params)
    return _parse_polarion_list_page(resp.json())


def _jsonapi_included_index(doc: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    index: dict[tuple[str, str], dict[str, Any]] = {}
    for item in doc.get("included") or []:
        if not isinstance(item, dict):
            continue
        t = str(item.get("type") or "").strip()
        i = str(item.get("id") or "").strip()
        if t and i:
            index[(t, i)] = item
    return index


def _resolve_jsonapi_ref(
    ref: Any,
    included: dict[tuple[str, str], dict[str, Any]],
) -> Any:
    if isinstance(ref, list):
        return [_resolve_jsonapi_ref(r, included) for r in ref if r is not None]
    if not isinstance(ref, dict):
        return ref
    t = str(ref.get("type") or "").strip()
    i = str(ref.get("id") or "").strip()
    if t and i and (t, i) in included:
        inc = included[(t, i)]
        attrs = dict(inc.get("attributes") or {})
        attrs.setdefault("id", inc.get("id"))
        attrs.setdefault("type", inc.get("type"))
        return attrs
    return ref


def _hyperlink_from_obj(obj: dict[str, Any]) -> dict[str, str] | None:
    a = obj.get("attributes") if isinstance(obj.get("attributes"), dict) else obj
    if not isinstance(a, dict):
        return None
    role = str(a.get("role") or a.get("name") or a.get("type") or "").strip()
    uri = str(a.get("uri") or a.get("url") or a.get("URL") or a.get("link") or "").strip()
    if not uri and isinstance(a.get("target"), dict):
        uri = str(a["target"].get("uri") or a["target"].get("url") or "").strip()
    if not uri:
        return None
    return {"role": role, "uri": uri}


def _collect_hyperlinks_from_document(
    doc: dict[str, Any],
    included: dict[tuple[str, str], dict[str, Any]],
) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in doc.get("included") or []:
        if not isinstance(item, dict):
            continue
        t = str(item.get("type") or "").lower()
        if "hyperlink" not in t and "link" not in t:
            continue
        row = _hyperlink_from_obj(item)
        if row and row["uri"] not in seen:
            seen.add(row["uri"])
            out.append(row)
    data = doc.get("data")
    if isinstance(data, list) and data:
        data = data[0]
    if isinstance(data, dict):
        attrs = data.get("attributes") or {}
        if isinstance(attrs, dict):
            for key in ("hyperlinks", "Hyperlinks", "links"):
                raw = attrs.get(key)
                if isinstance(raw, list):
                    for it in raw:
                        if isinstance(it, dict):
                            row = _hyperlink_from_obj(it)
                            if row and row["uri"] not in seen:
                                seen.add(row["uri"])
                                out.append(row)
        rels = data.get("relationships") or {}
        if isinstance(rels, dict):
            for rel_name, rel_body in rels.items():
                if "hyperlink" not in str(rel_name).lower():
                    continue
                if not isinstance(rel_body, dict):
                    continue
                rd = rel_body.get("data")
                resolved = _resolve_jsonapi_ref(rd, included)
                if isinstance(resolved, list):
                    for it in resolved:
                        if isinstance(it, dict):
                            row = _hyperlink_from_obj(it)
                            if row and row["uri"] not in seen:
                                seen.add(row["uri"])
                                out.append(row)
                elif isinstance(resolved, dict):
                    row = _hyperlink_from_obj(resolved)
                    if row and row["uri"] not in seen:
                        seen.add(row["uri"])
                        out.append(row)
    return out


def flatten_polarion_workitem_response(obj: Any) -> dict[str, Any]:
    """JSON:API workitem 상세 — attributes + relationships(dev 등) + hyperlinks."""
    if not isinstance(obj, dict):
        return flatten_workitem(obj)
    if "data" not in obj:
        return flatten_workitem(obj)

    included_index = _jsonapi_included_index(obj)
    data = obj.get("data")
    if isinstance(data, list):
        data = data[0] if data else {}
    if not isinstance(data, dict):
        return flatten_workitem(obj)

    flat = flatten_workitem(data)
    attrs = data.get("attributes")
    if isinstance(attrs, dict):
        flat = {**flat, **attrs}
    rels = data.get("relationships")
    if isinstance(rels, dict):
        for rel_name, rel_body in rels.items():
            if not isinstance(rel_body, dict):
                continue
            rd = rel_body.get("data")
            if rd is None:
                continue
            resolved = _resolve_jsonapi_ref(rd, included_index)
            if resolved is not None:
                flat[rel_name] = resolved
    hyperlinks = _collect_hyperlinks_from_document(obj, included_index)
    if hyperlinks:
        flat["_hyperlinks"] = hyperlinks
    return flat


async def fetch_detail(self_url: str) -> dict[str, Any]:
    """workitem 상세 조회 (self link 사용)."""
    include = "dev,author,assignee,hyperlinks"
    if "?" in self_url:
        url = f"{self_url}&include={include}"
    else:
        url = f"{self_url}?include={include}"
    try:
        resp = await _get_with_retry(url)
        return flatten_polarion_workitem_response(resp.json())
    except Exception:
        resp = await _get_with_retry(self_url)
        return flatten_polarion_workitem_response(resp.json())


_WRAPPER_KEYS = ("data", "workitem", "workItem", "workitems", "workItems", "attributes", "fields")


def flatten_workitem(obj: Any, _depth: int = 0) -> dict[str, Any]:
    """
    Polarion 응답의 감싸는 층({"data": [{"workitem": {...}}]}, attributes 등)을 벗겨
    한 단계 dict로 합친다. 안쪽 값이 바깥 값을 덮어쓴다.
    """
    if _depth > 6:
        return {}
    if isinstance(obj, list):
        return flatten_workitem(obj[0], _depth + 1) if obj else {}
    if not isinstance(obj, dict):
        return {}
    flat = {k: v for k, v in obj.items() if k not in _WRAPPER_KEYS}
    for key in _WRAPPER_KEYS:
        inner = obj.get(key)
        if isinstance(inner, (dict, list)) and inner:
            flat.update(flatten_workitem(inner, _depth + 1))
    return flat


def _last_segment(url: str) -> str:
    return url.rstrip("/").rsplit("/", 1)[-1] if url else ""


def workitem_id(attrs: dict[str, Any], row: dict[str, Any] | None = None) -> str:
    for key in ("id", "workitemId", "workItemId", "workitem_id", "key"):
        val = _safe_text(attrs, key)
        if val:
            return val
    for src in (attrs, row or {}):
        uri = src.get("uri") or (src.get("links") or {}).get("self", "")
        if isinstance(uri, str) and uri:
            return _last_segment(uri)
    return ""


def normalize_workitem(attrs: dict[str, Any], location: str = "") -> dict[str, Any]:
    """Polarion workitem 속성을 대시보드용 flat dict로 정규화."""
    item_id = workitem_id(attrs)
    title = (
        _safe_text(attrs, "title")
        or _safe_text(attrs, "summary")
        or _safe_text(attrs, "name")
        or item_id
    )

    tc_package = attrs.get("TCPackage")
    test_class = attrs.get("TestClass")
    test_item = attrs.get("TestItem")
    issue_type_raw = attrs.get("IssueType")
    defect_cat_raw = attrs.get("defectCategory")

    return {
        "id": item_id,
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


_PLAIN_VALUE = re.compile(r"^[A-Za-z0-9_.\-]+$")


def _quote_polarion_value(value: str) -> str:
    """영문/숫자/_.- 만 있으면 그대로, 공백·[]() 등이 있으면 따옴표로 감싼다."""
    if _PLAIN_VALUE.match(value):
        return value
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
    Polarion 검색 query 조합. Polarion 링크와 같은 형태:
      created:[F TO T] AND eventSequence.KEY:N AND (project_name:"A" OR project_name:B)
    - project_name: OR, eventSequence(1~5차) / created: AND, ALL이면 차수 조건 없음
    """
    parts: list[str] = []

    from_d = to_polarion_date(created_from)
    to_d = to_polarion_date(created_to)
    if from_d and to_d:
        parts.append(f"created:[{from_d} TO {to_d}]")
    elif from_d:
        parts.append(f"created:[{from_d} TO *]")
    elif to_d:
        parts.append(f"created:[* TO {to_d}]")

    seq = (event_sequence or "").strip()
    if seq and seq.upper() != "ALL":
        parts.append(f"eventSequence.KEY:{seq}")

    names = normalize_project_names(project_name)
    if names:
        clauses = [f"project_name:{_quote_polarion_value(name)}" for name in names]
        parts.append(clauses[0] if len(clauses) == 1 else f"({' OR '.join(clauses)})")

    if model_name:
        parts.append(f"model_name:{_quote_polarion_value(model_name)}")

    return " AND ".join(parts) if parts else "type:testDefect"


def _row_attrs(row: dict[str, Any]) -> dict[str, Any]:
    return flatten_workitem(row)


async def _fetch_detail_batch(self_urls: list[str]) -> list[dict[str, Any] | None]:
    """여러 workitem 상세를 동시 조회. 실패한 항목은 None (순서 유지)."""
    sem = asyncio.Semaphore(CONCURRENT_DETAIL)

    async def _get(url: str) -> dict[str, Any] | None:
        if not url:
            return None
        async with sem:
            try:
                return await fetch_detail(url)
            except Exception:
                return None

    return list(await asyncio.gather(*[_get(url) for url in self_urls]))


async def fetch_all_defects_with_stats(
    project_name: str | list[str] = "",
    event_sequence: str = "",
    model_name: str = "",
    created_from: str = "",
    created_to: str = "",
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """
    목록 조회 → 상세 동시 조회 → 정규화.
    상세가 없거나 실패하면 목록 row 속성으로 대체한다.
    """
    query = build_query(
        project_name=project_name,
        event_sequence=event_sequence,
        model_name=model_name,
        created_from=created_from,
        created_to=created_to,
    )

    all_rows: list[dict] = []
    polarion_total = 0
    for page in range(1, MAX_PAGES + 1):
        rows, total = await fetch_list_page(page=page, query=query)
        polarion_total = max(polarion_total, total or 0)
        if not rows:
            break
        all_rows.extend(rows)
        if len(all_rows) >= total:
            break

    self_urls = [(row.get("links") or {}).get("self", "") for row in all_rows]
    details = await _fetch_detail_batch(self_urls)

    results: list[dict[str, Any]] = []
    detail_ok = 0
    sample_keys: list[str] = []
    for idx, (row, detail) in enumerate(zip(all_rows, details)):
        attrs = _row_attrs(row)
        if detail:
            detail_ok += 1
            attrs = {**attrs, **detail}
        if not sample_keys:
            sample_keys = sorted(attrs.keys())[:60]
        item = normalize_workitem(attrs, str(row.get("location", "") or ""))
        if not item.get("id"):
            item["id"] = workitem_id(attrs, row) or f"row-{idx + 1}"
        results.append(item)

    stats = {
        "polarionTotal": polarion_total,
        "listed": len(all_rows),
        "detailOk": detail_ok,
        "normalized": len(results),
        "sampleKeys": sample_keys,
    }
    return results, stats


async def fetch_all_defects(
    project_name: str | list[str] = "",
    event_sequence: str = "",
    model_name: str = "",
    created_from: str = "",
    created_to: str = "",
) -> list[dict[str, Any]]:
    results, _ = await fetch_all_defects_with_stats(
        project_name=project_name,
        event_sequence=event_sequence,
        model_name=model_name,
        created_from=created_from,
        created_to=created_to,
    )
    return results
