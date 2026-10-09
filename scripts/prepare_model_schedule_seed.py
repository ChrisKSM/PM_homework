#!/usr/bin/env python3
"""FE modelScheduleRows.prepareModelScheduleRows 와 동일한 seed 보정 (Sound Suite 4모델)."""
from __future__ import annotations

import copy
import json
import re
import sys
from pathlib import Path
from typing import Any

TEST_TYPES = ("일반성능", "호환성", "안정성", "시너지")
SOUND_SUITE_WIFI_CATEGORY = "사운드스위트(Wi-Fi)"

SOUND_SUITE_DETAIL_GROUPS: list[dict[str, Any]] = [
    {"model": "H7", "event": "MR9차", "copyFrom": {"model": "H7", "event": "MR8차"}},
    {"model": "W7", "event": "MR6차", "copyFrom": {"model": "W7", "event": "MR5차"}},
    {"model": "M7/M5", "event": "MR9차", "copyFrom": {"model": "M7/M5", "event": "MR8차"}},
    {
        "model": "H7_VI",
        "event": "개발모델",
        "defaults": {
            "variant": "JDM B_HW",
            "manufacturer": "Tymphany",
            "soc": "ax26sb",
            "staff": "조성연",
            "changes": "500W, 5.1.3 (9.1.6 Spatial) Dolby Atmos, DAFC",
        },
    },
]

CATEGORY_ORDER = [
    "사운드스위트(Wi-Fi)",
    "사운드바(Wi-Fi)",
    "사운드바",
    "파티스피커(Bluetooth)",
    "파티스피커",
    "무선스피커(Bluetooth)",
    "무선스피커",
    "이어버드",
]


def canonical_model_name(model: str) -> str:
    m = str(model or "").strip()
    if not m:
        return m
    if re.match(r"^H7[\s_]*VI$", m, re.I):
        return "H7_VI"
    return m


def canonical_category(category: str) -> str:
    raw = str(category or "").strip()
    compact = re.sub(r"\s+", "", raw)
    if re.search(r"사운드스위트|soundsuite", compact, re.I):
        return SOUND_SUITE_WIFI_CATEGORY
    if re.match(r"^사운드바\(wi.?fi\)$", compact, re.I):
        return "사운드바(Wi-Fi)"
    if compact == "사운드바" or ("사운드바" in raw and not re.search(r"wi.?fi", raw, re.I)):
        return "사운드바"
    if "파티스피커" in raw:
        return "파티스피커(Bluetooth)"
    if "무선스피커" in raw:
        return "무선스피커(Bluetooth)"
    if "이어버드" in raw:
        return "이어버드"
    return raw


def slug_id(*parts: str) -> str:
    raw = "-".join(p for p in parts if p)
    s = re.sub(r"[^a-zA-Z0-9가-힣]+", "-", raw).strip("-").lower()
    return s[:80] or "row"


def repair_legacy_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = [copy.deepcopy(r) for r in rows]
    legacy = [
        r
        for r in out
        if canonical_category(r.get("category", "")) == "사운드바(Wi-Fi)"
        and r.get("model") == "H7"
        and str(r.get("event", "")).strip() in ("MR8차", "MR8")
    ]
    if len(legacy) != 8:
        return out
    by_type: dict[str, list[dict[str, Any]]] = {}
    for r in legacy:
        by_type.setdefault(str(r.get("testType", "")), []).append(r)
    if not all(len(by_type.get(tt, [])) == 2 for tt in TEST_TYPES):
        return out
    for tt in TEST_TYPES:
        pair = by_type[tt]
        rollback = next(
            (r for r in pair if r.get("status") in ("예정", "검증제외")),
            None,
        )
        if rollback is None:
            rollback = next((r for r in pair if "MCC" not in str(r.get("changes", ""))), pair[1])
        rollback["event"] = "MR8_Rollback"
        rollback["changes"] = "4. DTS:X 지원"
    return out


def ensure_sound_suite_detail_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = [copy.deepcopy(r) for r in rows]
    cat = SOUND_SUITE_WIFI_CATEGORY

    for r in out:
        r["model"] = canonical_model_name(str(r.get("model", "")))
        r["category"] = canonical_category(str(r.get("category", "")))

    for spec in SOUND_SUITE_DETAIL_GROUPS:
        model = spec["model"]
        event = spec["event"]
        existing = [
            r
            for r in out
            if r.get("model") == model
            and r.get("event") == event
            and canonical_category(str(r.get("category", ""))) == cat
        ]
        if len(existing) >= 4:
            continue

        for r in out:
            if r.get("model") == model and r.get("event") == event:
                r["category"] = cat

        again = [
            r
            for r in out
            if r.get("model") == model
            and r.get("event") == event
            and canonical_category(str(r.get("category", ""))) == cat
        ]
        if len(again) >= 4:
            continue

        copy_from = spec.get("copyFrom")
        template = None
        if copy_from:
            template = next(
                (r for r in out if r.get("model") == copy_from["model"] and r.get("event") == copy_from["event"]),
                None,
            )
        base = template or next((r for r in out if r.get("model") == model), None)
        defaults = spec.get("defaults") or {}

        for tt in TEST_TYPES:
            row_id = f"ms-{slug_id(model, event, tt)}"
            if any(r.get("id") == row_id for r in out):
                continue
            bars = []
            if tt == "일반성능" and template and template.get("bars"):
                bars = copy.deepcopy(template["bars"])
            out.append(
                {
                    "id": row_id,
                    "category": cat,
                    "model": model,
                    "event": event,
                    "variant": defaults.get("variant") or (base or {}).get("variant", ""),
                    "manufacturer": defaults.get("manufacturer") or (base or {}).get("manufacturer", ""),
                    "soc": defaults.get("soc") or (base or {}).get("soc", ""),
                    "staff": defaults.get("staff") or (base or {}).get("staff", ""),
                    "testType": tt,
                    "changes": defaults.get("changes", "") if tt == "일반성능" else "",
                    "status": "예정",
                    "bars": bars,
                }
            )

    return out


def sort_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def cat_idx(c: str) -> int:
        n = canonical_category(c)
        try:
            return CATEGORY_ORDER.index(n)
        except ValueError:
            return len(CATEGORY_ORDER)

    def tt_idx(t: str) -> int:
        try:
            return TEST_TYPES.index(t)
        except ValueError:
            return 0

    return sorted(
        rows,
        key=lambda r: (
            cat_idx(str(r.get("category", ""))),
            str(r.get("model", "")),
            str(r.get("event", "")),
            tt_idx(str(r.get("testType", ""))),
        ),
    )


def prepare_model_schedule_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    prepared = ensure_sound_suite_detail_rows(repair_legacy_rows(rows))
    for r in prepared:
        r["model"] = canonical_model_name(str(r.get("model", "")))
        r["category"] = canonical_category(str(r.get("category", "")))
    return sort_rows(prepared)


def main() -> None:
    seed_path = Path(sys.argv[1] if len(sys.argv) > 1 else "scripts/seed-model-schedule-data.json")
    data = json.loads(seed_path.read_text(encoding="utf-8"))
    rows = data.get("rows") if isinstance(data, dict) else data
    if not isinstance(rows, list):
        raise SystemExit("seed JSON must contain rows[]")
    prepared = prepare_model_schedule_rows(rows)
    if isinstance(data, dict):
        data["rows"] = prepared
        data["count"] = len(prepared)
        payload = data
    else:
        payload = {"rows": prepared, "count": len(prepared)}
    seed_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    suite = [r for r in prepared if canonical_category(r.get("category", "")) == SOUND_SUITE_WIFI_CATEGORY]
    h7vi = sum(1 for r in prepared if r.get("model") == "H7_VI")
    print(f"Wrote {seed_path} — {len(prepared)} rows (사운드스위트 {len(suite)}, H7_VI rows {h7vi})")


if __name__ == "__main__":
    main()
