import unittest

from polarion_client import build_query, normalize_project_names, to_polarion_date


H7 = "[MR_Minor] 26년 Sound Suite H7 정기 MR8 (9월)"
M7 = "2025_M7_NA_B_HW"


class PolarionQueryTests(unittest.TestCase):
    def test_normalize_dedupes_and_strips(self):
        self.assertEqual(
            normalize_project_names(["  a  ", "a", "", "b"]),
            ["a", "b"],
        )
        self.assertEqual(normalize_project_names(H7), [H7])
        self.assertEqual(normalize_project_names(""), [])

    def test_to_polarion_date(self):
        self.assertEqual(to_polarion_date("2026-09-09"), "20260909")
        self.assertEqual(to_polarion_date("20260926"), "20260926")
        self.assertEqual(to_polarion_date(""), "")

    def test_target_103_query_project_and_created(self):
        query = build_query(
            project_name=[H7, M7],
            event_sequence="",
            created_from="2026-09-09",
            created_to="2026-09-26",
        )
        self.assertEqual(
            query,
            f'type:testDefect AND project_name:("{H7}" OR "{M7}") '
            "AND created:[20260909 TO 20260926]",
        )

    def test_project_names_are_or(self):
        query = build_query(project_name=[H7, M7])
        self.assertIn(f'project_name:("{H7}" OR "{M7}")', query)
        self.assertNotIn(" AND ", query.split("project_name:")[1].split(")")[0])

    def test_event_sequence_and_all_range(self):
        all_query = build_query(project_name=[H7], event_sequence="ALL")
        self.assertIn("eventSequence.1:[00000000001 TO 00000000005]", all_query)
        third = build_query(project_name=[H7], event_sequence="3")
        self.assertIn("eventSequence.KEY:3", third)

    def test_default_dashboard_query_combines_or_and_and(self):
        query = build_query(
            project_name=[H7, M7],
            event_sequence="ALL",
            created_from="20260909",
            created_to="20260926",
        )
        self.assertEqual(
            query,
            f'type:testDefect AND project_name:("{H7}" OR "{M7}") '
            "AND eventSequence.1:[00000000001 TO 00000000005] "
            "AND created:[20260909 TO 20260926]",
        )

    def test_empty_project_name_omits_clause(self):
        query = build_query(project_name="", event_sequence="ALL")
        self.assertNotIn("project_name:", query)


if __name__ == "__main__":
    unittest.main()
