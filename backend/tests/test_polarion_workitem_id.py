from polarion_client import (
    flatten_polarion_workitem_response,
    normalize_polarion_workitem_id,
    workitem_id,
)


def test_normalize_compound_workitem_id():
    assert normalize_polarion_workitem_id("AVSWReqMgmt/AVRM-5327") == "AVRM-5327"
    assert normalize_polarion_workitem_id("AVRM-5327") == "AVRM-5327"


def test_workitem_id_prefers_avrm_over_project_key():
    polluted = {
        "id": "AVSWReqMgmt",
        "type": "projects",
        "title": "[Sound Suite] sample",
        "attributes.id": "AVRM-5153",
    }
    assert workitem_id(polluted, {"id": "AVRM-5153", "projectKey": "AVSWReqMgmt"}) == "AVRM-5153"


def test_workitem_id_compound_list_row():
    flat = {"id": "AVSWReqMgmt/AVRM-5327", "title": "AVSWReqMgmt/AVRM-5327"}
    assert workitem_id(flat, flat) == "AVRM-5327"


def test_jsonapi_detail_pin_after_deep_merge_pollution():
    doc = {
        "data": {
            "type": "workitems",
            "id": "AVRM-5153",
            "attributes": {
                "id": "AVRM-5153",
                "title": "[Sound Suite][webOS] H7 Clear Voice Pro+",
                "type": {"id": "PRD", "name": "PRD"},
                "status": {"id": "approved", "name": "개발 승인"},
            },
            "relationships": {
                "project": {"data": {"type": "projects", "id": "AVSWReqMgmt"}},
            },
        },
    }
    flat = flatten_polarion_workitem_response(doc)
    flat["id"] = "AVSWReqMgmt"
    flat["type"] = "projects"
    from polarion_client import _pin_jsonapi_workitem_identity

    _pin_jsonapi_workitem_identity(flat, doc, "AVRM-5153", project_key="AVSWReqMgmt")
    assert flat["id"] == "AVRM-5153"
    assert workitem_id(flat, {"id": "AVRM-5153"}) == "AVRM-5153"
