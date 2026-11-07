from datetime import date

from services.release_sprint_calendar_2026 import (
    calendar_payload,
    parse_day,
    sprint_for_day,
    sprint_span_for_range,
)


def test_calendar_has_26_sprints_and_ir5():
    cal = calendar_payload()
    assert cal["sprintMin"] == 1
    assert cal["sprintMax"] == 26
    assert len(cal["sprints"]) == 26
    assert cal["irBands"][-1]["title"] == "IR5"


def test_sprint_span_overlap():
    start = parse_day("2026-01-10")
    end = parse_day("2026-02-20")
    assert sprint_span_for_range(start, end) == (1, 4)


def test_sprint_for_day_sp26():
    assert sprint_for_day(date(2026, 12, 25)) == 26
