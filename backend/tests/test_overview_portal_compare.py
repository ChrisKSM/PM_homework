from services.delivery_portal_overview_sync import (
    apply_delivery_portal_audio_products,
    compare_overview_with_portal,
    debug_portal_schedules_for_overview,
)

LINKED_S90C = "7a4e1363-a5de-450f-adbe-3aa023e273b6"
OTHER_S90C = "b39d2ab0-e63c-44ad-8945-54f7ec1561b7"


def _program(pid, detail, schedules, model="Others"):
    return {
        "id": pid,
        "program": "Initial",
        "program_detail": detail,
        "details": [
            {
                "department": "Audio",
                "model": model,
                "product_category": "Audio_Soundbar",
                "soc": "AMLogic",
                "schedules": schedules,
            }
        ],
    }


def _portal(*programs):
    return {"platform_data": [{"platform": "webOS26", "program_info": list(programs)}]}


def _sched(name, start, end):
    return {"test_name": name, "plan_start_date": start, "plan_end_date": end}


def _s90c_portal():
    return _portal(
        _program(
            LINKED_S90C,
            "S90C (AMLogic)",
            [_sched("SIT1", "2026-11-03", "2026-11-07"), _sched("FC1", "2026-11-20", "2026-11-27")],
        ),
        _program(
            OTHER_S90C,
            "S90C MR1 (AMLogic)",
            [_sched("SIT1", "2026-11-01", "2026-11-02"), _sched("SIT2", "2026-12-01", "2026-12-03")],
        ),
    )


def _s90c_models(sw_events):
    hw = [{"name": "PV1", "start": "2026-11-18", "end": "2026-11-24", "kind": "hw"}]
    return [{"id": "ov-s90c", "model": "S90C", "category": "사운드바", "events": hw + sw_events}]


def test_linked_program_dates_win_over_shorter_other_program():
    models = _s90c_models([])
    summary = apply_delivery_portal_audio_products(models, _s90c_portal(), dry_run=False)

    sw = {e["name"]: (e["start"], e["end"]) for e in models[0]["events"] if e["kind"] == "sw"}
    assert sw == {"SIT 1": ("2026-11-03", "2026-11-07"), "FC 1": ("2026-11-20", "2026-11-27")}
    assert [i["program_id"] for i in summary["ignored_for_linked_program"]] == [OTHER_S90C]
    assert any(e["kind"] == "hw" and e["name"] == "PV1" for e in models[0]["events"])


def test_without_linked_program_other_programs_still_merge():
    portal = _portal(
        _program(
            OTHER_S90C,
            "S90C MR1 (AMLogic)",
            [_sched("SIT1", "2026-11-01", "2026-11-02")],
        )
    )
    models = _s90c_models([])
    apply_delivery_portal_audio_products(models, portal, dry_run=False)
    sw = [e for e in models[0]["events"] if e["kind"] == "sw"]
    assert [(e["name"], e["start"]) for e in sw] == [("SIT 1", "2026-11-01")]


def test_debug_preview_uses_linked_program_only():
    out = debug_portal_schedules_for_overview(_s90c_portal(), "ov-s90c")
    names = {e["name"]: e["start"] for e in out["events_preview"]}
    assert names == {"SIT 1": "2026-11-03", "FC 1": "2026-11-20"}


def test_compare_flags_stale_missing_and_other_program_dates():
    models = _s90c_models(
        [
            {"name": "S I T1", "start": "2026-11-01", "end": "2026-11-02", "kind": "sw"},
            {"name": "QP 1", "start": "2026-12-14", "end": "2026-12-24", "kind": "sw"},
        ]
    )
    before = [dict(e) for e in models[0]["events"]]

    out = compare_overview_with_portal(models, _s90c_portal())

    assert models[0]["events"] == before
    row = next(m for m in out["models"] if m["overview_id"] == "ov-s90c")
    assert row["linked_program_id"] == LINKED_S90C
    by_name = {e["name"]: e for e in row["events"]}

    sit1 = by_name["SIT 1"]
    assert sit1["screen"] == ["2026-11-01~2026-11-02"]
    assert sit1["expected"] == ["2026-11-03~2026-11-07"]
    assert "stale" in sit1["flags"]
    assert "other_program_dates" in sit1["flags"]
    assert sit1["portal"][0] == {
        "span": "2026-11-03~2026-11-07",
        "program_detail": "S90C (AMLogic)",
        "detail_model": "Others",
        "detail_soc": "AMLogic",
        "date_source": "plan",
        "plan_span": "2026-11-03~2026-11-07",
        "actual_span": "",
        "used": True,
    }
    assert sit1["portal"][1]["used"] is False

    assert by_name["FC 1"]["flags"] == ["missing_on_screen"]
    assert by_name["QP 1"]["flags"] == ["not_in_portal"]
    assert by_name["SIT 2"]["flags"] == ["other_program_only"]
    assert out["flag_counts"]["stale"] == 1


def test_compare_s90c_fc1_screen_plan_vs_portal_actual():
    portal = _portal(
        _program(
            LINKED_S90C,
            "S90C (AMLogic)",
            [
                {
                    "test_name": "FC1",
                    "plan_start_date": "2026-10-28",
                    "plan_end_date": "2026-11-28",
                    "actual_start_date": "2026-11-23",
                    "actual_end_date": "2026-11-27",
                }
            ],
            model="S90C",
        )
    )
    models = _s90c_models([{"name": "FC 1", "start": "2026-10-28", "end": "2026-11-28", "kind": "sw"}])

    out = compare_overview_with_portal(models, portal)
    fc1 = next(e for e in out["models"][0]["events"] if e["name"] == "FC 1")
    assert fc1["screen"] == ["2026-10-28~2026-11-28"]
    assert fc1["expected"] == ["2026-11-23~2026-11-27"]
    assert fc1["flags"] == ["stale"]
    assert fc1["portal"][0]["actual_span"] == "2026-11-23~2026-11-27"
    assert fc1["portal"][0]["plan_span"] == "2026-10-28~2026-11-28"
    assert fc1["portal"][0]["date_source"] == "actual"


def test_compare_ok_when_screen_matches_sync():
    models = _s90c_models([])
    apply_delivery_portal_audio_products(models, _s90c_portal(), dry_run=False)
    out = compare_overview_with_portal(models, _s90c_portal())
    row = next(m for m in out["models"] if m["overview_id"] == "ov-s90c")
    flags = {e["name"]: e["flags"] for e in row["events"]}
    assert flags["SIT 1"] == ["ok", "other_program_dates"]
    assert flags["FC 1"] == ["ok"]
