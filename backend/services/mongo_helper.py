"""MongoDB direct connection — pymongo (모델 현황 저장)."""
from __future__ import annotations

import logging
import os
from typing import Any
from urllib.parse import quote_plus

from pymongo import MongoClient
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


def _mongo_db_name() -> str:
    return os.getenv("MONGO_DB", "dify-mv-audiojdmtask")


def _mongo_uri() -> str:
    uri = os.getenv("MONGO_URI", "").strip()
    if uri:
        if uri.startswith("http://"):
            uri = "mongodb://" + uri[len("http://") :]
        elif uri.startswith("https://"):
            uri = "mongodb://" + uri[len("https://") :]
        return uri

    host = os.getenv("MONGO_HOST", "dify-mv-audiojdmtask-milvus.milvus.svc")
    port = os.getenv("MONGO_PORT", "27017")
    user = os.getenv("MONGO_USER", "")
    password = os.getenv("MONGO_PASSWORD", "")
    db = _mongo_db_name()

    if user and password:
        return (
            f"mongodb://{quote_plus(user)}:{quote_plus(password)}"
            f"@{host}:{port}/{db}?authSource=admin"
        )
    return f"mongodb://{host}:{port}/{db}"


def _safe_uri_for_log() -> str:
    """비밀번호 마스킹된 URI."""
    uri = _mongo_uri()
    if "@" in uri and "://" in uri:
        prefix, rest = uri.split("://", 1)
        if "@" in rest:
            creds, hostpart = rest.rsplit("@", 1)
            if ":" in creds:
                user = creds.split(":", 1)[0]
                return f"{prefix}://{user}:****@{hostpart}"
    return uri


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(_mongo_uri(), serverSelectionTimeoutMS=10000)
    return _client


def get_db():
    return get_client()[_mongo_db_name()]


def _col(name: str):
    return get_db()[name]


def list_collections() -> list[str]:
    try:
        return get_db().list_collection_names()
    except PyMongoError as exc:
        logger.error("list_collections failed: %s", exc)
        return []


def create_collection(name: str) -> bool:
    try:
        if name not in list_collections():
            get_db().create_collection(name)
        return True
    except PyMongoError as exc:
        logger.error("create_collection failed: %s", exc)
        return False


def ensure_collection(name: str) -> bool:
    return create_collection(name)


def get_all_documents(collection: str, use_cache: bool = False) -> list[dict]:
    del use_cache  # direct MongoDB — cache 없음
    try:
        docs: list[dict] = []
        for doc in _col(collection).find({}):
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs
    except PyMongoError as exc:
        logger.error("get_all_documents failed: %s", exc)
        return []


def insert_documents(collection: str, documents: list[dict]) -> bool:
    if not documents:
        return True
    try:
        payload = [{k: v for k, v in doc.items() if k != "_id"} for doc in documents]
        _col(collection).insert_many(payload, ordered=True)
        return True
    except PyMongoError as exc:
        logger.error("insert_documents failed: %s", exc)
        return False


def update_document(collection: str, doc_id: str, updates: dict) -> bool:
    try:
        from bson import ObjectId

        filt: dict[str, Any]
        try:
            filt = {"_id": ObjectId(doc_id)}
        except Exception:
            filt = {"_id": doc_id}
        clean = {k: v for k, v in updates.items() if k != "_id"}
        result = _col(collection).update_one(filt, {"$set": clean})
        return result.matched_count > 0
    except PyMongoError as exc:
        logger.error("update_document failed: %s", exc)
        return False


def delete_all_documents(collection: str) -> bool:
    try:
        _col(collection).delete_many({})
        return True
    except PyMongoError as exc:
        logger.error("delete_all_documents failed: %s", exc)
        return False


def diagnose(collection: str = "model_schedule_data") -> dict[str, Any]:
    """MongoDB 직접 연결 진단."""
    result: dict[str, Any] = {
        "mode": "direct",
        "uri": _safe_uri_for_log(),
        "db": _mongo_db_name(),
        "collection": collection,
        "steps": [],
    }

    def step(name: str, ok: bool, detail: Any = None) -> None:
        entry: dict[str, Any] = {"name": name, "ok": ok}
        if detail is not None:
            entry["detail"] = detail
        result["steps"].append(entry)

    try:
        client = get_client()
        ping = client.admin.command("ping")
        step("ping", ping.get("ok", 1) == 1, ping)

        names = list_collections()
        step("list_collections", True, names)
        result["collections"] = names
        result["collection_exists"] = collection in names

        if collection not in names:
            ok = create_collection(collection)
            step("create_collection", ok)
            result["collection_exists"] = collection in list_collections()

        count = _col(collection).count_documents({})
        step("count_documents", True, count)
        result["document_count"] = count
        result["ok"] = all(s["ok"] for s in result["steps"])
    except PyMongoError as exc:
        step("connection", False, str(exc))
        result["ok"] = False
        result["error"] = str(exc)
    except Exception as exc:
        step("connection", False, str(exc))
        result["ok"] = False
        result["error"] = str(exc)

    return result


def upsert_by_key(collection: str, key_field: str, documents: list[dict]) -> int:
    if not documents:
        return 0
    updated = 0
    try:
        col = _col(collection)
        for doc in documents:
            key_val = doc.get(key_field)
            if not key_val:
                continue
            clean = {k: v for k, v in doc.items() if k != "_id"}
            result = col.update_one({key_field: key_val}, {"$set": clean}, upsert=True)
            if result.modified_count or result.upserted_id:
                updated += 1
        return updated
    except PyMongoError as exc:
        logger.error("upsert_by_key failed: %s", exc)
        return 0
