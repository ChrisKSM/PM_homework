"""PRD 검토 일정 라벨 — Milvus(model_status_prd_labels) 저장."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from services import mongo_helper

COLLECTION = "model_status_prd_labels"


def _doc_id(model: str, prd_id: str) -> str:
    return f"{(model or '').strip()}:{(prd_id or '').strip()}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def list_labels_for_model(model: str) -> list[dict[str, Any]]:
    model = (model or "").strip()
    if not model:
        return []
    if not mongo_helper.ensure_collection(COLLECTION):
        return []
    docs = mongo_helper.get_all_documents(COLLECTION, use_cache=False)
    return [d for d in docs if str(d.get("model") or "").strip() == model]


def labels_by_prd_id(model: str) -> dict[str, dict[str, Any]]:
    return {str(d.get("prdId") or ""): d for d in list_labels_for_model(model) if d.get("prdId")}


def save_review_label(
    *,
    model: str,
    prd_id: str,
    review_label: str,
    alm_labels: list[str] | None = None,
) -> dict[str, Any]:
    model = (model or "").strip()
    prd_id = (prd_id or "").strip()
    if not model or not prd_id:
        raise ValueError("model and prdId required")
    if not mongo_helper.ensure_collection(COLLECTION):
        raise RuntimeError(mongo_helper.collection_error(COLLECTION))

    row_id = _doc_id(model, prd_id)
    existing = labels_by_prd_id(model).get(prd_id) or {}
    doc: dict[str, Any] = {
        "id": row_id,
        "model": model,
        "prdId": prd_id,
        "reviewLabel": (review_label or "").strip(),
        "almLabelsSnapshot": alm_labels if alm_labels is not None else existing.get("almLabelsSnapshot") or [],
        "updatedAt": _now_iso(),
    }
    if existing.get("createdAt"):
        doc["createdAt"] = existing["createdAt"]
    else:
        doc["createdAt"] = doc["updatedAt"]

    if not mongo_helper.update_document(COLLECTION, row_id, doc):
        if not mongo_helper.insert_documents(COLLECTION, [doc]):
            raise RuntimeError("label save failed")
    return doc


def merge_labels_into_items(model: str, items: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    store = labels_by_prd_id(model)
    merged: list[dict[str, Any]] = []
    for it in items:
        row = dict(it)
        ov = store.get(str(it.get("id") or "")) or {}
        row["reviewLabel"] = ov.get("reviewLabel") or ""
        row["reviewLabelUpdatedAt"] = ov.get("updatedAt") or ""
        merged.append(row)
    meta = {
        "collection": COLLECTION,
        "storedCount": len(store),
        "milvusOk": mongo_helper.ensure_collection(COLLECTION),
    }
    if not meta["milvusOk"]:
        meta["error"] = mongo_helper.collection_error(COLLECTION)
    return merged, meta
