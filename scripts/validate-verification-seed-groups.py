#!/usr/bin/env python3
"""seed JSON — 제품군별 (모델, 이벤트) 요약 (Excel 대조용)."""
from __future__ import annotations

import json
import sys
from collections import OrderedDict
from pathlib import Path


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "scripts/seed-model-schedule-data.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("rows") if isinstance(data, dict) else data
    if not isinstance(rows, list):
        raise SystemExit("rows[] required")

    groups: OrderedDict[str, list[tuple[str, str]]] = OrderedDict()
    for r in rows:
        cat = str(r.get("category", "")).strip()
        model = str(r.get("model", "")).strip()
        event = str(r.get("event", "")).strip()
        key = (model, event)
        if cat not in groups:
            groups[cat] = []
        if key not in groups[cat]:
            groups[cat].append(key)

    print(f"=== {path} — {len(rows)} rows ===")
    for cat, pairs in groups.items():
        print(f"\n[{cat}]")
        for m, e in pairs:
            n = sum(
                1
                for r in rows
                if r.get("category") == cat and r.get("model") == m and r.get("event") == e
            )
            print(f"  {m} | {e}  ({n} rows)")


if __name__ == "__main__":
    main()
