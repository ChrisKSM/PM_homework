"""Re-export scripts/delivery_portal_catalog_lib for BE sync."""
from __future__ import annotations

import sys
from pathlib import Path


def _scripts_dir() -> Path:
    """BE pod flat (/workspace/project/services) vs repo (backend/services)."""
    here = Path(__file__).resolve().parent
    for base in (here.parent, here.parent.parent):
        cand = base / "scripts"
        if (cand / "delivery_portal_catalog_lib.py").is_file():
            return cand
    return here.parent / "scripts"


_scripts = _scripts_dir()
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

from delivery_portal_catalog_lib import *  # noqa: F403,E402
