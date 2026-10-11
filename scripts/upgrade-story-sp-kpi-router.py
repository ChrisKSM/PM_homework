#!/usr/bin/env python3
"""Upgrade routers/model_status.py story-sp-kpi handler (debug_initiative_key, v4)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/project")
ROUTER = ROOT / "routers" / "model_status.py"

HANDLER = '''
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
                "hint": "sh scripts/patch-be-story-sp-kpi-standalone.sh",
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
'''.strip()


def main() -> int:
    force = "--force" in sys.argv
    root_arg = next((a for a in sys.argv[1:] if not a.startswith("-")), None)
    if root_arg:
        global ROOT, ROUTER
        ROOT = Path(root_arg)
        ROUTER = ROOT / "routers" / "model_status.py"
    if not ROUTER.is_file():
        print(f"NG: {ROUTER} missing")
        return 1
    text = ROUTER.read_text(encoding="utf-8")
    if "debug_initiative_key" in text and not force:
        print("OK  debug_initiative_key already in router (use --force to replace handler)")
        return 0
    pattern = re.compile(
        r"@router\.get\(\"/initiatives/story-sp-kpi\"\).*?"
        r"(?=\n@router\.get|\nasync def |\nclass |\Z)",
        re.DOTALL,
    )
    if not pattern.search(text):
        print("NG: story-sp-kpi handler not found — insert via patch-be-story-sp-kpi-router-snippet.py")
        return 1
    new_text = pattern.sub(HANDLER + "\n\n", text, count=1)
    ROUTER.write_text(new_text, encoding="utf-8")
    print(f"OK  upgraded story-sp-kpi handler in {ROUTER}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
