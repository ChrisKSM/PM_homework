import asyncio

from services.release_gantt_service import (
    _epic_key_from_work_fields,
    _looks_like_epic,
    _looks_like_milestone,
    _milestone_jql_for_epic,
    _resolve_milestone_fix_version,
    _scope_initiative_keys,
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
    jql = _milestone_jql_for_epic("TVPLAT-922544", "Audio_2025", "TVPLAT")
    assert 'fixVersion = "Audio_2025"' in jql
    assert '"Epic Link" = TVPLAT-922544' in jql
    assert "Milestone" in jql


def test_resolve_milestone_fix_version_from_initiative():
    inits = [{"fields": {"fixVersions": [{"name": "Audio_2025"}]}}]
    assert _resolve_milestone_fix_version(inits) == "Audio_2025"
