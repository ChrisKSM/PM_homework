"""모델 현황 저장소 — Milvus (pymilvus) 직접 연결.

포털 DB 정보(host *.milvus.svc, port 19530)는 Milvus 벡터 DB입니다.
MongoDB(pymongo, 27017)가 아닙니다.
"""
from __future__ import annotations

import logging
import os
import re
from typing import Any
try:
    from pymilvus import DataType, MilvusClient
except ModuleNotFoundError as exc:
    if "pkg_resources" in str(exc):
        raise ModuleNotFoundError(
            "pkg_resources 없음 — BE venv에서: python -m pip install setuptools pymilvus"
        ) from exc
    raise

logger = logging.getLogger(__name__)

COLLECTION_VECTOR_DIM = 2
DUMMY_VECTOR = [0.0, 0.0]

_client: MilvusClient | None = None


def _host() -> str:
    return os.getenv("MILVUS_HOST") or os.getenv("MONGO_HOST", "dify-mv-audiojdmtask-milvus.milvus.svc")


def _port() -> str:
    return os.getenv("MILVUS_PORT") or os.getenv("MONGO_PORT", "19530")


def _user() -> str:
    return os.getenv("MILVUS_USER") or os.getenv("MONGO_USER", "")


def _password() -> str:
    return os.getenv("MILVUS_PASSWORD") or os.getenv("MONGO_PASSWORD", "")


def _db_name() -> str:
    return os.getenv("MILVUS_DB") or os.getenv("MONGO_DB", "dify-mv-audiojdmtask")


def _uri() -> str:
    custom = os.getenv("MILVUS_URI") or os.getenv("MONGO_URI", "").strip()
    if custom:
        if custom.startswith("mongodb://"):
            custom = "http://" + custom[len("mongodb://") :]
        elif custom.startswith("http://") or custom.startswith("https://"):
            pass
        else:
            custom = f"http://{custom}"
        return custom
    return f"http://{_host()}:{_port()}"


def _safe_uri_for_log() -> str:
    uri = _uri()
    user, password = _user(), _password()
    if user and password and "@" not in uri:
        return f"http://{user}:****@{_host()}:{_port()}"
    if user and "@" in uri:
        prefix, rest = uri.split("://", 1)
        if "@" in rest:
            creds, hostpart = rest.split("@", 1)
            u = creds.split(":", 1)[0]
            return f"{prefix}://{u}:****@{hostpart}"
    return uri


def _client_kwargs() -> dict[str, Any]:
    user, password = _user(), _password()
    kwargs: dict[str, Any] = {"uri": _uri()}
    if user and password:
        kwargs["token"] = f"{user}:{password}"
    return kwargs


def ensure_database() -> str:
    """Milvus database 없으면 생성 (default DB는 스킵)."""
    db = _db_name()
    if not db or db == "default":
        return "default"

    bootstrap = MilvusClient(**_client_kwargs())
    try:
        databases = bootstrap.list_databases()
        if db not in databases:
            bootstrap.create_database(db_name=db)
            logger.info("Created Milvus database: %s", db)
    finally:
        close = getattr(bootstrap, "close", None)
        if callable(close):
            close()

    return db


def get_client() -> MilvusClient:
    global _client
    if _client is None:
        db = ensure_database()
        kwargs = _client_kwargs()
        kwargs["db_name"] = db
        _client = MilvusClient(**kwargs)
    return _client


def list_collections() -> list[str]:
    try:
        return list(get_client().list_collections())
    except Exception as exc:
        logger.error("list_collections failed: %s", exc)
        return []


def _create_collection_schema(client: MilvusClient):
    schema = MilvusClient.create_schema(auto_id=False, enable_dynamic_field=False)
    schema.add_field("row_id", DataType.VARCHAR, is_primary=True, max_length=256)
    schema.add_field("payload", DataType.JSON)
    schema.add_field("_vec", DataType.FLOAT_VECTOR, dim=COLLECTION_VECTOR_DIM)
    index_params = client.prepare_index_params()
    index_params.add_index(field_name="_vec", index_type="FLAT", metric_type="L2")
    return schema, index_params


def create_collection(name: str) -> bool:
    try:
        client = get_client()
        if client.has_collection(name):
            return True
        schema, index_params = _create_collection_schema(client)
        client.create_collection(collection_name=name, schema=schema, index_params=index_params)
        return True
    except Exception as exc:
        logger.error("create_collection failed: %s", exc)
        return False


def ensure_collection(name: str) -> bool:
    return create_collection(name)


def get_all_documents(collection: str, use_cache: bool = False) -> list[dict]:
    del use_cache
    try:
        client = get_client()
        if not client.has_collection(collection):
            return []
        rows = client.query(
            collection_name=collection,
            filter='row_id != ""',
            output_fields=["payload"],
            limit=10000,
        )
        docs: list[dict] = []
        for row in rows:
            payload = row.get("payload")
            if isinstance(payload, dict):
                docs.append(payload)
        return docs
    except Exception as exc:
        logger.error("get_all_documents failed: %s", exc)
        return []


def insert_documents(collection: str, documents: list[dict]) -> bool:
    if not documents:
        return True
    try:
        if not ensure_collection(collection):
            return False
        client = get_client()
        batch: list[dict[str, Any]] = []
        for doc in documents:
            row_id = str(doc.get("id") or doc.get("row_id") or "").strip()
            if not row_id:
                continue
            payload = {k: v for k, v in doc.items() if k != "_id"}
            batch.append({"row_id": row_id, "payload": payload, "_vec": DUMMY_VECTOR})
        if not batch:
            return True
        client.insert(collection_name=collection, data=batch)
        return True
    except Exception as exc:
        logger.error("insert_documents failed: %s", exc)
        return False


def update_document(collection: str, doc_id: str, updates: dict) -> bool:
    try:
        client = get_client()
        if not client.has_collection(collection):
            return False
        rows = client.query(
            collection_name=collection,
            filter=f'row_id == "{doc_id}"',
            output_fields=["payload"],
            limit=1,
        )
        if not rows:
            return False
        payload = rows[0].get("payload") or {}
        if not isinstance(payload, dict):
            payload = {}
        payload.update({k: v for k, v in updates.items() if k != "_id"})
        client.delete(collection_name=collection, filter=f'row_id == "{doc_id}"')
        client.insert(
            collection_name=collection,
            data=[{"row_id": doc_id, "payload": payload, "_vec": DUMMY_VECTOR}],
        )
        return True
    except Exception as exc:
        logger.error("update_document failed: %s", exc)
        return False


def delete_all_documents(collection: str) -> bool:
    try:
        client = get_client()
        if not client.has_collection(collection):
            return True
        client.delete(collection_name=collection, filter='row_id != ""')
        return True
    except Exception as exc:
        logger.error("delete_all_documents failed: %s", exc)
        return False


def diagnose(collection: str = "model_schedule_data") -> dict[str, Any]:
    result: dict[str, Any] = {
        "mode": "milvus",
        "uri": _safe_uri_for_log(),
        "db": _db_name(),
        "port": _port(),
        "collection": collection,
        "steps": [],
    }

    def step(name: str, ok: bool, detail: Any = None) -> None:
        entry: dict[str, Any] = {"name": name, "ok": ok}
        if detail is not None:
            entry["detail"] = detail
        result["steps"].append(entry)

    try:
        db = ensure_database()
        step("ensure_database", True, db)

        client = get_client()
        step("connect", True, {"uri": _safe_uri_for_log(), "db": db})

        names = list_collections()
        step("list_collections", True, names)
        result["collections"] = names

        if not client.has_collection(collection):
            ok = create_collection(collection)
            step("create_collection", ok)
        else:
            step("create_collection", True, "already exists")

        result["collection_exists"] = client.has_collection(collection)
        count = len(get_all_documents(collection)) if result["collection_exists"] else 0
        step("count_documents", True, count)
        result["document_count"] = count
        result["ok"] = all(s["ok"] for s in result["steps"])
    except Exception as exc:
        step("connection", False, str(exc))
        result["ok"] = False
        result["error"] = str(exc)
        if "database not found" in str(exc):
            result["hint"] = (
                "Milvus database 가 없습니다. ensure_database() 로 자동 생성 시도 — "
                "권한 없으면 MONGO_DB=default 로 변경하세요."
            )
        elif "27017" in str(exc) or "Connection refused" in str(exc):
            result["hint"] = (
                "Milvus 서비스는 포트 19530 입니다. .env 에 MONGO_PORT=19530 설정 후 재시도하세요."
            )

    return result


def upsert_by_key(collection: str, key_field: str, documents: list[dict]) -> int:
    if not documents:
        return 0
    updated = 0
    for doc in documents:
        key_val = str(doc.get(key_field) or "")
        if not key_val:
            continue
        if update_document(collection, key_val, doc):
            updated += 1
        elif insert_documents(collection, [doc]):
            updated += 1
    return updated
