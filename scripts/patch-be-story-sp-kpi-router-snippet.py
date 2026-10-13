#!/usr/bin/env python3
"""Insert /initiatives/story-sp-kpi route into routers/model_status.py if missing."""
from __future__ import annotations

import sys
from pathlib import Path

ROUTE_MARKER = '/initiatives/story-sp-kpi'

ROUTE_BLOCK = '''

@router.get("/initiatives/story-sp-kpi")
async def initiatives_story_sp_kpi(
    model: str | None = Query(None),
    label: str | None = Query(None),
    project: str = Query("TVPLAT"),
    debug_initiative_key: str | None = Query(
        None, description="예: TVPLAT-943406 — Description·Story SP 진단"
    ),
):
    """
    KPI-1 SP 소진율 — 라벨 Initiative Description '예상 SP' 합 vs Story SP 합.
    """
    if not (label and label.strip()) and model:
        auto = model_status_initiative_service.resolve_initiative_label(model, None)
        if auto:
            label = auto
    try:
        from services.initiative_sp_kpi_service import preview_story_sp_kpi

        return await preview_story_sp_kpi(
            model=model,
            label=label,
            project_key=project,
            debug_initiative_key=debug_initiative_key,
        )
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "message": f"initiative_sp_kpi_service missing: {e}",
                "hint": "curl GitHub patch-be-story-sp-kpi-service-only.sh on BE pod",
                "plannedSpTotal": None,
            },
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={
                "message": str(e),
                "plannedSpTotal": None,
                "hint": "TVJIRA_API_TOKEN · GET /api/model-status/initiatives/ping",
            },
        ) from e

'''


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/project")
    path = root / "routers" / "model_status.py"
    if not path.is_file():
        print(f"NG: {path} not found")
        return 1
    text = path.read_text(encoding="utf-8")
    if ROUTE_MARKER in text:
        if "debug_initiative_key" in text:
            print("OK  story-sp-kpi route already present (with debug_initiative_key)")
        else:
            print(
                "WARN story-sp-kpi present but missing debug_initiative_key — "
                "run: python3 scripts/upgrade-story-sp-kpi-router.py"
            )
        return 0
    import re

    m = re.search(
        r'@router\.get\("/initiatives/ping"\).*?\n\n(?=@router\.get)',
        text,
        flags=re.DOTALL,
    )
    if m:
        insert_at = m.end() - 1
    else:
        anchor = '@router.get("/initiatives'
        idx = text.find(anchor)
        if idx < 0:
            print("NG: cannot find insertion anchor in model_status.py")
            return 1
        insert_at = idx
    new_text = text[:insert_at] + ROUTE_BLOCK + text[insert_at:]
    path.write_text(new_text, encoding="utf-8")
    print(f"OK  inserted story-sp-kpi route into {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
