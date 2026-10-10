from services.model_status_initiative_service import (
    build_initiative_jql,
    format_jira_person,
    map_initiative_issue,
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


def test_format_jira_person_lge_display():
    user = {
        "name": "seongyeon.jo",
        "displayName": "조성연/webOS PMO(seongyeon.jo)",
    }
    assert format_jira_person(user) == "조성연 / seongyeon.jo"


def test_map_initiative_issue_davis_fields():
    raw = {
        "key": "TVPLAT-518777",
        "fields": {
            "summary": "H7 VI Initiative",
            "status": {"name": "In Progress"},
            "duedate": "2026-03-31",
            "assignee": {"name": "pm.kim", "displayName": "김PM / pm.kim"},
            "reporter": {"name": "pm.kim", "displayName": "김PM / pm.kim"},
            "components": [{"name": "Sound Suite"}],
            "fixVersions": [{"name": "webOS26 MR1"}],
            "labels": ["SoundSuite_H7(VI)"],
            "customfield_35455": {"value": "Required"},
            "customfield_35516": {"value": "Product"},
            "customfield_35454": {"value": "Medium"},
            "customfield_35441": "2026-01-15",
        },
    }
    row = map_initiative_issue(raw, "H7_VI")
    assert row["key"] == "TVPLAT-518777"
    assert row["product"] == "Sound Suite"
    assert row["event"] == "webOS26 MR1"
    assert row["score"] == "Medium"
    assert row["grouping"] == "Required"
    assert row["fixedIn"] == "webOS26 MR1"
    assert row["due"] == "2026-03-31"
    assert "pm.kim" in row["pm"]
