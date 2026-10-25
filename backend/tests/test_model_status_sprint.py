from services.model_status_sprint_service import (
    filter_issues_for_model,
    issue_matches_model,
    resolve_sprint_story_label,
)


def test_resolve_sprint_label_s80c():
    assert resolve_sprint_story_label("S80C", None) == "S80C"
    assert resolve_sprint_story_label("H7_VI", None) == "SoundSuite_H7(VI)"


def test_issue_matches_labels():
    issue = {"fields": {"labels": ["S80C"], "summary": "foo", "components": []}}
    assert issue_matches_model(issue, "S80C", "S80C")
    assert not issue_matches_model(issue, "H7_VI", "H7_VI")


def test_filter_issues():
    issues = [
        {"fields": {"labels": ["S80C"], "summary": "a", "components": []}},
        {"fields": {"labels": ["H7"], "summary": "b", "components": []}},
    ]
    out = filter_issues_for_model(issues, "S80C", "S80C")
    assert len(out) == 1
