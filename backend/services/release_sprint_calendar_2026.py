"""2026 Audio release sprint calendar — IR1~IR5, SP01~SP26."""
from __future__ import annotations

from datetime import date
from typing import Any

_RAW: list[tuple[int, int, str, str, str]] = [
    (1, 1, "01", "2026-01-05", "2026-01-16"),
    (2, 1, "02", "2026-01-19", "2026-01-30"),
    (3, 1, "03", "2026-02-02", "2026-02-13"),
    (4, 1, "04", "2026-02-16", "2026-02-27"),
    (5, 1, "05", "2026-03-02", "2026-03-13"),
    (6, 2, "06", "2026-03-16", "2026-03-27"),
    (7, 2, "07", "2026-03-30", "2026-04-10"),
    (8, 2, "08", "2026-04-13", "2026-04-24"),
    (9, 2, "09", "2026-04-27", "2026-05-08"),
    (10, 2, "10", "2026-05-11", "2026-05-22"),
    (11, 3, "11", "2026-05-25", "2026-06-05"),
    (12, 3, "12", "2026-06-08", "2026-06-19"),
    (13, 3, "13", "2026-06-22", "2026-07-03"),
    (14, 3, "14", "2026-07-06", "2026-07-17"),
    (15, 3, "15", "2026-07-20", "2026-07-31"),
    (16, 4, "16", "2026-08-03", "2026-08-14"),
    (17, 4, "17", "2026-08-17", "2026-08-28"),
    (18, 4, "18", "2026-08-31", "2026-09-11"),
    (19, 4, "19", "2026-09-14", "2026-09-25"),
    (20, 4, "20", "2026-09-28", "2026-10-09"),
    (21, 5, "21", "2026-10-12", "2026-10-23"),
    (22, 5, "22", "2026-10-26", "2026-11-06"),
    (23, 5, "23", "2026-11-09", "2026-11-20"),
    (24, 5, "24", "2026-11-23", "2026-12-04"),
    (25, 5, "25", "2026-12-07", "2026-12-18"),
    (26, 5, "26", "2026-12-21", "2027-01-01"),
]

SPRINTS: list[dict[str, Any]] = []
for sp, ir, suf, start, end in _RAW:
    st = date.fromisoformat(start)
    en = date.fromisoformat(end)
    key = f"2026_IR{ir}SP{suf}"
    SPRINTS.append(
        {
            "sp": sp,
            "ir": ir,
            "key": key,
            "label": f"{key}({st.month}/{st.day}-{en.month}/{en.day})",
            "startDate": start,
            "endDate": end,
        }
    )

IR_BANDS = [
    {"id": "ir1", "title": "IR1", "subtitle": "SP01 ~ SP05", "sprintFrom": 1, "sprintTo": 5},
    {"id": "ir2", "title": "IR2", "subtitle": "SP06 ~ SP10", "sprintFrom": 6, "sprintTo": 10},
    {"id": "ir3", "title": "IR3", "subtitle": "SP11 ~ SP15", "sprintFrom": 11, "sprintTo": 15},
    {"id": "ir4", "title": "IR4", "subtitle": "SP16 ~ SP20", "sprintFrom": 16, "sprintTo": 20},
    {"id": "ir5", "title": "IR5", "subtitle": "SP21 ~ SP26", "sprintFrom": 21, "sprintTo": 26},
]

SP_MIN = 1
SP_MAX = 26


def parse_day(s: str | None) -> date | None:
    if not s:
        return None
    t = str(s).strip()[:10]
    if not t or t == "-":
        return None
    try:
        return date.fromisoformat(t)
    except ValueError:
        return None


def sprint_span_for_range(start: date | None, end: date | None) -> tuple[int | None, int | None]:
    if not start and not end:
        return None, None
    start = start or end
    end = end or start
    if not start or not end:
        return None, None
    if end < start:
        start, end = end, start
    matched: list[int] = []
    for s in SPRINTS:
        s0 = date.fromisoformat(s["startDate"])
        s1 = date.fromisoformat(s["endDate"])
        if end < s0 or start > s1:
            continue
        matched.append(s["sp"])
    if not matched:
        return None, None
    return min(matched), max(matched)


def sprint_for_day(d: date | None) -> int | None:
    if not d:
        return None
    for s in SPRINTS:
        s0 = date.fromisoformat(s["startDate"])
        s1 = date.fromisoformat(s["endDate"])
        if s0 <= d <= s1:
            return s["sp"]
    return None


def nearest_sprint_for_day(d: date | None) -> int | None:
    """2026 SP grid 밖 due date(2025 등) → 가장 가까운 SP."""
    if not d:
        return None
    hit = sprint_for_day(d)
    if hit is not None:
        return hit
    best_sp: int | None = None
    best_dist = 10**9
    for s in SPRINTS:
        s0 = date.fromisoformat(s["startDate"])
        s1 = date.fromisoformat(s["endDate"])
        if d < s0:
            dist = (s0 - d).days
        elif d > s1:
            dist = (d - s1).days
        else:
            return s["sp"]
        if dist < best_dist:
            best_dist = dist
            best_sp = s["sp"]
    return best_sp


def calendar_payload() -> dict[str, Any]:
    return {
        "sprintMin": SP_MIN,
        "sprintMax": SP_MAX,
        "sprints": SPRINTS,
        "irBands": IR_BANDS,
    }
