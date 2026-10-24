from services.model_status_prd_service import (
    apply_model_search_terms,
    build_prd_discovery_queries,
    build_prd_probe_queries,
    workitem_matches_apply_terms,
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
