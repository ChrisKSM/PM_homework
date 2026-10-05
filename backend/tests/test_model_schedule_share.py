from routers.model_schedule import ScheduleShareRequest, _is_overview_share, _resolve_share_recipients


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


def test_is_overview_share_by_snapshot_type():
    req = ScheduleShareRequest(
        period_label="26/10월",
        dates=["2026-10-01"],
        snapshot_type="overview",
        models=[{"id": "m1"}],
        display_rows=[{"modelId": "m1"}],
        audiences=["개발"],
    )
    assert _is_overview_share(req) is True


def test_is_overview_share_detail_rows():
    req = ScheduleShareRequest(
        period_label="9/15 ~ 10/26",
        dates=["2026-10-01"],
        rows=[{"model": "S80C"}],
        audiences=["DQA"],
    )
    assert _is_overview_share(req) is False
