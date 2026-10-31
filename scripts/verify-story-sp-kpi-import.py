#!/usr/bin/env python3
"""BE pod — story-sp-kpi service import smoke test."""
from __future__ import annotations

from services.initiative_sp_kpi_service import parse_milestone_table_from_description

hdr = "Milestone\tSummary\tDue date\t예상 SP"
row = "M1\tx\t2026-01-01\t25"
total, _ = parse_milestone_table_from_description(hdr + "\n" + row)
assert total == 25.0, total
import main  # noqa: F401

print("OK import")
