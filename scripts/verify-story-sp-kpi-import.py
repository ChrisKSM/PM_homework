#!/usr/bin/env python3
"""BE pod — story-sp-kpi service import smoke test (standalone patch 후)."""
from __future__ import annotations

from services.initiative_sp_kpi_service import parse_milestone_table_from_description

# Korean milestone table (tabs between columns)
sample = "마일스톤\t산출물\t예상 SP\nM1\tdeliver\t25"
total, _ = parse_milestone_table_from_description(sample)
assert total == 25.0, total
import main  # noqa: F401

print("OK import")
