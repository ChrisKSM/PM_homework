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
CONCURRENT_DETAIL = 2
DETAIL_BATCH_STAGGER_SEC = 0.25
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


# getWorkItem(s) 기본 sparse fieldset 은 updated / hyperlinks / custom field 를 빼고 돌려줌
WORKITEM_LIST_FIELD_PARAMS: dict[str, str] = {
    "fields[workitems]": "@all",
    "fields[users]": "@all",
    "include": "assignee",
}
WORKITEM_DETAIL_FIELD_PARAMS: dict[str, str] = {
    "fields[workitems]": "@all",
    "fields[users]": "@all",
    "fields[workitem_comments]": "@all",
    "include": "assignee,author,comments",
}
# fields/include 를 400 으로 거절한 목록 endpoint — 이후 기본 파라미터만 사용
_LIST_FIELD_PARAMS_REJECTED: set[str] = set()


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


def _unwrap_ootb_workitem(
    row: dict[str, Any],
    included: dict[tuple[str, str], dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Polarion rest/v1 JSON:API → flat row (attributes + id + links + relationships)."""
    if "attributes" in row and isinstance(row.get("attributes"), dict):
        flat = dict(row["attributes"])
        if row.get("id") and not flat.get("id"):
            flat["id"] = row["id"]
        if row.get("links"):
            flat["links"] = row["links"]
        rels = row.get("relationships")
        if isinstance(rels, dict):
            for rel_name in ("assignee", "author"):
                rel_body = rels.get(rel_name)
                if not isinstance(rel_body, dict) or rel_name in flat:
                    continue
                rd = rel_body.get("data")
                if rd:
                    flat[rel_name] = _resolve_jsonapi_ref(rd, included or {})
        raw_hls = flat.get("hyperlinks")
        hyperlinks = [
            h
            for h in (
                _hyperlink_from_obj(it)
                for it in (raw_hls if isinstance(raw_hls, list) else [])
                if isinstance(it, dict)
            )
            if h
        ]
        if hyperlinks and not flat.get("_hyperlinks"):
            flat["_hyperlinks"] = hyperlinks
        return flat
    return row


def _parse_polarion_list_page(data: Any) -> tuple[list[dict[str, Any]], int]:
    """Polarion rest/v1 (JSON:API) · customs list JSON → (workitems, totalCount)."""
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        raw_list = data["data"]
        if raw_list and isinstance(raw_list[0], dict) and (
            "attributes" in raw_list[0] or raw_list[0].get("type") == "workitems"
        ):
            included = _jsonapi_included_index(data)
            workitems = [
                _unwrap_ootb_workitem(it, included) for it in raw_list if isinstance(it, dict)
            ]
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
    url = _list_endpoint(project_key, list_path=list_path)
    if _is_ootb_rest_v1() and url not in _LIST_FIELD_PARAMS_REJECTED:
        try:
            resp = await _get_with_retry(url, params={**params, **WORKITEM_LIST_FIELD_PARAMS})
            return _parse_polarion_list_page(resp.json())
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 400:
                raise
            _LIST_FIELD_PARAMS_REJECTED.add(url)
    resp = await _get_with_retry(url, params=params)
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
    comments_text = format_jsonapi_workitem_comments(obj)
    if comments_text:
        flat["_commentsText"] = comments_text
    return flat


def _html_to_text(raw: str) -> str:
    s = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>", "\n", raw or "")
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s.strip()


def _comment_body_text(val: Any) -> str:
    if isinstance(val, dict):
        body = str(val.get("value") or "")
        if str(val.get("type") or "").lower() == "text/html":
            return _html_to_text(body)
        return body.strip()
    return str(val or "").strip()


def _jsonapi_user_label(ref: Any, included: dict[tuple[str, str], dict[str, Any]]) -> str:
    if not isinstance(ref, dict):
        return ""
    resolved = _resolve_jsonapi_ref(ref, included)
    if isinstance(resolved, dict):
        name = str(resolved.get("name") or "").strip()
        if name:
            return name
    return str(ref.get("id") or "").strip()


def _workitem_comment_refs(doc: Any) -> list[Any]:
    if not isinstance(doc, dict):
        return []
    data = doc.get("data")
    if isinstance(data, list):
        data = data[0] if data else {}
    if not isinstance(data, dict):
        return []
    rel = (data.get("relationships") or {}).get("comments")
    if isinstance(rel, dict) and isinstance(rel.get("data"), list):
        return rel["data"]
    return []


def format_jsonapi_workitem_comments(doc: Any) -> str:
    """workitem_comments (include=comments 또는 /comments 응답) → 모달 표시용 텍스트."""
    if not isinstance(doc, dict):
        return ""
    included = _jsonapi_included_index(doc)
    comments: list[dict[str, Any]] = []
    data = doc.get("data")
    if isinstance(data, list) and all(
        isinstance(it, dict) and it.get("type") == "workitem_comments" for it in data
    ):
        comments = list(data)
    else:
        for ref in _workitem_comment_refs(doc):
            if not isinstance(ref, dict):
                continue
            inc = included.get((str(ref.get("type") or ""), str(ref.get("id") or "")))
            if inc:
                comments.append(inc)
    rows: list[tuple[str, str]] = []
    for c in comments:
        attrs = c.get("attributes") if isinstance(c.get("attributes"), dict) else {}
        text = _comment_body_text(attrs.get("text"))
        if not text:
            continue
        created = str(attrs.get("created") or "").replace("T", " ").replace("Z", "")[:16]
        author_rel = (c.get("relationships") or {}).get("author")
        author = ""
        if isinstance(author_rel, dict):
            author = _jsonapi_user_label(author_rel.get("data"), included)
        head = " · ".join(p for p in (created, author) if p)
        title = str(attrs.get("title") or "").strip()
        if title:
            head = f"{head} — {title}" if head else title
        rows.append((created, f"[{head}]\n{text}" if head else text))
    rows.sort(key=lambda r: r[0])
    return "\n\n".join(r[1] for r in rows)


def _user_ref_has_name(val: Any) -> bool:
    if isinstance(val, dict):
        return bool(str(val.get("name") or val.get("displayName") or "").strip())
    return bool(str(val or "").strip())


def _parse_external_link_payload(data: Any) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    items: list[Any] = []
    if isinstance(data, dict):
        for key in ("data", "linkedWorkItems", "linkedworkitems", "hyperlinks", "links", "items"):
            raw = data.get(key)
            if isinstance(raw, list):
                items = raw
                break
        if not items and isinstance(data.get("data"), dict):
            items = [data["data"]]
    elif isinstance(data, list):
        items = data
    for it in items:
        if not isinstance(it, dict):
            continue
        row = _hyperlink_from_obj(it)
        if row:
            out.append(row)
    return out


async def _follow_relationship_related(doc: dict[str, Any], flat: dict[str, Any]) -> dict[str, Any]:
    data = doc.get("data")
    if isinstance(data, list):
        data = data[0] if data else {}
    if not isinstance(data, dict):
        return flat
    rels = data.get("relationships") or {}
    if not isinstance(rels, dict):
        return flat
    for rel_name, rel_body in rels.items():
        if not isinstance(rel_body, dict):
            continue
        if _user_ref_has_name(flat.get(rel_name)):
            continue
        related = (rel_body.get("links") or {}).get("related")
        if not isinstance(related, str) or not related.strip():
            rd = rel_body.get("data")
            resolved = _resolve_jsonapi_ref(rd, _jsonapi_included_index(doc))
            if resolved is not None:
                flat[rel_name] = resolved
            continue
        try:
            resp = await _get_with_retry(related.strip())
            body = resp.json()
            sub = flatten_polarion_workitem_response(body)
            if not sub:
                sub = flatten_workitem(body)
            if sub:
                flat[rel_name] = sub
        except Exception:
            continue
    return flat


def _customs_rest_base() -> str:
    u = _base_url()
    if "/rest/v1" in u:
        return u.replace("/polarion/rest/v1", "/polarion/restful/customs/v1")
    return u


def _deep_merge_leaf_keys(obj: Any, out: dict[str, Any], prefix: str = "", depth: int = 0) -> None:
    if depth > 12:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("links",) and depth <= 1:
                continue
            pk = f"{prefix}.{k}" if prefix else str(k)
            if isinstance(v, (dict, list)):
                _deep_merge_leaf_keys(v, out, pk, depth + 1)
            elif v is not None and str(v).strip():
                out[pk] = v
                out[str(k)] = v
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            _deep_merge_leaf_keys(v, out, f"{prefix}[{i}]", depth + 1)


def _merge_richer_flat(base: dict[str, Any], extra: dict[str, Any]) -> dict[str, Any]:
    if not extra:
        return base
    if not base:
        return dict(extra)
    return {**base, **extra}


async def _try_customs_workitem_flat(project_key: str, workitem_id: str) -> dict[str, Any]:
    url = f"{_customs_rest_base()}/projects/{project_key}/workitems/{workitem_id}"
    try:
        resp = await _get_with_retry(url)
        data = resp.json()
        flat = flatten_workitem(data)
        _deep_merge_leaf_keys(data, flat)
        return flat
    except Exception:
        return {}


def _flat_has_min_prd_fields(flat: dict[str, Any]) -> bool:
    if flat.get("updated") or flat.get("Updated"):
        return True
    for k in ("dev", "assignee", "author"):
        if _user_ref_has_name(flat.get(k)):
            return True
    if flat.get("_hyperlinks"):
        return True
    return len(flat) >= 16


async def fetch_detail_light(self_url: str) -> dict[str, Any]:
    """목록 배치용 — HTTP 1~2회 (429 방지)."""
    base = self_url.split("?")[0]
    doc: dict[str, Any] | None = None
    for params in (WORKITEM_LIST_FIELD_PARAMS, None):
        try:
            resp = await _get_with_retry(base, params=params)
            doc = resp.json()
            break
        except Exception:
            doc = None
    if doc is None:
        resp = await _get_with_retry(base)
        doc = resp.json()
    flat = flatten_polarion_workitem_response(doc)
    flat = await _follow_relationship_related(doc, flat)
    import urllib.parse

    m = re.search(r"/projects/([^/]+)/workitems/([^/?]+)", base)
    proj = urllib.parse.unquote(m.group(1)) if m else ""
    wid_guess = urllib.parse.unquote(m.group(2)) if m else ""
    _pin_jsonapi_workitem_identity(flat, doc, wid_guess, project_key=proj)
    return flat


async def fetch_workitem_enriched(
    project_key: str,
    workitem_id: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """단건 모달용 — 제한적 추가 조회 (customs/sidecar)."""
    wid = normalize_polarion_workitem_id((workitem_id or "").strip(), project_key=project_key)
    debug: dict[str, Any] = {"attempts": []}
    base = f"{_base_url()}/projects/{project_key}/workitems/{wid}"
    flat: dict[str, Any] = {}
    doc: dict[str, Any] | None = None
    variants: tuple[dict[str, str] | None, ...] = (
        WORKITEM_DETAIL_FIELD_PARAMS,
        {"fields[workitems]": "@all"},
        None,
    )
    for params in variants:
        label = "&".join(f"{k}={v}" for k, v in (params or {}).items())
        try:
            resp = await _get_with_retry(base, params=params)
            doc = resp.json()
            part = flatten_polarion_workitem_response(doc)
            _deep_merge_leaf_keys(doc.get("data") if isinstance(doc, dict) else doc, part)
            part = await _follow_relationship_related(doc, part)
            flat = _merge_richer_flat(flat, part)
            debug["attempts"].append({"url": base, "params": label, "ok": True, "keys": len(part)})
            if _flat_has_min_prd_fields(flat):
                break
        except Exception as exc:
            debug["attempts"].append(
                {"url": base, "params": label, "ok": False, "error": str(exc)[:120]}
            )
    if doc and not _flat_has_min_prd_fields(flat):
        flat = await _follow_relationship_related(doc, flat)

    if doc and not flat.get("_commentsText") and _workitem_comment_refs(doc):
        try:
            resp = await _get_with_retry(
                f"{base}/comments",
                params={"fields[workitem_comments]": "@all", "include": "author"},
            )
            text = format_jsonapi_workitem_comments(resp.json())
            if text:
                flat["_commentsText"] = text
            debug["commentsEndpoint"] = bool(text)
        except Exception as exc:
            debug["commentsEndpoint"] = f"error: {str(exc)[:120]}"

    if not flat.get("_hyperlinks"):
        await asyncio.sleep(DETAIL_BATCH_STAGGER_SEC)
        flat = await _try_merge_polarion_hyperlinks(
            base,
            flat,
            suffixes=("linkedworkitems", "hyperlinks"),
        )

    if not _flat_has_min_prd_fields(flat) and len(flat) < 12:
        await asyncio.sleep(DETAIL_BATCH_STAGGER_SEC)
        customs = await _try_customs_workitem_flat(project_key, wid)
        if customs:
            flat = _merge_richer_flat(flat, customs)
            debug["customsOk"] = True
            debug["customsKeys"] = len(customs)
        else:
            debug["customsOk"] = False
    else:
        debug["customsOk"] = False
        debug["customsSkipped"] = True

    if doc:
        _pin_jsonapi_workitem_identity(flat, doc, wid, project_key=project_key)
    debug["flatKeyCount"] = len(flat)
    return flat, debug


async def _try_merge_polarion_hyperlinks(
    self_url: str,
    flat: dict[str, Any],
    *,
    suffixes: tuple[str, ...] | None = None,
) -> dict[str, Any]:
    import urllib.parse

    m = re.search(r"/projects/([^/]+)/workitems/([^/?]+)", self_url)
    if not m:
        return flat
    proj = urllib.parse.unquote(m.group(1))
    wid = urllib.parse.unquote(m.group(2))
    hls: list[dict[str, str]] = list(flat.get("_hyperlinks") or [])
    seen = {h.get("uri") for h in hls if isinstance(h, dict)}
    path_suffixes = suffixes or (
        "linkedworkitems",
        "linkedWorkItems",
        "hyperlinks",
    )
    for suffix in path_suffixes:
        ep = f"{_base_url()}/projects/{proj}/workitems/{wid}/{suffix}"
        try:
            resp = await _get_with_retry(ep)
            for row in _parse_external_link_payload(resp.json()):
                if row.get("uri") and row["uri"] not in seen:
                    seen.add(row["uri"])
                    hls.append(row)
        except Exception:
            continue
    if hls:
        flat["_hyperlinks"] = hls
    return flat


async def fetch_detail(self_url: str) -> dict[str, Any]:
    """workitem 상세 — 배치 호환(light). 모달은 fetch_workitem_enriched 사용."""
    return await fetch_detail_light(self_url)


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


_WORKITEM_ID_RE = re.compile(r"^[A-Za-z]{2,}-\d+", re.ASCII)


def _looks_like_workitem_id(val: str) -> bool:
    return bool(_WORKITEM_ID_RE.match((val or "").strip()))


def normalize_polarion_workitem_id(raw: str, *, project_key: str = "") -> str:
    """Polarion 복합 id (PROJECT/AVRM-123) → AVRM-123."""
    s = (raw or "").strip()
    if not s:
        return ""
    if "/" in s:
        left, right = s.rsplit("/", 1)
        right = right.strip()
        if right and (_looks_like_workitem_id(right) or (project_key and left == project_key)):
            return right
    return s


def _workitem_id_score(val: str, *, project_key: str = "") -> int:
    canon = normalize_polarion_workitem_id(val, project_key=project_key)
    if not canon:
        return -1
    if _looks_like_workitem_id(canon):
        return 30
    if project_key and canon == project_key:
        return 0
    if "/" in val:
        return 5
    return 10


def _collect_workitem_id_candidates(
    attrs: dict[str, Any],
    row: dict[str, Any] | None,
) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()

    def add(raw: Any) -> None:
        s = str(raw or "").strip()
        if s and s not in seen:
            seen.add(s)
            out.append(s)

    if row:
        add(row.get("id"))
    for key in (
        "attributes.id",
        "id",
        "workitemId",
        "workItemId",
        "workitem_id",
        "key",
    ):
        add(_safe_text(attrs, key))
    for src in (attrs, row or {}):
        if not isinstance(src, dict):
            continue
        links = src.get("links")
        uri = src.get("uri")
        if isinstance(links, dict):
            uri = uri or links.get("self") or links.get("Self")
        if isinstance(uri, str) and uri.strip():
            m = re.search(r"/workitems/([^/?]+)", uri)
            if m:
                import urllib.parse

                add(urllib.parse.unquote(m.group(1)))
            else:
                add(_last_segment(uri))
    return out


def _pin_jsonapi_workitem_identity(
    flat: dict[str, Any],
    doc: dict[str, Any] | None,
    fallback_wid: str,
    *,
    project_key: str = "",
) -> None:
    """deep_merge가 project.id 로 flat[id]를 덮어쓴 뒤 workitem id/type 복원."""
    if not isinstance(flat, dict):
        return
    wid = normalize_polarion_workitem_id(fallback_wid, project_key=project_key)
    wi_type: Any = None
    if isinstance(doc, dict):
        data = doc.get("data")
        if isinstance(data, list):
            data = data[0] if data else {}
        if isinstance(data, dict):
            if data.get("type") not in (None, "projects", "project"):
                wi_type = data.get("type")
            tid = normalize_polarion_workitem_id(str(data.get("id") or ""), project_key=project_key)
            if _looks_like_workitem_id(tid):
                wid = tid
            attrs = data.get("attributes")
            if isinstance(attrs, dict):
                aid = normalize_polarion_workitem_id(str(attrs.get("id") or ""), project_key=project_key)
                if _looks_like_workitem_id(aid):
                    wid = aid
                if attrs.get("type"):
                    wi_type = attrs.get("type")
    if wid:
        flat["id"] = wid
    if wi_type and str(wi_type).lower() not in ("projects", "project"):
        flat["type"] = wi_type


def workitem_id(attrs: dict[str, Any], row: dict[str, Any] | None = None) -> str:
    project_key = ""
    if row and isinstance(row, dict):
        project_key = str(row.get("projectKey") or row.get("project") or "").strip()
        if isinstance(row.get("project"), dict):
            project_key = project_key or str(row["project"].get("id") or "").strip()
    best = ""
    best_score = -1
    for cand in _collect_workitem_id_candidates(attrs, row):
        canon = normalize_polarion_workitem_id(cand, project_key=project_key)
        score = _workitem_id_score(cand, project_key=project_key)
        if score > best_score and canon:
            best_score = score
            best = canon
    return best


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

    async def _get(url: str, idx: int) -> dict[str, Any] | None:
        if not url:
            return None
        if idx > 0:
            await asyncio.sleep(DETAIL_BATCH_STAGGER_SEC * min(idx, 4))
        async with sem:
            try:
                return await fetch_detail_light(url)
            except Exception:
                return None

    return list(await asyncio.gather(*[_get(url, i) for i, url in enumerate(self_urls)]))


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
