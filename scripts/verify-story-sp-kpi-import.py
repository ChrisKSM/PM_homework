#!/usr/bin/env python3
from services.initiative_sp_kpi_service import parse_milestone_table_from_description
hdr = "Milestone\tSummary\tDue date\t\uc608\uc0c1 SP"
row = "M1\tx\t2026-01-01\t25"
total, _ = parse_milestone_table_from_description(hdr + "\n" + row)
assert total == 25.0, total
import main
print("OK import")
