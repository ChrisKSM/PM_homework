from services.model_status_prd_status import classify_prd_workflow_status, enrich_prd_item_workflow


def test_classify_korean_statuses():
    assert classify_prd_workflow_status("작성 중")["id"] == "draft"
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
