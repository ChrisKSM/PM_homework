#!/usr/bin/env python3
"""첨부 HW Event 표 → overview-schedule-rows.json HW 날짜 갱신 후 seed 재생성."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROWS = ROOT / "scripts/data/overview-schedule-rows.json"

# 모델별 HW Event (Start, End) — 2026 unless YYYY-MM-DD
HW: dict[str, dict[str, tuple[str, str]]] = {
    "H7_VI": {
        "PrePV": ("2026-09-04", "2026-10-20"),
        "PV1": ("2026-10-21", "2026-11-04"),
        "PV2": ("2026-11-05", "2026-11-30"),
        "MP": ("2026-12-14", "2026-12-14"),
        "ATS": ("2027-02-08", "2027-02-08"),
    },
    "H5": {
        "PV1": ("2026-10-21", "2026-11-25"),
        "PV2": ("2026-11-26", "2026-12-30"),
        "MP": ("2027-01-11", "2027-01-11"),
        "ATS": ("2027-03-08", "2027-03-08"),
    },
    "W5": {
        "PrePV": ("2026-09-04", "2026-10-15"),
        "PV1": ("2026-10-16", "2026-12-04"),
        "PV2": ("2026-12-05", "2027-01-10"),
        "MP": ("2027-01-22", "2027-01-22"),
        "ATS": ("2027-03-19", "2027-03-19"),
    },
    "M7_VI": {
        "PrePV": ("2026-09-07", "2026-11-04"),
        "PV1": ("2026-11-05", "2026-12-14"),
        "PV2": ("2026-12-15", "2027-02-16"),
        "MP": ("2027-02-28", "2027-02-28"),
        "ATS": ("2027-04-25", "2027-04-25"),
    },
    "M5_VI": {
        "PV1": ("2026-11-05", "2026-12-14"),
        "PV2": ("2026-12-15", "2027-02-16"),
        "MP": ("2027-02-28", "2027-02-28"),
        "ATS": ("2027-04-25", "2027-04-25"),
    },
    "S80C": {
        "PrePV": ("2026-08-13", "2026-09-11"),
        "PV1": ("2026-09-12", "2026-11-09"),
        "PV2": ("2026-11-10", "2026-12-14"),
        "MP": ("2026-12-28", "2026-12-28"),
        "ATS": ("2027-02-22", "2027-02-22"),
    },
    "SB_CH": {
        "PV2": ("2026-10-15", "2026-11-17"),
        "MP": ("2026-11-27", "2026-11-27"),
        "ATS": ("2027-01-22", "2027-01-22"),
    },
}

PV_MP = {
    "H7_VI": ("2026/11/30", "2026/12/14"),
    "H5": ("2026/12/30", "2027/1/11"),
    "W5": ("2027/1/10", "2027/1/22"),
    "M7_VI": ("2027/2/16", "2027/2/28"),
    "M5_VI": ("2027/2/16", "2027/2/28"),
    "S80C": ("2026/12/14", "2026/12/28"),
    "SB_CH": ("2026/11/17", "2026/11/27"),
}


def main() -> int:
    rows = json.loads(ROWS.read_text(encoding="utf-8"))
    updated = 0
    current_model: str | None = None
    for row in rows:
        if row.get("모델명"):
            current_model = str(row["모델명"]).strip()
        model = current_model
        if not model or model not in HW:
            continue
        hw = str(row.get("HW Event") or "").strip()
        if hw in ("-", "") or hw not in HW[model]:
            continue
        start, end = HW[model][hw]
        row["Start Date"] = start
        row["End Date"] = end
        updated += 1
        if hw == "PrePV" and model in PV_MP:
            pv, mp = PV_MP[model]
            row["PV"] = pv
            row["MP"] = mp

    ROWS.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"updated {updated} HW rows in {ROWS}")
    subprocess.check_call([sys.executable, str(ROOT / "scripts/import-overview-from-json.py")])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
