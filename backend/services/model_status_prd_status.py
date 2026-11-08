"""PRD workflow status → Initiative-style column (작성 중 … 반려)."""
from __future__ import annotations

import re
from typing import Any

PRD_WORKFLOW_COLUMNS: tuple[dict[str, Any], ...] = (
    {"id": "draft", "label": "작성 중", "order": 1},
    {"id": "review_request", "label": "검토요청", "order": 2},
    {"id": "review_approved", "label": "검토 승인", "order": 3},
    {"id": "dev_review", "label": "개발 검토", "order": 4},
    {"id": "planning_review", "label": "기획검토", "order": 5},
    {"id": "dev_approved", "label": "개발 승인", "order": 6},
    {"id": "rejected", "label": "반려", "order": 7},
)

_OTHER = {"id": "other", "label": "기타", "order": 99}


def _norm(s: str) -> str:
    return re.sub(r"\s+", "", (s or "").lower())


def classify_prd_workflow_status(status: str) -> dict[str, Any]:
    raw = (status or "").strip()
    n = _norm(raw)
    if not n:
        return dict(_OTHER)

    exact_ko: list[tuple[str, str]] = [
        ("작성 중", "draft"),
        ("작성중", "draft"),
        ("검토요청", "review_request"),
        ("검토 요청", "review_request"),
        ("검토승인", "review_approved"),
        ("검토 승인", "review_approved"),
        ("개발검토", "dev_review"),
        ("개발 검토", "dev_review"),
        ("기획검토", "planning_review"),
        ("기획 검토", "planning_review"),
        ("개발승인", "dev_approved"),
        ("개발 승인", "dev_approved"),
        ("반려", "rejected"),
    ]
    for label, stage_id in exact_ko:
        if raw == label or _norm(raw) == _norm(label):
            return dict(next(c for c in PRD_WORKFLOW_COLUMNS if c["id"] == stage_id))

    rules: list[tuple[str, tuple[str, ...]]] = [
        ("rejected", ("반려", "reject", "rejected", "declined")),
        ("dev_approved", ("개발승인", "devapproved", "developmentapproved")),
        ("planning_review", ("기획검토", "planningreview", "pmreview")),
        ("dev_review", ("개발검토", "devreview", "developmentreview")),
        ("review_approved", ("검토승인", "reviewapproved")),
        ("review_request", ("검토요청", "reviewrequest", "requestreview")),
        ("draft", ("작성중", "draft", "drafting", "writing", "open")),
    ]
    for stage_id, tokens in rules:
        if any(t in n for t in tokens):
            col = next(c for c in PRD_WORKFLOW_COLUMNS if c["id"] == stage_id)
            return dict(col)
    # 부분 한글 (공백 있는 ALM 표기)
    if "검토" in raw and "요청" in raw:
        return dict(next(c for c in PRD_WORKFLOW_COLUMNS if c["id"] == "review_request"))
    if "검토" in raw and "승인" in raw:
        return dict(next(c for c in PRD_WORKFLOW_COLUMNS if c["id"] == "review_approved"))
    if "개발" in raw and "검토" in raw:
        return dict(next(c for c in PRD_WORKFLOW_COLUMNS if c["id"] == "dev_review"))
    if "기획" in raw and "검토" in raw:
        return dict(next(c for c in PRD_WORKFLOW_COLUMNS if c["id"] == "planning_review"))
    if "개발" in raw and "승인" in raw:
        return dict(next(c for c in PRD_WORKFLOW_COLUMNS if c["id"] == "dev_approved"))
    if "작성" in raw:
        return dict(next(c for c in PRD_WORKFLOW_COLUMNS if c["id"] == "draft"))
    return dict(_OTHER)


def enrich_prd_item_workflow(item: dict[str, Any]) -> dict[str, Any]:
    raw_status = str(item.get("status") or "").strip()
    wf = classify_prd_workflow_status(raw_status)
    out = dict(item)
    out["workflowStageId"] = wf["id"]
    label = wf["label"]
    if wf["id"] == "other" and raw_status:
        label = raw_status
    out["workflowStageLabel"] = label
    out["workflowOrder"] = wf["order"]
    return out
