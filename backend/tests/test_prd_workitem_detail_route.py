import asyncio


def test_get_prd_workitem_detail_normalizes(monkeypatch):
    from services import model_status_prd_service as svc

    async def fake_fetch(_url: str):
        return {
            "title": "Cast",
            "updated": "2026-11-06T05:18:09.000Z",
            "status": {"id": "closed", "name": "Closed"},
            "dev": {"name": "김인문 inmoon.kim"},
            "_hyperlinks": [
                {
                    "role": "internal reference",
                    "uri": "http://jira.lge.com/issue/browse/TVPLAT-850395",
                }
            ],
            "userValue": "목적 텍스트",
        }

    monkeypatch.setattr(svc, "polarion_pat_configured", lambda: True)
    async def fake_enriched(_proj: str, _wid: str):
        return await fake_fetch(""), {"attempts": [{"ok": True, "keys": 10}]}

    monkeypatch.setattr("polarion_client.fetch_workitem_enriched", fake_enriched)

    out = asyncio.run(svc.get_prd_workitem_detail("AVRM-5135"))
    item = out["item"]
    assert item["id"] == "AVRM-5135"
    assert "김인문" in item["assignee"]
    assert item["workflowStageId"] == "dev_approved"
    assert item["initiative"] == "TVPLAT-850395"
    assert item.get("detail", {}).get("userValue") == "목적 텍스트"
