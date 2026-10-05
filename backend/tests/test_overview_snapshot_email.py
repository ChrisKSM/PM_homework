from datetime import date

from services.overview_snapshot_email import (
    build_overview_plain_text,
    build_overview_snapshot_html,
    build_overview_subject,
)


def test_build_overview_subject():
    assert build_overview_subject(date(2026, 10, 5)) == "[2026-10-05] 전 모델 개발 일정"


def test_build_overview_plain_text_lists_sw_events():
    models = [
        {
            "category": "Sound Suite",
            "model": "H7_VI",
            "events": [
                {"name": "FC 1", "start": "2026-10-01", "end": "2026-10-02", "kind": "sw"},
                {"name": "MP", "start": "2026-11-01", "kind": "hw"},
            ],
        }
    ]
    text = build_overview_plain_text(
        period_label="26/10월",
        models=models,
        page_total=2,
        has_attachments=True,
    )
    assert "[Sound Suite] H7_VI" in text
    assert "FC 1" in text
    assert "2026-10-01 ~ 2026-10-02" in text
    assert "MP" not in text
    assert "Page 1/2" in text
    assert "Page 2/2" in text


def test_build_overview_html_uses_cid_when_images():
    html = build_overview_snapshot_html(
        period_label="26/10월",
        dates=["2026-10-01", "2026-10-02"],
        models=[{"id": "m1", "category": "Sound Suite", "model": "TEST", "events": []}],
        display_rows=[],
        audiences=["개발"],
        page_images=[{"page": 1, "data": "abc123"}],
    )
    assert "cid:overview-page-1" in html
    assert "전 모델 개발 일정" in html
