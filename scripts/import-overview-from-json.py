#!/usr/bin/env python3
"""스프레드시트 JSON(병합 셀 export) → overview seed JSON

## Import rules (fill-down / forward-fill)

스프레드시트에서 세로 병합된 A~H 열을 JSON으로 내릴 때 `null`은 **바로 위 행과 동일**합니다.

1. **Forward-fill 메타 열** — null·빈 문자열이면 이전 행 값 유지:
   `제품군`, `모델명`, `개발등급`, `SoC`, `SW`, `스펙`, `PV`, `MP`

2. **모델 경계** — `모델명`이 명시적으로 바뀌면 새 모델 블록.
   (제품군만 바뀌고 모델명이 null이면 같은 모델의 연속 이벤트 행)

3. **이벤트 행** — 한 JSON 객체 = 스프레드시트 1 sub-row:
   - `HW Event` + `Start Date`/`End Date` → kind=hw ( `-`/blank 제외 )
   - `SW Event` + 동일 날짜 → kind=sw ( `-`/blank 제외 )
   - 같은 행에 HW·SW가 모두 있으면 **각각** 이벤트 1개씩 생성 (날짜 공유)

4. **빈 값** — null, "", "-", "NA", "N/A"

## 권장 export 형식 (선택)

날짜가 HW/SW마다 다를 때는 아래처럼 4개 날짜 열을 권장합니다:
`HW Start`, `HW End`, `SW Start`, `SW End`
(미제공 시 `Start Date`/`End Date`를 HW·SW 공통으로 사용)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_IN = ROOT / "scripts/data/overview-schedule-rows.json"
OUT_JSON = ROOT / "scripts/seed-model-schedule-overview.json"
OUT_TS = ROOT / "src/data/modelScheduleOverviewMock.ts"

META_KEYS = ("제품군", "모델명", "개발등급", "SoC", "SW", "스펙", "PV", "MP")

CATEGORY_ORDER = [
    "Sound Suite",
    "사운드바(Wi-Fi)",
    "사운드바(BT)",
    "사운드바",
    "Accessory",
    "파티스피커",
    "무선스피커",
    "이어버드",
]

SOUND_SUITE_ORDER = [
    "H7_VI",
    "H5",
    "M7_VI",
    "M5_VI",
    "W5",
    "H7 MR10(11월)",
    "M7/W7 MR9(11월)",
]


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def is_blank(v: object) -> bool:
    if v is None:
        return True
    s = str(v).strip()
    return not s or s in ("-", "NA", "N/A")


def is_null_meta(v: object) -> bool:
    """병합 셀 export — JSON null 만 이전 행 상속."""
    if v is None:
        return True
    return str(v).strip() == ""


def norm_category(raw: str) -> str:
    c = (raw or "").replace("\n", " ").strip()
    compact = re.sub(r"\s+", "", c)
    if re.search(r"사운드스위트|soundsuite", compact, re.I):
        return "Sound Suite"
    if re.search(r"사운드.*wi.?fi", compact, re.I):
        return "사운드바(Wi-Fi)"
    if re.search(r"사운드.*bt", compact, re.I):
        return "사운드바(BT)"
    if compact == "사운드바":
        return "사운드바"
    if re.search(r"accessory|액세서리", compact, re.I):
        return "Accessory"
    if "파티" in compact:
        return "파티스피커"
    if "무선" in compact:
        return "무선스피커"
    if "이어" in compact:
        return "이어버드"
    return c


def norm_date(v: object) -> str:
    s = str(v or "").strip()
    if is_blank(s):
        return ""
    s = s.replace("/", "-")
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
    if m:
        y, mo, d = m.groups()
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    return s[:10]


def norm_event_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip())


def forward_fill_rows(rows: list[dict]) -> list[dict]:
    """null 메타 → 같은 모델 블록 내 이전 행 값 상속."""
    state: dict[str, object] = {k: None for k in META_KEYS}
    out: list[dict] = []
    for row in rows:
        filled = dict(row)
        if not is_null_meta(row.get("모델명")):
            prev_category = state.get("제품군")
            state = {
                k: (None if is_null_meta(row.get(k)) else row.get(k))
                for k in META_KEYS
            }
            # 모델만 바뀌고 제품군 null → 이전 제품군 유지 (Sound Suite 등)
            if is_null_meta(row.get("제품군")) and prev_category:
                state["제품군"] = prev_category
        else:
            for k in META_KEYS:
                if not is_null_meta(row.get(k)):
                    state[k] = row.get(k)
        for k in META_KEYS:
            filled[k] = state[k]
        out.append(filled)
    return out


def parse_meta_date(v: object) -> str:
    s = str(v or "").strip()
    if is_blank(s):
        return ""
    s = s.replace("/", "-")
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
    if m:
        y, mo, d = m.groups()
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    m2 = re.match(r"^(\d{2})/(\d{1,2})/(\d{1,2})$", s)
    if m2:
        yy, mo, d = m2.groups()
        return f"20{yy}-{int(mo):02d}-{int(d):02d}"
    return ""


def is_mp_hw_name(name: str) -> bool:
    n = name.lower().replace(" ", "")
    return n == "mp" or "mpapproval" in n


def is_ats_hw_name(name: str) -> bool:
    return name.lower().replace(" ", "") == "ats"


def normalize_model_milestones(entry: dict) -> None:
    """H열 MP / ATS 메타 날짜 → HW MP·ATS 단일일 보정 (긴 막대 오표시 방지)."""
    mp_d = parse_meta_date(entry.get("mp"))
    ats_d = parse_meta_date(entry.get("ats"))
    for e in entry.get("events") or []:
        if e.get("kind") != "hw":
            continue
        if is_mp_hw_name(e["name"]) and mp_d:
            e["start"] = mp_d
            e["end"] = mp_d
        elif is_ats_hw_name(e["name"]) and ats_d:
            e["start"] = ats_d
            e["end"] = ats_d


def parse_event(
    name: object,
    start: object,
    end: object,
    kind: str,
    hw_start: object | None = None,
    hw_end: object | None = None,
    sw_start: object | None = None,
    sw_end: object | None = None,
) -> dict | None:
    if is_blank(name):
        return None
    if kind == "hw" and hw_start is not None:
        s, e = norm_date(hw_start), norm_date(hw_end or hw_start)
    elif kind == "sw" and sw_start is not None:
        s, e = norm_date(sw_start), norm_date(sw_end or sw_start)
    else:
        s, e = norm_date(start), norm_date(end or start)
    if not s:
        return None
    if not e:
        e = s
    return {
        "name": norm_event_name(str(name)),
        "start": s,
        "end": e,
        "kind": kind,
    }


def event_key(e: dict) -> tuple:
    return (e.get("kind", ""), e["name"].lower().replace(" ", ""), e["start"], e["end"])


def rows_to_models(rows: list[dict]) -> list[dict]:
    filled = forward_fill_rows(rows)
    models: list[dict] = []
    by_id: dict[str, dict] = {}
    order: list[str] = []

    for row in filled:
        model = str(row.get("모델명") or "").strip()
        if not model:
            continue
        category = norm_category(str(row.get("제품군") or ""))
        mid = f"ov-{slug(model)}"

        if mid not in by_id:
            entry = {
                "id": mid,
                "category": category,
                "model": model,
                "variant": str(row.get("개발등급") or "").strip(),
                "manufacturer": "",
                "soc": str(row.get("SoC") or "").strip(),
                "hwPm": "",
                "swPo": "",
                "swPm": str(row.get("SW") or "").strip(),
                "spec": str(row.get("스펙") or "").strip(),
                "pv": str(row.get("PV") or "").strip(),
                "mp": str(row.get("MP") or "").strip(),
                "ats": "",
                "events": [],
            }
            by_id[mid] = entry
            models.append(entry)
            order.append(mid)
        else:
            entry = by_id[mid]
            # 같은 모델 블록 내 후속 행에서 메타가 명시되면 갱신 (드문 케이스)
            for src, dst in (
                ("개발등급", "variant"),
                ("SoC", "soc"),
                ("SW", "swPm"),
                ("스펙", "spec"),
                ("PV", "pv"),
                ("MP", "mp"),
            ):
                v = row.get(src)
                if not is_blank(v):
                    entry[dst] = str(v).strip()

        seen = {event_key(e) for e in entry["events"]}
        start = row.get("Start Date")
        end = row.get("End Date")
        hw = parse_event(
            row.get("HW Event"),
            start,
            end,
            "hw",
            hw_start=row.get("HW Start"),
            hw_end=row.get("HW End"),
        )
        sw = parse_event(
            row.get("SW Event"),
            start,
            end,
            "sw",
            sw_start=row.get("SW Start"),
            sw_end=row.get("SW End"),
        )
        for ev in (hw, sw):
            if ev and event_key(ev) not in seen:
                seen.add(event_key(ev))
                entry["events"].append(ev)

    for entry in models:
        normalize_model_milestones(entry)

    return models


def sort_models(models: list[dict]) -> list[dict]:
    sound_idx = {m: i for i, m in enumerate(SOUND_SUITE_ORDER)}

    def cat_idx(c: str) -> int:
        n = norm_category(c)
        try:
            return CATEGORY_ORDER.index(n)
        except ValueError:
            return len(CATEGORY_ORDER)

    def model_sort_key(m: dict) -> tuple:
        cat = norm_category(m["category"])
        if cat == "Sound Suite":
            return (cat_idx(cat), sound_idx.get(m["model"], len(SOUND_SUITE_ORDER)))
        return (cat_idx(cat), m["model"])

    return sorted(models, key=model_sort_key)


def write_outputs(models: list[dict]) -> None:
    payload = {"models": models}
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ts = "import type { OverviewModel } from '../types/modelScheduleOverview'\n\n"
    ts += "/** overview-schedule-rows.json import (병합 셀 fill-down 규칙) */\n"
    ts += f"export const OVERVIEW_MOCK_MODELS: OverviewModel[] = {json.dumps(models, ensure_ascii=False, indent=2)}\n"
    OUT_TS.write_text(ts, encoding="utf-8")


def main() -> None:
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    if not in_path.is_file():
        print(f"Error: {in_path} not found", file=sys.stderr)
        sys.exit(1)

    rows = json.loads(in_path.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        print("Error: JSON root must be an array", file=sys.stderr)
        sys.exit(1)

    models = sort_models(rows_to_models(rows))
    write_outputs(models)

    print(f"Wrote {len(models)} models → {OUT_JSON} (from {in_path.name})")
    for m in models:
        hw = sum(1 for e in m["events"] if e.get("kind") == "hw")
        sw = len(m["events"]) - hw
        print(f"  {m['category']:18} {m['model']:22} hw={hw} sw={sw}")


if __name__ == "__main__":
    main()
