from services.model_status_initiative_service import (
    build_initiative_jql,
    resolve_initiative_label,
)


def test_build_initiative_jql_h7_vi():
    jql = build_initiative_jql("SoundSuite_H7(VI)")
    assert 'project = TVPLAT' in jql
    assert "issuetype = Initiative" in jql
    assert 'labels in ("SoundSuite_H7(VI)")' in jql


def test_resolve_label_from_model():
    assert resolve_initiative_label("H7_VI", None) == "SoundSuite_H7(VI)"
    assert resolve_initiative_label("h7-vi", None) == "SoundSuite_H7(VI)"
    assert resolve_initiative_label(None, "Custom_Label") == "Custom_Label"
    assert resolve_initiative_label("UNKNOWN", None) is None
