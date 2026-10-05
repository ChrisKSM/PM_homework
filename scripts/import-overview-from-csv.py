#!/usr/bin/env python3
"""검증일정.csv + 검증일정2.csv → overview seed JSON"""
from __future__ import annotations

import csv
import json
import re
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV1 = ROOT / "scripts/data/verification-schedule-gantt.csv"
CSV2 = ROOT / "scripts/data/verification-schedule-events.csv"
OUT_JSON = ROOT / "scripts/seed-model-schedule-overview.json"
OUT_TS = ROOT / "src/data/modelScheduleOverviewMock.ts"

TIMELINE_START = date(2026, 10, 1)
META_COLS = 12
TIMELINE_COLS = 123


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def norm_model(name: str) -> str:
    return re.sub(r"\s+", "", name or "").upper()


def norm_category(raw: str) -> str:
    c = (raw or "").replace("\n", " ").strip()
    compact = re.sub(r"\s+", "", c)
    if "사운드스위트" in compact or re.search(r"soundsuite", compact, re.I):
        return "Sound Suite"
    if re.search(r"사운드.*wi.?fi", compact, re.I):
        return "사운드바(Wi-Fi)"
    if compact == "사운드바":
        return "사운드바"
    if "파티" in compact:
        return "파티스피커"
    if "무선" in compact:
        return "무선스피커"
    return c or ""


def col_to_date(col_idx: int) -> str:
    d = TIMELINE_START + timedelta(days=col_idx - META_COLS)
    return d.isoformat()


def parse_gantt_events(row: list[str]) -> list[dict]:
    """Timeline cols: label on first cell, bar extends until next label."""
    events: list[dict] = []
    i = META_COLS
    end_col = min(len(row), META_COLS + TIMELINE_COLS)
    while i < end_col:
        label = (row[i] if i < len(row) else "").strip()
        if not label:
            i += 1
            continue
        start_col = i
        i += 1
        while i < end_col:
            nxt = (row[i] if i < len(row) else "").strip()
            if nxt:
                break
            i += 1
        end_col_idx = i - 1
        events.append(
            {
                "name": label,
                "start": col_to_date(start_col),
                "end": col_to_date(end_col_idx),
            }
        )
    return events


def read_csv_text(path: Path) -> str:
    for enc in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            return path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="latin-1")


def parse_csv1(path: Path) -> dict[str, dict]:
    text = read_csv_text(path)
    rows = list(csv.reader(text.splitlines()))
    models: dict[str, dict] = {}
    current_category = ""

    for row in rows:
        if not row or row[0] == "제품군" or row[0] == "모델현황":
            continue
        # skip legend/header rows
        if row[0].startswith(",") or (len(row) > 0 and row[0] in ("", " ") and not (row[1] if len(row) > 1 else "").strip()):
            if len(row) > 1 and row[1].strip():
                pass  # model row with empty category
            else:
                continue

        cat_raw = row[0].strip() if row[0].strip() else current_category
        if cat_raw:
            current_category = norm_category(cat_raw)
        model = (row[1] if len(row) > 1 else "").strip()
        if not model:
            continue

        key = norm_model(model)
        gantt_events = parse_gantt_events(row)

        entry = {
            "id": f"ov-{slug(model)}",
            "category": current_category,
            "model": model.strip(),
            "variant": (row[2] if len(row) > 2 else "").strip(),
            "manufacturer": (row[3] if len(row) > 3 else "").strip(),
            "soc": (row[4] if len(row) > 4 else "").strip(),
            "hwPm": (row[5] if len(row) > 5 else "").strip(),
            "swPo": (row[6] if len(row) > 6 else "").strip(),
            "swPm": (row[7] if len(row) > 7 else "").strip(),
            "spec": (row[8] if len(row) > 8 else "").strip(),
            "pv": (row[9] if len(row) > 9 else "").strip(),
            "mp": (row[10] if len(row) > 10 else "").strip(),
            "ats": (row[11] if len(row) > 11 else "").strip(),
            "events": gantt_events,
        }
        models[key] = entry

    # Fix party speaker category from product knowledge
    for name in ("POWER9000", "STAGE501"):
        if name in models:
            models[name]["category"] = "파티스피커"

    return models


def map_csv2_category(product: str, product_cat: str) -> str | None:
    p = (product or "").lower()
    pc = (product_cat or "").lower()
    if "soundbar_wifi" in p or "soundbar" in p and "wifi" in p:
        return "사운드바(Wi-Fi)"
    if "soundbar_bt" in p:
        return "사운드바"
    if "party" in p or "party" in pc:
        return "파티스피커"
    if "portable" in p or "music" in p or "speaker" in pc:
        if "party" in pc:
            return "파티스피커"
        return "무선스피커"
    return None


def parse_csv2(path: Path) -> dict[str, list[dict]]:
    """model -> list of events"""
    by_model: dict[str, list[dict]] = {}
    with path.open(encoding="cp949", errors="replace") as f:
        reader = csv.DictReader(f)
        for r in reader:
            model = (r.get("Model") or "").strip()
            if not model:
                continue
            key = norm_model(model)
            ev = {
                "name": re.sub(r"\s+", " ", (r.get("Event") or "").strip()),
                "start": (r.get("Start Date") or "").strip()[:10],
                "end": (r.get("End Date") or "").strip()[:10],
            }
            if not ev["start"]:
                continue
            if not ev["end"]:
                ev["end"] = ev["start"]
            by_model.setdefault(key, []).append(ev)
    return by_model


def event_key(e: dict) -> tuple:
    return (e["name"].lower().replace(" ", ""), e["start"], e["end"])


def merge_events(existing: list[dict], extra: list[dict]) -> list[dict]:
    seen = {event_key(e) for e in existing}
    out = list(existing)
    for e in extra:
        k = event_key(e)
        if k not in seen:
            seen.add(k)
            out.append(e)
    return out


def sort_models(models: list[dict]) -> list[dict]:
    order = [
        "사운드바(Wi-Fi)",
        "사운드바",
        "파티스피커",
        "무선스피커",
    ]

    def cat_idx(c: str) -> int:
        n = norm_category(c)
        try:
            return order.index(n)
        except ValueError:
            return len(order)

    return sorted(models, key=lambda m: (cat_idx(m["category"]), m["model"]))


def main() -> None:
    m1 = parse_csv1(CSV1)
    m2 = parse_csv2(CSV2)

    for key, events in m2.items():
        if key in m1:
            m1[key]["events"] = merge_events(m1[key]["events"], events)
        elif events:
            print(f"  warn: csv2 model {key!r} not in csv1, skipped")

    models = sort_models(list(m1.values()))

    payload = {"models": models}
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    ts = "import type { OverviewModel } from '../types/modelScheduleOverview'\n\n"
    ts += "/** 검증일정.csv + 검증일정2.csv import */\n"
    ts += f"export const OVERVIEW_MOCK_MODELS: OverviewModel[] = {json.dumps(models, ensure_ascii=False, indent=2)}\n"
    OUT_TS.write_text(ts, encoding="utf-8")

    print(f"Wrote {len(models)} models → {OUT_JSON}")
    for m in models:
        print(f"  {m['category']:16} {m['model']:10} events={len(m['events'])}")


if __name__ == "__main__":
    main()
