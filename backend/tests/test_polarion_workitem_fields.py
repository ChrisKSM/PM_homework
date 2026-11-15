import asyncio

import httpx

import polarion_client
from polarion_client import (
    _parse_polarion_list_page,
    fetch_list_page,
    fetch_workitem_enriched,
    flatten_polarion_workitem_response,
)
from services.model_status_prd_service import (
    _extract_prd_assignee_with_field,
    normalize_prd_workitem,
)


def _get_workitem_doc() -> dict:
    """getWorkItem (fields[workitems]=@all, include=assignee,author,comments) 응답 형태."""
    return {
        "data": {
            "type": "workitems",
            "id": "AVSWReqMgmt/AVRM-5135",
            "revision": "1234",
            "attributes": {
                "id": "AVRM-5135",
                "title": "[Sound Suite][webOS] Google Cast 지원",
                "type": "PRD",
                "status": "devApproved",
                "created": "2026-09-01T01:00:00Z",
                "updated": "2026-11-06T05:18:09.000Z",
                "description": {"type": "text/html", "value": "<p>desc</p>"},
                "hyperlinks": [
                    {
                        "role": "internal reference",
                        "uri": "http://jira.lge.com/issue/browse/TVPLAT-850395",
                    }
                ],
                "RequestedReviewItems": {"type": "text/html", "value": "<p>Cast 인증</p>"},
            },
            "relationships": {
                "assignee": {"data": [{"type": "users", "id": "inmoon.kim"}], "meta": {}},
                "author": {"data": {"type": "users", "id": "jejun.oh"}},
                "comments": {
                    "data": [
                        {"type": "workitem_comments", "id": "AVSWReqMgmt/AVRM-5135/2"},
                        {"type": "workitem_comments", "id": "AVSWReqMgmt/AVRM-5135/1"},
                    ],
                    "meta": {},
                },
                "project": {"data": {"type": "projects", "id": "AVSWReqMgmt"}},
            },
            "links": {
                "self": "https://alm/polarion/rest/v1/projects/AVSWReqMgmt/workitems/AVRM-5135",
            },
        },
        "included": [
            {"type": "users", "id": "inmoon.kim", "attributes": {"name": "김인문"}},
            {"type": "users", "id": "jejun.oh", "attributes": {"name": "오제준"}},
            {
                "type": "workitem_comments",
                "id": "AVSWReqMgmt/AVRM-5135/1",
                "attributes": {
                    "created": "2026-10-01T02:00:00Z",
                    "text": {"type": "text/html", "value": "첫 코멘트<br/>두번째 줄"},
                },
                "relationships": {"author": {"data": {"type": "users", "id": "jejun.oh"}}},
            },
            {
                "type": "workitem_comments",
                "id": "AVSWReqMgmt/AVRM-5135/2",
                "attributes": {
                    "created": "2026-10-05T03:30:00Z",
                    "text": {"type": "text/plain", "value": "승인합니다"},
                },
                "relationships": {"author": {"data": {"type": "users", "id": "unknown.user"}}},
            },
        ],
    }


def test_detail_maps_updated_assignee_hyperlinks_comments():
    flat = flatten_polarion_workitem_response(_get_workitem_doc())
    item = normalize_prd_workitem(
        {"id": "AVRM-5135", "_detailMerged": flat, "attributes": flat},
        project_key="AVSWReqMgmt",
    )
    assert item["id"] == "AVRM-5135"
    assert item["updated"] == "2026-11-06 05:18"
    assert item["assignee"] == "김인문"
    assert item["initiative"] == "TVPLAT-850395"
    assert item["detail"]["requestedReviewItems"] == "Cast 인증"
    comments = item["detail"]["comments"]
    assert comments.index("첫 코멘트") < comments.index("승인합니다")
    assert "[2026-10-01 02:00 · 오제준]\n첫 코멘트\n두번째 줄" in comments
    assert "unknown.user" in comments


def test_assignee_wins_over_dev_and_author():
    flat = {
        "dev": {"name": "개발자"},
        "author": {"name": "작성자"},
        "assignee": [{"type": "users", "id": "u1", "name": "담당자"}],
    }
    name, field = _extract_prd_assignee_with_field(flat)
    assert (name, field) == ("담당자", "assignee")


def test_assignee_without_include_falls_back_to_user_id():
    doc = _get_workitem_doc()
    doc["included"] = []
    flat = flatten_polarion_workitem_response(doc)
    name, _ = _extract_prd_assignee_with_field(flat)
    assert name == "inmoon.kim"
    assert "_commentsText" not in flat


def test_list_page_resolves_included_assignee_and_hyperlinks():
    doc = _get_workitem_doc()
    page = {"data": [doc["data"]], "included": doc["included"], "meta": {"totalCount": 1}}
    rows, total = _parse_polarion_list_page(page)
    assert total == 1
    item = normalize_prd_workitem(rows[0], project_key="AVSWReqMgmt")
    assert item["assignee"] == "김인문"
    assert item["updated"] == "2026-11-06 05:18"
    assert item["initiative"] == "TVPLAT-850395"


def _response(url: str, status: int, body: dict) -> httpx.Response:
    return httpx.Response(status, json=body, request=httpx.Request("GET", url))


def test_list_fetch_falls_back_when_fields_params_rejected(monkeypatch):
    calls: list[dict] = []

    async def fake_get(url, params=None):
        calls.append(dict(params or {}))
        if params and "fields[workitems]" in params:
            resp = _response(url, 400, {"errors": [{"status": "400"}]})
            resp.raise_for_status()
        return _response(url, 200, {"data": [], "meta": {"totalCount": 0}})

    monkeypatch.setattr(polarion_client, "_get_with_retry", fake_get)
    monkeypatch.setattr(polarion_client, "_is_ootb_rest_v1", lambda: True)
    monkeypatch.setattr(polarion_client, "_LIST_FIELD_PARAMS_REJECTED", set())

    asyncio.run(fetch_list_page(query="type:PRD", project_key="P1"))
    asyncio.run(fetch_list_page(query="type:PRD", project_key="P1", page=2))

    assert calls[0]["include"] == "assignee"
    assert calls[0]["fields[workitems]"] == "@all"
    assert "fields[workitems]" not in calls[1]
    assert len(calls) == 3
    assert "fields[workitems]" not in calls[2]


def test_enriched_detail_requests_spec_fields(monkeypatch):
    calls: list[tuple[str, dict]] = []
    doc = _get_workitem_doc()

    async def fake_get(url, params=None):
        calls.append((url, dict(params or {})))
        return _response(url, 200, doc)

    monkeypatch.setattr(polarion_client, "_get_with_retry", fake_get)
    monkeypatch.setattr(polarion_client, "_base_url", lambda: "https://alm/polarion/rest/v1")

    flat, debug = asyncio.run(fetch_workitem_enriched("AVSWReqMgmt", "AVRM-5135"))
    url, params = calls[0]
    assert url.endswith("/projects/AVSWReqMgmt/workitems/AVRM-5135")
    assert params["fields[workitems]"] == "@all"
    assert params["include"] == "assignee,author,comments"
    assert flat["id"] == "AVRM-5135"
    assert "승인합니다" in flat["_commentsText"]
    assert "commentsEndpoint" not in debug


def test_enriched_detail_uses_comments_endpoint_when_not_included(monkeypatch):
    doc = _get_workitem_doc()
    comments_doc = {"data": doc["included"][2:], "included": doc["included"][:2]}
    doc["included"] = doc["included"][:2]
    seen: list[str] = []

    async def fake_get(url, params=None):
        seen.append(url)
        if url.endswith("/comments"):
            return _response(url, 200, comments_doc)
        return _response(url, 200, doc)

    monkeypatch.setattr(polarion_client, "_get_with_retry", fake_get)
    monkeypatch.setattr(polarion_client, "_base_url", lambda: "https://alm/polarion/rest/v1")

    flat, debug = asyncio.run(fetch_workitem_enriched("AVSWReqMgmt", "AVRM-5135"))
    assert any(u.endswith("/workitems/AVRM-5135/comments") for u in seen)
    assert debug["commentsEndpoint"] is True
    assert "[2026-10-01 02:00 · 오제준]" in flat["_commentsText"]
