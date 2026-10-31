from services.model_status_prd_service import (
    _extract_workitem_title,
    _query_is_lucene_model_scoped,
    _summarize_polarion_fetch_attempts,
    _probe_query_priority,
    build_components_lucene_queries,
    build_components_query,
    polarion_component_for_model,
    polarion_component_values_for_model,
    encode_polarion_ui_lucene_query,
    polarion_workitems_search_url,
    apply_model_search_terms,
    build_prd_discovery_queries,
    build_prd_probe_queries,
    workitem_matches_apply_terms,
    workitem_matches_model_scope,
)


def test_apply_model_terms_h7():
    terms = apply_model_search_terms("H7_VI")
    assert terms[0] == "SoundSuite_H7(VI)" or "SoundSuite_H7(VI)" in terms
    assert "Sound Suite H7" in terms
    assert "Sound suite_H7" in terms


def test_h7_polarion_component_and_query():
    assert polarion_component_values_for_model("H7_VI") == [
        "SoundSuite_H7(VI)",
        "H7_VI",
    ]
    assert polarion_component_for_model("H7_VI") == "SoundSuite_H7(VI) | H7_VI"
    assert build_components_query("SoundSuite_H7(VI)") == r'components:(SoundSuite_H7\(VI\))'
    assert build_components_query(["SoundSuite_H7(VI)", "H7_VI"]) == (
        r'components:(SoundSuite_H7\(VI\) H7_VI)'
    )
    lucene = build_components_lucene_queries(["SoundSuite_H7(VI)", "H7_VI"])
    assert lucene[0] == r'components:(SoundSuite_H7\(VI\) H7_VI)'
    assert "components:(SoundSuite_H7(VI) H7_VI)" in lucene
    assert 'components:(H7_VI)' in lucene


def test_build_prd_queries_contains_components():
    qs = build_prd_probe_queries(["Sound Suite H7"], model="H7_VI")
    assert qs[0] == r'components:(SoundSuite_H7\(VI\) H7_VI)'
    assert not any(q.startswith("title:") for q in qs)


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


def test_lucene_title_query_skips_refilter():
    assert _query_is_lucene_model_scoped('title:"H7 VI"', ["H7 VI", "H7_VI"])


def test_lucene_components_query_skips_refilter():
    q = build_components_query("SoundSuite_H7(VI)")
    assert _query_is_lucene_model_scoped(q, apply_model_search_terms("H7_VI"))


def test_polarion_ui_url_encodes_query():
    q = build_components_query(["SoundSuite_H7(VI)", "H7_VI"])
    enc = encode_polarion_ui_lucene_query(q)
    assert enc == "components%3A(SoundSuite_H7%5C(VI%5C)%20H7_VI)"
    url = polarion_workitems_search_url("AVSWReqMgmt", q, list_path="workitems/PRD")
    assert url.endswith("?query=" + enc)
    assert (
        url
        == "https://alm-lge-hlm.singlex.com/polarion/#/project/AVSWReqMgmt/workitems/PRD?query="
        + enc
    )


def test_summarize_attempts_detects_403():
    s = _summarize_polarion_fetch_attempts(
        [{"error": "403 Forbidden Administration Access Permission"}]
    )
    assert s and s.get("polarionRestBlocked") is True


def test_probe_priority_prefers_components():
    comp = build_components_query("SoundSuite_H7(VI)")
    tight = "type:PRD AND applyModel:\"Sound Suite H7\""
    broad = "type:PRD"
    assert _probe_query_priority(comp) > _probe_query_priority(tight) > _probe_query_priority(broad)


def test_extract_title_from_summary_not_id():
    assert _extract_workitem_title({"summary": "Audio PRD feature"}, "AVRM-1") == "Audio PRD feature"
    assert _extract_workitem_title({"title": "AVRM-1"}, "AVRM-1") == "AVRM-1"


def test_model_scope_rejects_unrelated_title():
    flat = {"title": "WiFi module PRD", "applyModel": ""}
    assert not workitem_matches_model_scope(flat, ["Sound Suite H7", "H7_VI"])
    flat2 = {"title": "Audio feature", "applyModel": "Sound Suite H7"}
    assert workitem_matches_model_scope(flat2, ["Sound Suite H7"])
