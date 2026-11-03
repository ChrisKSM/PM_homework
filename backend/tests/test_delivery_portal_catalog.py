import json
from pathlib import Path

from services.delivery_portal_catalog import (
    AUDIO_PRODUCT_CATEGORIES,
    extract_product_category,
    iter_portal_program_rows,
    should_skip_portal_program,
)
from services.delivery_portal_overview_sync import (
    apply_delivery_portal_audio_products,
    reconcile_portal_sw_with_seed,
    schedules_to_events,
)

FIXTURE = Path(__file__).parent / "fixtures" / "delivery_portal_audio_products.json"


def test_extract_product_category_on_detail():
    pi = {"program": "Initial"}
    d = {"product_category": "Audio_Soundbar"}
    assert extract_product_category(pi, d) == "Audio_Soundbar"


def test_should_skip_m5_initial():
    assert should_skip_portal_program("Initial", "Initial M5_VI") is True
    assert should_skip_portal_program("Initial", "Initial H5(ax26sb)") is False


def test_iter_portal_program_rows_fixture():
    portal = json.loads(FIXTURE.read_text(encoding="utf-8"))
    rows = list(
        iter_portal_program_rows(
            portal,
            product_categories=set(AUDIO_PRODUCT_CATEGORIES),
            department="Audio",
        )
    )
    assert len(rows) == 2
    models = {r["model"] for r in rows}
    assert models == {"S90C", "XT7S"}


def test_iter_portal_merges_schedules_from_all_audio_details():
    portal = json.loads(FIXTURE.read_text(encoding="utf-8"))
    row = next(
        r
        for r in iter_portal_program_rows(
            portal,
            product_categories=set(AUDIO_PRODUCT_CATEGORIES),
            department="Audio",
        )
        if r.get("model") == "S90C"
    )
    names = {e["name"] for e in schedules_to_events(row["schedules"])}
    assert "FC 1" in names
    assert "PV1" in names or "PV 1" in names
    assert any("QP" in n for n in names)
    qp = [e for e in schedules_to_events(row["schedules"]) if "QP" in e["name"] and "1" in e["name"]]
    assert len(qp) == 1
    assert qp[0]["start"] == "2026-12-14"
    assert qp[0]["end"] == "2026-12-24"


def test_schedules_to_events_prefers_plan_dates_over_actual():
    raw = [
        {
            "test_name": "QP1",
            "plan_start_date": "2026-12-14",
            "plan_end_date": "2026-12-24",
            "actual_start_date": "2026-06-12",
            "actual_end_date": "2027-01-22",
        }
    ]
    ev = schedules_to_events(raw)
    assert len(ev) == 1
    assert ev[0]["start"] == "2026-12-14"
    assert ev[0]["end"] == "2026-12-24"


def test_apply_audio_products_preserves_mongo_hw_replaces_sw():
    portal = json.loads(FIXTURE.read_text(encoding="utf-8"))
    models = [
        {
            "id": "ov-s90c",
            "category": "사운드바(Wi-Fi)",
            "model": "S90C",
            "events": [
                {
                    "name": "PrePV",
                    "start": "2026-10-30",
                    "end": "2026-11-09",
                    "kind": "hw",
                },
                {
                    "name": "PV1",
                    "start": "2026-11-18",
                    "end": "2026-11-24",
                    "kind": "hw",
                },
                {
                    "name": "QP 1",
                    "start": "2026-06-12",
                    "end": "2027-01-22",
                    "kind": "sw",
                },
            ],
        }
    ]
    apply_delivery_portal_audio_products(models, portal, dry_run=False)
    ev = models[0]["events"]
    assert any(e.get("kind") == "hw" and e.get("name") == "PrePV" for e in ev)
    assert any(e.get("kind") == "hw" and e.get("name") == "PV1" for e in ev)
    assert not any(e.get("start") == "2026-06-12" for e in ev)
    qp = [e for e in ev if "QP" in e.get("name", "") and "1" in e.get("name", "")]
    assert qp and qp[0]["start"] == "2026-12-14"


def test_apply_audio_products_replaces_seed_events_not_merge_stale():
    """Portal sync must not keep stale seed QP dates merged with portal schedules."""
    portal = json.loads(FIXTURE.read_text(encoding="utf-8"))
    models = [
        {
            "id": "ov-s90c",
            "category": "사운드바(Wi-Fi)",
            "model": "S90C",
            "variant": "",
            "soc": "ax26sb",
            "swPm": "",
            "spec": "",
            "pv": "",
            "mp": "",
            "events": [
                {
                    "name": "QP 1",
                    "start": "2026-06-12",
                    "end": "2027-01-22",
                    "kind": "sw",
                }
            ],
        }
    ]
    apply_delivery_portal_audio_products(models, portal, dry_run=False)
    ev = models[0]["events"]
    assert not any(e.get("start") == "2026-06-12" for e in ev)
    qp = [e for e in ev if "QP" in e.get("name", "")]
    assert any(e.get("start") == "2026-12-14" for e in qp)
    assert any(e.get("kind") == "hw" for e in ev)


def test_reconcile_portal_sw_replaces_absurd_qp_with_seed(monkeypatch):
    seed = {
        "ov-s90c": {
            "events": [
                {"name": "QP 1", "start": "2026-12-14", "end": "2026-12-24", "kind": "sw", "barType": "qp"},
            ]
        }
    }
    monkeypatch.setattr(
        "services.delivery_portal_overview_sync._overview_seed_by_id",
        lambda: seed,
    )
    portal_ev = [
        {"name": "QP 1", "start": "2026-06-12", "end": "2027-01-22", "kind": "sw", "barType": "qp"},
        {"name": "FC 1", "start": "2026-10-28", "end": "2026-11-28", "kind": "sw"},
    ]
    out = reconcile_portal_sw_with_seed("ov-s90c", portal_ev)
    qp = [e for e in out if e.get("name") == "QP 1"]
    assert len(qp) == 1
    assert qp[0]["start"] == "2026-12-14"
    fc = [e for e in out if e.get("name") == "FC 1"]
    assert fc[0]["start"] == "2026-10-28"


def test_merge_portal_programs_for_same_overview_id_prefers_short_qp():
    from services.delivery_portal_catalog import merge_portal_schedule_lists

    lists = [
        [{"test_name": "QP1", "plan_start_date": "2026-06-12", "plan_end_date": "2027-01-22"}],
        [{"test_name": "QP1", "plan_start_date": "2026-12-14", "plan_end_date": "2026-12-24"}],
    ]
    merged = merge_portal_schedule_lists(lists)
    ev = schedules_to_events(merged)
    qp = [e for e in ev if "QP" in e["name"]]
    assert len(qp) == 1
    assert qp[0]["start"] == "2026-12-14"


def test_apply_audio_products_creates_xt7s():
    portal = json.loads(FIXTURE.read_text(encoding="utf-8"))
    models = [
        {
            "id": "ov-s90c",
            "category": "사운드바(Wi-Fi)",
            "model": "S90C",
            "variant": "",
            "soc": "Others",
            "swPm": "",
            "spec": "",
            "pv": "",
            "mp": "",
            "events": [],
        }
    ]
    summary = apply_delivery_portal_audio_products(models, portal, dry_run=False)
    assert summary["portal_program_count"] == 2
    by_id = {m["id"]: m for m in models}
    assert len(schedules_to_events([])) == 0
    assert "ov-s90c" in by_id
    assert len(by_id["ov-s90c"]["events"]) >= 3
    xt7 = next(m for m in models if m.get("model") == "XT7S")
    assert xt7["category"] == "무선스피커"
    assert xt7["events"][0]["name"] == "QP"
