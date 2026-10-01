"""MongoDB REST API helper — delivery-portal-db-watcher wrapper."""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

MONGO_API_BASE = os.getenv(
    "MONGO_API_BASE",
    "https://delivery-portal-db-watcher.apps.hedej.lge.com",
)
MONGO_API_TOKEN = os.getenv("MONGO_API_TOKEN", "")

MAX_RETRIES = 3
RETRY_DELAY = 1


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {MONGO_API_TOKEN}",
        "Content-Type": "application/json",
    }


def _request(method: str, url: str, **kwargs) -> requests.Response | None:
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.request(
                method, url, headers=_headers(), timeout=30, **kwargs
            )
            if resp.status_code < 500:
                return resp
            logger.warning("MongoDB API %s %s -> %s, retry %s/%s", method, url, resp.status_code, attempt + 1, MAX_RETRIES)
        except requests.RequestException as exc:
            logger.warning("MongoDB API request failed: %s, retry %s/%s", exc, attempt + 1, MAX_RETRIES)
        if attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_DELAY * (attempt + 1))
    return None


def _extract_data(resp_json: Any) -> Any:
    if isinstance(resp_json, dict) and "data" in resp_json:
        return resp_json["data"]
    return resp_json


def _normalize_collection_names(data: Any) -> list[str]:
    if not isinstance(data, list):
        return []
    names: list[str] = []
    for item in data:
        if isinstance(item, str):
            names.append(item)
        elif isinstance(item, dict):
            for key in ("collection_name", "name", "collection"):
                if item.get(key):
                    names.append(str(item[key]))
                    break
    return names


def list_collections() -> list[str]:
    resp = _request("GET", f"{MONGO_API_BASE}/api/mongo-collections/")
    if resp and resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            return _normalize_collection_names(data)
        if isinstance(data, dict):
            inner = data.get("data", data.get("collections", []))
            return _normalize_collection_names(inner)
    return []


def create_collection(name: str) -> bool:
    resp = _request("POST", f"{MONGO_API_BASE}/api/mongo-collections/", json={"collection_name": name})
    return bool(resp and resp.status_code in (200, 201))


def ensure_collection(name: str) -> bool:
    if name in list_collections(): return True
    return create_collection(name)


def get_all_documents(collection: str, use_cache: bool = False) -> list[dict]:
    params = {"use_cache": str(use_cache).lower()}
    resp = _request("GET", f"{MONGO_API_BASE}/api/mongo-documents/{collection}/", params=params)
    if resp and resp.status_code == 200:
        result = _extract_data(resp.json())
        return result if isinstance(result, list) else []
    return []


def insert_documents(collection: str, documents: list[dict]) -> bool:
    if not documents: return True
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        resp = _request("POST", f"{MONGO_API_BASE}/api/mongo-documents/{collection}/", json={"documents": batch})
        if not resp or resp.status_code not in (200, 201): return False
    return True


def update_document(collection: str, doc_id: str, updates: dict) -> bool:
    resp = _request("PATCH", f"{MONGO_API_BASE}/api/mongo-documents/{collection}/{doc_id}", json=updates)
    return bool(resp and resp.status_code == 200)


def delete_all_documents(collection: str) -> bool:
    resp = _request("DELETE", f"{MONGO_API_BASE}/api/mongo-documents/{collection}/documents/")
    return bool(resp and resp.status_code == 200)


def diagnose(collection: str = "model_schedule_data") -> dict[str, Any]:
    """MongoDB API 연결 상태 진단 — BE pod / curl /diagnose 용."""
    result: dict[str, Any] = {
        "mongo_api_base": MONGO_API_BASE,
        "token_configured": bool(MONGO_API_TOKEN),
        "collection": collection,
        "steps": [],
    }

    def step(name: str, resp: requests.Response | None) -> None:
        entry: dict[str, Any] = {"name": name}
        if resp is None:
            entry.update({"ok": False, "error": "request failed (network/timeout)"})
        else:
            body: Any
            try:
                body = resp.json()
            except Exception:
                body = (resp.text or "")[:500]
            entry.update({"ok": resp.status_code < 400, "status": resp.status_code, "body": body})
        result["steps"].append(entry)

    resp = _request("GET", f"{MONGO_API_BASE}/api/mongo-collections/")
    step("list_collections", resp)

    collections = list_collections()
    result["collections"] = collections
    result["collection_exists"] = collection in collections

    if collection not in collections:
        resp = _request(
            "POST",
            f"{MONGO_API_BASE}/api/mongo-collections/",
            json={"collection_name": collection},
        )
        step("create_collection", resp)
        result["collection_exists"] = collection in list_collections()

    resp = _request(
        "GET",
        f"{MONGO_API_BASE}/api/mongo-documents/{collection}/",
        params={"use_cache": "false"},
    )
    step("list_documents", resp)
    if resp and resp.status_code == 200:
        docs = _extract_data(resp.json())
        result["document_count"] = len(docs) if isinstance(docs, list) else 0

    result["ok"] = all(s.get("ok") for s in result["steps"])
    return result


def upsert_by_key(collection: str, key_field: str, documents: list[dict]) -> int:
    if not documents: return 0
    existing = get_all_documents(collection, use_cache=False)
    existing_map: dict[str, str] = {}
    for doc in existing:
        key = doc.get(key_field)
        doc_id = doc.get("_id")
        if key and doc_id: existing_map[key] = doc_id
    to_insert: list[dict] = []
    updated = 0
    for doc in documents:
        key_val = doc.get(key_field)
        if not key_val: continue
        if key_val in existing_map:
            if update_document(collection, existing_map[key_val], doc): updated += 1
        else:
            to_insert.append(doc)
    if to_insert and insert_documents(collection, to_insert): updated += len(to_insert)
    return updated
