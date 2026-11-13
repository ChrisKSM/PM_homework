#!/usr/bin/env python3
"""seed / mock JSON에서 사운드바(Wi-Fi) 행 제거."""
from __future__ import annotations

import json
import sys
from pathlib import Path

DROP = "사운드바(Wi-Fi)"


def purge_file(path: Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("rows") if isinstance(data, dict) else data
    if not isinstance(rows, list):
        raise SystemExit(f"{path}: rows[] required")
    kept = [r for r in rows if DROP not in str(r.get("category", "")).replace(" ", "")]
    removed = len(rows) - len(kept)
    if isinstance(data, dict):
        data["rows"] = kept
        data["count"] = len(kept)
        out = data
    else:
        out = {"rows": kept, "count": len(kept)}
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{path}: removed {removed}, kept {len(kept)}")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    for rel in ("scripts/seed-model-schedule-data.json", "public/model-schedule-verification-mock.json"):
        p = root / rel
        if p.is_file():
            purge_file(p)


if __name__ == "__main__":
    main()
