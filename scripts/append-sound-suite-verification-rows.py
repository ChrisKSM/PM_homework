#!/usr/bin/env python3
"""overview-schedule-rows.json → 검증 일정 상세 ModelRow (Sound Suite / H7_VI 등).

Excel 상세 시트에 없는 사운드스위트 모델을 seed JSON 에 병합합니다.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

TEST_TYPES = ("일반성능", "호환성", "안정성", "시너지")
SUITE_JSON = Path(__file__).resolve().parent / "data" / "overview-schedule-rows.json"
META_JSON = Path(__file__).resolve().parent / "data" / "sound-suite-models.json"
CATEGORY = "사운드스위트(Wi-Fi)"


def slug(*parts: str) -> str:
    raw = "-".join(p for p in parts if p)
    s = re.sub(r"[^a-zA-Z0-9가-힣]+", "-", raw).strip("-").lower()
    return s[:80] or "row"


def load_meta() -> dict[str, dict]:
    if not META_JSON.is_file():
        return {}
    data = json.loads(META_JSON.read_text(encoding="utf-8"))
    return {str(d.get("model", "")).strip(): d for d in data if d.get("model")}


def norm_event(row: dict) -> str:
    ev = str(row.get("SW Event") or row.get("HW Event") or "").strip()
    return ev or "일정"


def append_suite_rows(seed_path: Path) -> int:
    if not SUITE_JSON.is_file():
        print(f"skip: {SUITE_JSON} 없음")
        return 0

    payload = json.loads(seed_path.read_text(encoding="utf-8"))
    rows: list[dict] = list(payload.get("rows") or [])
    existing = {(r.get("model"), r.get("event"), r.get("testType")) for r in rows}
    meta_by_model = load_meta()

    overview = json.loads(SUITE_JSON.read_text(encoding="utf-8"))
    groups: dict[tuple[str, str], dict] = {}
    model_meta: dict[str, dict] = {}

    for row in overview:
        cat = str(row.get("제품군") or "").strip()
        if cat not in ("Sound Suite", "사운드스위트(Wi-Fi)", "사운드스위트"):
            continue
        model = str(row.get("모델명") or "").strip()
        if not model:
            continue
        ev = norm_event(row)
        key = (model, ev)
        start = str(row.get("Start Date") or "")[:10]
        end = str(row.get("End Date") or start)[:10]
        if key not in groups:
            groups[key] = {"start": start, "end": end, "label": ev}
        if row.get("개발등급"):
            model_meta[model] = row

    added = 0
    for (model, ev), g in sorted(groups.items()):
        mm = model_meta.get(model) or {}
        sm = meta_by_model.get(model) or {}
        variant = str(mm.get("개발등급") or sm.get("variant") or "")
        soc = str(mm.get("SoC") or sm.get("soc") or "")
        staff = str(mm.get("SW") or sm.get("swPm") or "")
        changes = str(mm.get("스펙") or sm.get("spec") or "").replace("\n", " ")
        bars = []
        if g["start"]:
            bars = [
                {
                    "start": g["start"],
                    "end": g["end"] or g["start"],
                    "type": "planned",
                    "label": g.get("label") or "",
                }
            ]

        for tt in TEST_TYPES:
            if (model, ev, tt) in existing:
                continue
            rid = slug(model, ev, tt)
            rows.append(
                {
                    "id": f"ms-{rid}",
                    "category": CATEGORY,
                    "model": model,
                    "event": ev,
                    "variant": variant,
                    "manufacturer": "Tymphany" if "VI" in model else "",
                    "soc": soc,
                    "staff": staff,
                    "testType": tt,
                    "changes": changes if tt == "일반성능" else "",
                    "status": "예정",
                    "bars": bars if tt == "일반성능" else [],
                }
            )
            added += 1

    payload["rows"] = rows
    payload["count"] = len(rows)
    seed_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return added


def main() -> None:
    seed = Path(sys.argv[1] if len(sys.argv) > 1 else "scripts/seed-model-schedule-data.json")
    n = append_suite_rows(seed)
    print(f"Sound Suite rows appended: {n} → {seed}")


if __name__ == "__main__":
    main()
