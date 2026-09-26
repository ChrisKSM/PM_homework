import asyncio
import unittest
from unittest import mock

import polarion_client as pc
from polarion_client import build_query, normalize_project_names, to_polarion_date


H7 = "[MR_Minor] 26년 Sound Suite H7 정기 MR8 (9월)"
M7 = "2025_M7_NA_B_HW"
PROJECTS = f'(project_name:"{H7}" OR project_name:{M7})'
TARGET_103 = f"created:[20260909 TO 20260926] AND {PROJECTS}"
# 사용자가 Polarion 링크로 확인한 1차 쿼리 (URL decode)
LINK_1CHA = (
    'created:[20260909 TO 20260926] AND eventSequence.KEY:1 AND '
    '(project_name:"[MR_Minor] 26년 Sound Suite H7 정기 MR8 (9월)" OR project_name:2025_M7_NA_B_HW)'
)


class PolarionQueryTests(unittest.TestCase):
    def test_normalize_dedupes_and_strips(self):
        self.assertEqual(normalize_project_names(["  a  ", "a", "", "b"]), ["a", "b"])
        self.assertEqual(normalize_project_names(H7), [H7])
        self.assertEqual(normalize_project_names(""), [])

    def test_to_polarion_date(self):
        self.assertEqual(to_polarion_date("2026-09-09"), "20260909")
        self.assertEqual(to_polarion_date("20260926"), "20260926")
        self.assertEqual(to_polarion_date(""), "")

    def test_all_sequence_matches_target_103_query(self):
        query = build_query(
            project_name=[H7, M7],
            event_sequence="ALL",
            created_from="2026-09-09",
            created_to="2026-09-26",
        )
        self.assertEqual(query, TARGET_103)

    def test_1cha_matches_polarion_link(self):
        query = build_query(
            project_name=[H7, M7],
            event_sequence="1",
            created_from="2026-09-09",
            created_to="2026-09-26",
        )
        self.assertEqual(query, LINK_1CHA)

    def test_single_project_has_no_parentheses(self):
        self.assertEqual(build_query(project_name=[M7]), f"project_name:{M7}")

    def test_empty_project_name_omits_clause(self):
        self.assertNotIn("project_name:", build_query(project_name="", event_sequence="1"))


class FetchFallbackTests(unittest.TestCase):
    def test_rows_without_self_link_are_kept(self):
        rows = [
            {"id": "D-1", "attributes": {"id": "D-1", "title": "a", "status": "open"}},
            {"id": "D-2", "attributes": {"id": "D-2", "title": "b", "status": "fixed"}},
        ]

        async def fake_page(page=1, query="", page_size=100):
            return (rows, 2) if page == 1 else ([], 2)

        with mock.patch.object(pc, "fetch_list_page", fake_page):
            items, stats = asyncio.run(pc.fetch_all_defects_with_stats(project_name=[H7]))

        self.assertEqual([i["id"] for i in items], ["D-1", "D-2"])
        self.assertEqual(stats["polarionTotal"], 2)
        self.assertEqual(stats["detailOk"], 0)

    def test_failed_detail_falls_back_to_row(self):
        rows = [{"id": "D-1", "links": {"self": "http://x/1"}, "attributes": {"id": "D-1", "title": "a"}}]

        async def fake_page(page=1, query="", page_size=100):
            return (rows, 1) if page == 1 else ([], 1)

        async def boom(url):
            raise RuntimeError("503")

        with mock.patch.object(pc, "fetch_list_page", fake_page), mock.patch.object(pc, "fetch_detail", boom):
            items, stats = asyncio.run(pc.fetch_all_defects_with_stats(project_name=[H7]))

        self.assertEqual(len(items), 1)
        self.assertEqual(stats["normalized"], 1)


if __name__ == "__main__":
    unittest.main()
