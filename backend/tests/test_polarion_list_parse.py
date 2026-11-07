from polarion_client import _parse_polarion_list_page


def test_parse_list_dict_data():
    rows, total = _parse_polarion_list_page(
        {"data": {"totalCount": 32, "workitems": [{"id": "A-1"}]}}
    )
    assert total == 32
    assert len(rows) == 1


def test_parse_list_array_data():
    rows, total = _parse_polarion_list_page(
        {"data": [{"page": 1, "totalCount": 2, "workItems": [{"id": "x"}]}]}
    )
    assert total == 2
    assert rows[0]["id"] == "x"


def test_parse_ootb_rest_v1_json_api():
    rows, total = _parse_polarion_list_page(
        {
            "meta": {"totalCount": 1},
            "data": [
                {
                    "type": "workitems",
                    "id": "AVRM-100",
                    "attributes": {"title": "PRD sample", "status": "draft"},
                    "links": {"self": "https://alm.example/rest/v1/workitems/AVRM-100"},
                }
            ],
        }
    )
    assert total == 1
    assert rows[0]["title"] == "PRD sample"
    assert rows[0]["id"] == "AVRM-100"
