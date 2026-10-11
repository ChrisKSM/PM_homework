import asyncio

from datetime import date

from services.release_sprint_calendar_2026 import nearest_sprint_for_day
from services.release_gantt_service import (
    _map_milestone,
    _sprint_from_milestone_summary,
    _epic_key_from_work_fields,
    _looks_like_epic,
    _looks_like_milestone,
    _collect_milestone_fix_versions,
    _milestone_jql_for_epic,
    _milestone_jql_variants,
    _resolve_milestone_fix_version,
    _scope_initiative_keys,
    pick_demo_epic,
    demo_milestone_jql_for_epic,
    linked_epic_jql_for_initiative,
    expected_demo_epic_summaries,
)


def test_looks_like_epic():
    assert _looks_like_epic({"name": "Epic"})
    assert _looks_like_epic({"name": "epic"})
    assert not _looks_like_epic({"name": "Story"})


def test_epic_key_from_work_fields():
    fields = {
        "customfield_10801": "TVPLAT-857212",
        "parent": {"key": "TVPLAT-999"},
    }
    assert _epic_key_from_work_fields(fields) == "TVPLAT-857212"


def test_looks_like_milestone():
    assert _looks_like_milestone({"name": "Milestone"}, "")
    assert _looks_like_milestone({"name": "Task"}, "IR1 M3 Gate")
    assert not _looks_like_milestone({"name": "Story"}, "login feature")


def test_scope_initiative_keys_returns_list_not_coroutine():
    """@cached on sync helper caused 'coroutine' object is not subscriptable in gantt."""
    keys = _scope_initiative_keys(["TVPLAT-1", "TVPLAT-2"], None, False)
    assert keys == ["TVPLAT-1", "TVPLAT-2"]
    assert not asyncio.iscoroutine(keys)
    assert _scope_initiative_keys(["A", "B"], "A", False) == ["A"]
    assert _scope_initiative_keys(["A", "B"], "A", True) == ["A", "B"]


def test_milestone_jql_epic_link_and_fix_version():
    jql = _milestone_jql_for_epic("TVPLAT-922544", ["Audio_2025", "Audio_2026"], "TVPLAT")
    assert 'fixVersion = "Audio_2025"' in jql
    assert '"Epic Link" = TVPLAT-922544' in jql
    assert "Milestone" in jql
    variants = _milestone_jql_variants("TVPLAT-922544", ["Audio_2026"], "TVPLAT")
    assert all("cf[10801]" not in v for v in variants)


def test_resolve_milestone_fix_version_from_initiative():
    inits = [{"fields": {"fixVersions": [{"name": "Audio_2025"}]}}]
    assert _resolve_milestone_fix_version(inits) == "Audio_2025"
    vers = _collect_milestone_fix_versions(
        [{"fields": {"fixVersions": [{"name": "Audio_2026"}, {"name": "Audio_2025"}]}}]
    )
    assert vers[0] == "Audio_2026"
    assert "Audio_2025" in vers


def test_nearest_sprint_for_2025_due_date():
    assert nearest_sprint_for_day(date(2025, 6, 15)) == 1


def test_sprint_from_milestone_summary():
    assert _sprint_from_milestone_summary("IR1 M3 Gate") == 8


def test_pick_demo_epic_matches_initiative_title():
    inits = "Sound Suite 7 VI Release"
    rows = [
        {"key": "TVPLAT-1", "fields": {"summary": "other", "issuetype": {"name": "Epic"}}},
        {"key": "TVPLAT-969298", "fields": {"summary": f"[Demo]{inits}", "issuetype": {"name": "Epic"}}},
    ]
    hit = pick_demo_epic(rows, inits)
    assert hit and hit["key"] == "TVPLAT-969298"


def test_pick_demo_epic_bracket_avrm_prefix():
    init_summary = "[AVRM-5194] webOS Audio 2.0 AI Sound Pro+ 고도화"
    epic_summary = "[Demo][AVRM-5194] webOS Audio 2.0 AI Sound Pro+ 고도화"
    rows = [
        {"key": "TVPLAT-969298", "fields": {"summary": epic_summary, "issuetype": {"name": "Epic"}}},
    ]
    hit = pick_demo_epic(rows, init_summary)
    assert hit and hit["key"] == "TVPLAT-969298"


def test_demo_milestone_jql_epic_link_only():
    jql = demo_milestone_jql_for_epic("TVPLAT-969298", "TVPLAT")
    assert '"Epic Link" = TVPLAT-969298' in jql
    assert "fixVersion" not in jql
    assert "linkedIssues" in linked_epic_jql_for_initiative("TVPLAT-943406", "TVPLAT")


def test_expected_demo_epic_summaries():
    assert "[Demo]Foo" in expected_demo_epic_summaries("Foo")


def test_map_milestone_uses_summary_when_due_outside_2026():
    raw = {
        "key": "TVPLAT-MS-1",
        "fields": {
            "summary": "M2 deliverable",
            "issuetype": {"name": "Milestone"},
            "duedate": "2025-11-01",
        },
        "_ganttEpicKey": "TVPLAT-922544",
    }
    ms = _map_milestone(raw, "TVPLAT-922544")
    assert ms is not None
    assert ms["sprint"] == 6
    assert ms["epicKey"] == "TVPLAT-922544"
