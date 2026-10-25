from datetime import date

from services.model_status_sprint_service import (
    build_sp_burndown,
    build_sp_velocity,
    parse_sp_number,
    resolve_sprint_model_label,
)
from services.model_status_sprint_worklog import (
    build_current_sprint_burndown,
    merge_velocity_with_worklog,
    worklog_started_date,
)


def test_resolve_h7_label():
    assert resolve_sprint_model_label("H7_VI", None) == "SoundSuite_H7(VI)"


def test_parse_sp_number():
    assert parse_sp_number("2026_IR2SP07") == 7
    assert parse_sp_number("SP07") == 7


def test_build_velocity_from_rows():
    rows = [
        {"targetSprint": "SP03", "plannedSp": 10, "completionStatus": "Done"},
        {"targetSprint": "SP03", "plannedSp": 5, "completionStatus": "Open"},
    ]
    vel = build_sp_velocity(rows, 1, 5)
    sp3 = next(v for v in vel if v["sprintName"] == "SP03")
    assert sp3["committed"] == 15
    assert sp3["completed"] == 10


def test_burndown_points():
    vel = [{"sprintName": "SP01", "committed": 10, "completed": 5}]
    bd = build_sp_burndown(vel)
    assert bd["totalPoints"] == 10
    assert len(bd["points"]) == 1


def test_merge_velocity_worklog():
    plan = [{"sprintName": "SP03", "committed": 12, "completed": 0}]
    merged = merge_velocity_with_worklog(plan, {3: 4.5})
    assert merged[0]["planned"] == 12
    assert merged[0]["completed"] == 4.5


def test_worklog_started_date():
    assert worklog_started_date("2026-03-05T10:00:00.000+0900") == date(2026, 3, 5)


def test_current_sprint_burndown():
    sprint_def = {"sp": 7, "label": "SP07", "startDate": "2026-03-30", "endDate": "2026-04-10"}
    daily = {date(2026, 3, 30): 2.0, date(2026, 3, 31): 1.0}
    bd = build_current_sprint_burndown(sprint_def, 10.0, daily)
    assert bd["totalPoints"] == 10
    assert len(bd["points"]) >= 2
    assert bd["points"][-1]["actual"] == 7.0
