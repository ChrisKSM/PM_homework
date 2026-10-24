"""Re-export scripts/delivery_portal_catalog_lib for BE sync."""
from __future__ import annotations

import sys
from pathlib import Path

_scripts = Path(__file__).resolve().parents[2] / "scripts"
if str(_scripts) not in sys.path:
    sys.path.insert(0, str(_scripts))

from delivery_portal_catalog_lib import *  # noqa: F403,E402
