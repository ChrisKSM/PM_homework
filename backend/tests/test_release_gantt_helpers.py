import asyncio

from services.release_gantt_service import (
    _epic_key_from_work_fields,
    _looks_like_epic,
    _looks_like_milestone,
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
    assert keys == ["TVPLAT-1"]
    assert not asyncio.iscoroutine(keys)
    assert _scope_initiative_keys(["A", "B"], None, True) == ["A", "B"]
