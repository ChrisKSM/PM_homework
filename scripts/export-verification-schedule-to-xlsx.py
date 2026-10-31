#!/usr/bin/env python3
"""seed JSON → 모델 검증 일정 Excel (import 스크립트 round-trip / 템플릿용)."""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta
from pathlib import Path

try:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
except ImportError as e:
    raise SystemExit("openpyxl 필요: pip install openpyxl") from e

BAR_FILL = {
    "planned": "94A3B8",
    "inprogress": "FACC15",
    "event_ng": "EF4444",
    "event_ok": "22C55E",
    "event_done_est": "A78BFA",
    "su_fota": "F97316",
}

META_HEADERS = (
    "제품군",
    "모델명",
    "이벤트",
    "개발등급",
    "생산업체",
    "SoC",
    "담당",
    "구분",
    "주요 변경점",
    "Status",
)


def parse_iso(s: str) -> date:
    return datetime.strptime(s[:10], "%Y-%m-%d").date()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "-i",
        "--input",
        type=Path,
        default=Path("scripts/seed-model-schedule-data.json"),
    )
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("scripts/data/verification-schedule-detail.xlsx"),
    )
    ap.add_argument("--days", type=int, default=42)
    ap.add_argument("--start", default=None, help="타임라인 시작 (미지정 시 bars 최소일)")
    args = ap.parse_args()

    data = json.loads(args.input.read_text(encoding="utf-8"))
    rows = data["rows"] if isinstance(data, dict) else data
    if args.start:
        start = parse_iso(args.start)
    elif data.get("timelineStart"):
        start = parse_iso(data["timelineStart"])
    else:
        mins: list[date] = []
        for row in rows:
            for bar in row.get("bars") or []:
                mins.append(parse_iso(bar["start"]))
        start = min(mins) if mins else parse_iso("2026-09-15")

    dates = [start + timedelta(days=i) for i in range(args.days)]
    wb = Workbook()
    ws = wb.active
    ws.title = "모델검증일정"

    # Row 1: month hint
    ws.cell(1, 11, f"{dates[0].month}월")
    # Row 2: dates
    for i, d in enumerate(dates):
        ws.cell(2, 11 + i, f"{d.month}/{d.day}")
    # Row 3: weekday
    wd = ("월", "화", "수", "목", "금", "토", "일")
    for i, d in enumerate(dates):
        ws.cell(3, 11 + i, wd[d.weekday()])
    # Row 4: headers
    for i, h in enumerate(META_HEADERS, start=1):
        ws.cell(4, i, h)
        ws.cell(4, i).font = Font(bold=True)

    r = 5
    for row in rows:
        ws.cell(r, 1, row.get("category", ""))
        ws.cell(r, 2, row.get("model", ""))
        ws.cell(r, 3, row.get("event", ""))
        ws.cell(r, 4, row.get("variant", ""))
        ws.cell(r, 5, row.get("manufacturer", ""))
        ws.cell(r, 6, row.get("soc", ""))
        ws.cell(r, 7, row.get("staff", ""))
        ws.cell(r, 8, row.get("testType", ""))
        ws.cell(r, 9, row.get("changes", ""))
        ws.cell(r, 9).alignment = Alignment(wrap_text=True)
        ws.cell(r, 10, row.get("status", ""))

        if row.get("testType") == "일반성능":
            for bar in row.get("bars") or []:
                bs = parse_iso(bar["start"])
                be = parse_iso(bar.get("end") or bar["start"])
                t = bar.get("type") or "planned"
                fill = PatternFill("solid", fgColor=BAR_FILL.get(t, "94A3B8"))
                label = bar.get("label") or ""
                for di, d in enumerate(dates):
                    if bs <= d <= be:
                        c = ws.cell(r, 11 + di, label if d == bs else "")
                        c.fill = fill
        r += 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    wb.save(args.output)
    print(f"Wrote {args.output} ({len(rows)} rows, {args.days} days from {start})")


if __name__ == "__main__":
    main()
