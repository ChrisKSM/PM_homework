from polarion_client import flatten_polarion_workitem_response


def test_jsonapi_resolves_dev_user_and_hyperlink():
    doc = {
        "data": {
            "type": "workitems",
            "id": "AVRM-5135",
            "attributes": {
                "title": "Cast",
                "updated": "2026-11-06T05:18:09.000Z",
            },
            "relationships": {
                "dev": {"data": {"type": "users", "id": "u1"}},
            },
        },
        "included": [
            {
                "type": "users",
                "id": "u1",
                "attributes": {"name": "김인문 inmoon.kim"},
            },
            {
                "type": "workitemHyperlinks",
                "id": "h1",
                "attributes": {
                    "role": "internal reference",
                    "uri": "http://jira.lge.com/issue/browse/TVPLAT-850395",
                },
            },
        ],
    }
    flat = flatten_polarion_workitem_response(doc)
    assert "김인문" in str(flat.get("dev", {}).get("name", flat.get("dev")))
    assert flat.get("_hyperlinks")
    assert any("TVPLAT" in hl.get("uri", "") for hl in flat["_hyperlinks"])


def test_initiative_from_hyperlinks():
    from services.model_status_prd_service import _extract_prd_initiative_links

    flat = {
        "_hyperlinks": [
            {
                "role": "internal reference",
                "uri": "http://jira.lge.com/issue/browse/TVPLAT-1014820",
            }
        ]
    }
    label, url = _extract_prd_initiative_links(flat)
    assert label == "TVPLAT-1014820"
    assert "jira.lge.com" in url
