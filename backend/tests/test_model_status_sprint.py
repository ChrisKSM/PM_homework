from services.model_status_sprint_service import (
    build_sp_burndown,
    build_sp_velocity,
    parse_sp_number,
    resolve_sprint_model_label,
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
