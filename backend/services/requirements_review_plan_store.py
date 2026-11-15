"""요구사항 검토 적용 계획 — Milvus(requirements_review_plans) 저장 (mongo_helper).

prdId 단위 1문서: 적용 시점(MR 월) · 적용 범위 · 개발팀 · Action item · Due date.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from services import mongo_helper

COLLECTION = "requirements_review_plans"
APPLY_SCOPES: tuple[str, ...] = ("product", "app", "tv")

_PRD_ID_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*-\d+$")
_APPLY_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _clean_prd_id(raw: str) -> str:
    prd_id = (raw or "").strip()
    if "/" in prd_id:
        prd_id = prd_id.rsplit("/", 1)[-1]
    # row_id 는 Milvus filter 문자열에 그대로 들어가므로 workitem id 형식만 허용
    if not _PRD_ID_RE.match(prd_id):
        raise ValueError(f"invalid prdId: {raw!r}")
    return prd_id


def normalize_plan_input(
    *,
    prd_id: str,
    apply_month: str = "",
    apply_scopes: list[str] | None = None,
    dev_team: str = "",
    action_item: str = "",
    due_date: str = "",
    updated_by: str = "",
) -> dict[str, Any]:
    pid = _clean_prd_id(prd_id)
    month = (apply_month or "").strip()
    if month and not _APPLY_MONTH_RE.match(month):
        raise ValueError("applyMonth must be YYYY-MM")
    due = (due_date or "").strip()
    if due:
        if not _DATE_RE.match(due):
            raise ValueError("dueDate must be YYYY-MM-DD")
        datetime.strptime(due, "%Y-%m-%d")
    scopes: list[str] = []
    for s in apply_scopes or []:
        key = str(s or "").strip().lower()
        if key not in APPLY_SCOPES:
            raise ValueError(f"applyScopes must be one of {', '.join(APPLY_SCOPES)}")
        if key not in scopes:
            scopes.append(key)
    scopes.sort(key=APPLY_SCOPES.index)
    return {
        "id": pid,
        "prdId": pid,
        "applyMonth": month,
        "applyScopes": scopes,
        "devTeam": (dev_team or "").strip()[:80],
        "actionItem": (action_item or "").strip()[:4000],
        "dueDate": due,
        "updatedBy": (updated_by or "").strip()[:80],
    }


def list_plans() -> list[dict[str, Any]]:
    if not mongo_helper.ensure_collection(COLLECTION):
        raise RuntimeError(mongo_helper.collection_error(COLLECTION))
    docs = mongo_helper.get_all_documents(COLLECTION, use_cache=False)
    return [d for d in docs if d.get("prdId")]


def save_plan(**fields: Any) -> dict[str, Any]:
    doc = normalize_plan_input(**fields)
    if not mongo_helper.ensure_collection(COLLECTION):
        raise RuntimeError(mongo_helper.collection_error(COLLECTION))
    existing = next(
        (d for d in mongo_helper.get_all_documents(COLLECTION) if d.get("prdId") == doc["prdId"]),
        None,
    )
    doc["updatedAt"] = _now_iso()
    doc["createdAt"] = (existing or {}).get("createdAt") or doc["updatedAt"]
    if existing:
        if not mongo_helper.update_document(COLLECTION, doc["id"], doc):
            raise RuntimeError("plan update failed")
    elif not mongo_helper.insert_documents(COLLECTION, [doc]):
        raise RuntimeError("plan insert failed")
    return doc
