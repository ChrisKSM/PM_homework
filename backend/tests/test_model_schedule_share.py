from routers.model_schedule import _resolve_share_recipients


def test_resolve_dqa_only():
    addrs = _resolve_share_recipients({"DQA"}, None)
    assert addrs == [
        "rokyung.kim@lge.com",
        "seunghwa.kim@lge.com",
        "haengmo.jin@lge.com",
    ]


def test_resolve_dev_only():
    addrs = _resolve_share_recipients({"개발"}, None)
    assert "seokmin.koh@lge.com" in addrs
    assert "jaecheol.lee@lge.com" in addrs
    assert len(addrs) == 12


def test_resolve_both_deduplicates():
    addrs = _resolve_share_recipients({"DQA", "개발"}, None)
    assert len(addrs) == 15
