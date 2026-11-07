from datetime import date

from services.schedule_snapshot_email import build_snapshot_html, build_snapshot_subject


def test_build_snapshot_subject():
    assert build_snapshot_subject(date(2026, 10, 4)) == "[2026-10-04] 현재 달 QA 모델별 검증 일정"


def test_build_snapshot_html_includes_period_and_audiences():
    html = build_snapshot_html(
        period_label="9/15 ~ 10/26",
        dates=["2026-09-15", "2026-09-16"],
        rows=[
            {
                "category": "사운드바(Wi-Fi)",
                "model": "H7",
                "event": "MR8",
                "variant": "MR8/9",
                "manufacturer": "Symphony",
                "soc": "Q2S",
                "staff": "김로경",
                "testType": "일반성능",
                "status": "예정",
                "changes": "SoC LPE",
                "bars": [{"start": "2026-09-15", "end": "2026-09-16", "type": "planned", "label": "DEV"}],
            }
        ],
        audiences=["DQA"],
    )
    assert "9/15 ~ 10/26" in html
    assert "DQA" in html
    assert "H7" in html
    assert "개발등급" in html


def test_build_snapshot_html_includes_changes_and_summary():
    html = build_snapshot_html(
        period_label="10/1 ~ 10/31",
        dates=["2026-10-01"],
        rows=[
            {
                "category": "사운드바",
                "model": "H7",
                "event": "MR8",
                "variant": "v",
                "manufacturer": "m",
                "soc": "s",
                "staff": "담당",
                "testType": "일반성능",
                "status": "예정",
                "changes": "c",
                "bars": [],
            }
        ],
        audiences=["DQA"],
        month_schedule_summary=[{"model": "H7", "schedule": "9/29 ~ 10/2"}],
        schedule_changes=[
            {
                "model": "H7",
                "test_type": "일반성능",
                "before": "9/29 ~ 10/2",
                "after": "10/31 ~ 11/5",
            }
        ],
    )
    assert "이번 달 주요 일정" in html
    assert "일정 변경" in html
    assert "변경전" in html
    assert "9/29 ~ 10/2" in html


def test_build_snapshot_html_two_pages():
    def row(model: str, event: str) -> dict:
        return {
            "category": "Wi-Fi",
            "model": model,
            "event": event,
            "variant": "v",
            "manufacturer": "m",
            "soc": "s",
            "staff": "담당",
            "testType": "일반성능",
            "status": "예정",
            "changes": "c",
            "bars": [],
        }

    rows = [row("H7", "MR8"), row("H7", "MR8"), row("W7", "MR5"), row("W7", "MR5")]
    html = build_snapshot_html(
        period_label="9/15 ~ 10/26",
        dates=["2026-09-15"],
        rows=rows,
        audiences=["개발"],
    )
    assert "Page 1 / 2" in html
    assert "Page 2 / 2" in html
    assert "전체 4행" in html
