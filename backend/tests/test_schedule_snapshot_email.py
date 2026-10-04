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
                "testType": "일반성능",
                "status": "예정",
                "changes": "SoC LPE",
                "bars": [{"start": "2026-09-15", "end": "2026-09-16", "type": "planned", "label": ""}],
            }
        ],
        audiences=["DQA", "개발"],
    )
    assert "9/15 ~ 10/26" in html
    assert "DQA" in html
    assert "개발" in html
    assert "H7" in html
