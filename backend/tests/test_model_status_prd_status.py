from services.model_status_prd_status import classify_prd_workflow_status, enrich_prd_item_workflow


def test_classify_korean_statuses():
    assert classify_prd_workflow_status("작성 중")["id"] == "draft"
    assert classify_prd_workflow_status("개발 승인")["label"] == "개발 승인"
    assert classify_prd_workflow_status("기획검토")["id"] == "planning_review"
    assert classify_prd_workflow_status("검토요청")["id"] == "review_request"
    assert classify_prd_workflow_status("검토 승인")["id"] == "review_approved"
    assert classify_prd_workflow_status("개발 검토")["id"] == "dev_review"
    assert classify_prd_workflow_status("기획검토")["id"] == "planning_review"
    assert classify_prd_workflow_status("개발 승인")["id"] == "dev_approved"
    assert classify_prd_workflow_status("반려")["id"] == "rejected"


def test_enrich_item():
    out = enrich_prd_item_workflow({"id": "X", "status": "검토요청"})
    assert out["workflowStageId"] == "review_request"
    assert out["workflowStageLabel"] == "검토요청"


def test_enrich_unknown_status_shows_raw_label():
    out = enrich_prd_item_workflow({"id": "X", "status": "Custom Polarion State"})
    assert out["workflowStageId"] == "other"
    assert out["workflowStageLabel"] == "Custom Polarion State"


def test_polarion_closed_maps_to_dev_approved():
    wf = classify_prd_workflow_status("closed")
    assert wf["id"] == "dev_approved"
    assert wf["label"] == "개발 승인"


def test_polarion_proposed_maps_to_dev_review():
    wf = classify_prd_workflow_status("Proposed")
    assert wf["id"] == "dev_review"
    assert wf["label"] == "개발 검토"


def test_resolve_prd_status_tokens_from_enum_dict():
    from services.model_status_prd_status import resolve_prd_status_tokens

    assert resolve_prd_status_tokens("closed", "Closed") == "개발 승인"
    assert resolve_prd_status_tokens("", "proposed") == "개발 검토"
