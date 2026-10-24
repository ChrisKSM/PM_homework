from services.model_status_prd_service import (
    _probe_query_priority,
    polarion_workitems_search_url,
    apply_model_search_terms,
    build_prd_discovery_queries,
    build_prd_probe_queries,
    workitem_matches_apply_terms,
    workitem_matches_model_scope,
)


def test_apply_model_terms_h7():
    terms = apply_model_search_terms("H7_VI")
    assert "Sound Suite H7" in terms
    assert "Sound suite_H7" in terms


def test_build_prd_queries_contains_apply_model():
    qs = build_prd_probe_queries(["Sound Suite H7"])
    assert any("applyModel" in q and "Sound Suite H7" in q for q in qs)
    assert any("type:PRD" in q for q in qs)
    assert any("model_name" in q for q in qs)


def test_discovery_includes_title_and_model_name():
    qs = build_prd_discovery_queries(["Sound Suite H7"])
    assert any(q.startswith("title:") for q in qs)
    assert any("model_name:" in q for q in qs)


def test_client_filter_apply_terms():
    flat = {"title": "foo", "customApplyModel": "Sound suite_H7"}
    assert workitem_matches_apply_terms(flat, ["Sound Suite H7"])


def test_polarion_ui_url_encodes_query():
    url = polarion_workitems_search_url("AVSWRelProjMgmt", 'type:PRD AND applyModel:"Sound Suite H7"')
    assert "AVSWRelProjMgmt/workitems?query=" in url
    assert "applyModel" in url


def test_probe_priority_prefers_apply_model():
    tight = "type:PRD AND applyModel:\"Sound Suite H7\""
    broad = "type:PRD"
    assert _probe_query_priority(tight) > _probe_query_priority(broad)


def test_model_scope_rejects_unrelated_title():
    flat = {"title": "WiFi module PRD", "applyModel": ""}
    assert not workitem_matches_model_scope(flat, ["Sound Suite H7", "H7_VI"])
    flat2 = {"title": "Audio feature", "applyModel": "Sound Suite H7"}
    assert workitem_matches_model_scope(flat2, ["Sound Suite H7"])
