from services.initiative_sp_kpi_service import parse_milestone_table_from_description

SAMPLE_TABLE = """
Milestones
Milestone	내용	주체	DoD	DoD Approved By	이해 관계자	Target Sprint	Due date	예상 SP	완료 여부	기타
M1	LGSE 8.4 라이브러리 수령 및 BSP REQ 배포	SoC 센터	라이브러리 수령	initiative owner	SoC	2026_IR3SP14(7/6-7/17)	2026-07-16	25
M2	LGSE 8.4 audio_server 포팅	BSP	8.3 regression	initiative owner	BSP	2026_IR3SP15(7/20-7/31)	2026-07-30	30
M3	DNN 모델 추론	BSP	CPU/memory	initiative owner	BSP	2026_IR4SP16(8/3-8/14)	2026-08-13	40
M4	alsa-extension API	WCS	정상 동작	initiative owner	WCS	2026_IR4SP16(8/3-8/14)	2026-08-13	50
M5	음질팀 기능 검증	음질팀	Pass	initiative owner	음질	2026_IR4SP16(8/3-8/14)	2026-08-13	40
 시작전,  진행중,  완료,  취소,  이슈발생,  해당없음
"""


def test_parse_milestone_table_expected_sp_sum():
    total, rows = parse_milestone_table_from_description(SAMPLE_TABLE)
    assert total == 185.0
    assert len(rows) == 5
    assert rows[0]["milestone"] == "M1"
    assert rows[0]["plannedSp"] == 25
    assert rows[0]["dueDate"] == "2026-07-16"
    assert rows[4]["plannedSp"] == 40


def test_parse_empty():
    assert parse_milestone_table_from_description("") == (0.0, [])
