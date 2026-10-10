from services.release_gantt_service import _looks_like_epic, _looks_like_milestone


def test_looks_like_epic():
    assert _looks_like_epic({"name": "Epic"})
    assert _looks_like_epic({"name": "epic"})
    assert not _looks_like_epic({"name": "Story"})


def test_looks_like_milestone():
    assert _looks_like_milestone({"name": "Milestone"}, "")
    assert _looks_like_milestone({"name": "Task"}, "IR1 M3 Gate")
    assert not _looks_like_milestone({"name": "Story"}, "login feature")
