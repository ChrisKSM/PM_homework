import asyncio

import httpx
import pytest

import tvjira_client
from services.requirements_review_jira_due import fetch_initiative_due_dates, parse_issue_keys


def test_parse_issue_keys_dedupes_and_uppercases():
    assert parse_issue_keys("tvplat-850395, TVPLAT-1014820 TVPLAT-850395") == [
        "TVPLAT-850395",
        "TVPLAT-1014820",
    ]


@pytest.mark.parametrize("raw", ["", "TVPLAT", "TVPLAT-1/../x", ",".join(f"A-{i}" for i in range(7))])
def test_parse_issue_keys_rejects(raw):
    with pytest.raises(ValueError):
        parse_issue_keys(raw)


def test_fetch_due_dates_maps_fields_and_errors(monkeypatch):
    async def fake_get_issue(key, fields, expand=None):
        assert fields == ["duedate", "summary", "status"]
        if key == "TVPLAT-404":
            req = httpx.Request("GET", "http://jira/issue")
            raise httpx.HTTPStatusError("nf", request=req, response=httpx.Response(404, request=req))
        if key == "TVPLAT-2":
            return {"fields": {"duedate": None, "summary": "No due", "status": {"name": "Open"}}}
        return {"fields": {"duedate": "2026-12-20", "summary": "Cast", "status": {"name": "In Progress"}}}

    monkeypatch.setattr(tvjira_client, "tvjira_get_issue", fake_get_issue)
    monkeypatch.setattr(tvjira_client.settings, "tvjira_base_url", "http://jira.lge.com/issue")

    rows = asyncio.run(fetch_initiative_due_dates(["TVPLAT-1", "TVPLAT-2", "TVPLAT-404"]))
    assert rows[0] == {
        "key": "TVPLAT-1",
        "url": "http://jira.lge.com/issue/browse/TVPLAT-1",
        "dueDate": "2026-12-20",
        "summary": "Cast",
        "status": "In Progress",
    }
    assert rows[1]["dueDate"] == "" and rows[1]["summary"] == "No due"
    assert rows[2]["error"] == "Jira 이슈 없음 (404)"


def test_fetch_due_dates_token_missing_propagates(monkeypatch):
    async def fake_get_issue(key, fields, expand=None):
        raise ValueError("TV Jira token 없음")

    monkeypatch.setattr(tvjira_client, "tvjira_get_issue", fake_get_issue)
    with pytest.raises(ValueError):
        asyncio.run(fetch_initiative_due_dates(["TVPLAT-1"]))
