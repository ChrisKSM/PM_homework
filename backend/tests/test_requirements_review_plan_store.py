import pytest

from services import requirements_review_plan_store as store


class FakeMongo:
    def __init__(self):
        self.docs: dict[str, dict] = {}

    def ensure_collection(self, name):
        return True

    def collection_error(self, name):
        return "unavailable"

    def get_all_documents(self, collection, use_cache=False):
        return [dict(d) for d in self.docs.values()]

    def insert_documents(self, collection, documents):
        for d in documents:
            self.docs[d["id"]] = dict(d)
        return True

    def update_document(self, collection, doc_id, updates):
        if doc_id not in self.docs:
            return False
        self.docs[doc_id].update(updates)
        return True


@pytest.fixture
def fake_mongo(monkeypatch):
    fake = FakeMongo()
    monkeypatch.setattr(store, "mongo_helper", fake)
    return fake


def test_save_then_update_keeps_created_at(fake_mongo):
    first = store.save_plan(
        prd_id="AVSWReqMgmt/AVRM-5327",
        apply_month="2027-01",
        apply_scopes=["tv", "product", "tv"],
        dev_team=" Audio SW 1팀 ",
        action_item="TV 연동 사양 확인",
        due_date="2026-12-15",
    )
    assert first["prdId"] == "AVRM-5327"
    assert first["applyScopes"] == ["product", "tv"]
    assert first["devTeam"] == "Audio SW 1팀"

    second = store.save_plan(prd_id="AVRM-5327", apply_month="2027-03", apply_scopes=["app"])
    assert second["createdAt"] == first["createdAt"]
    plans = store.list_plans()
    assert len(plans) == 1
    assert plans[0]["applyMonth"] == "2027-03"
    assert plans[0]["applyScopes"] == ["app"]
    assert plans[0]["actionItem"] == ""


@pytest.mark.parametrize(
    "kwargs",
    [
        {"prd_id": 'AVRM-1" || row_id != "'},
        {"prd_id": "AVRM-1", "apply_month": "2027-13"},
        {"prd_id": "AVRM-1", "apply_scopes": ["mobile"]},
        {"prd_id": "AVRM-1", "due_date": "2026-02-30"},
    ],
)
def test_rejects_invalid_input(fake_mongo, kwargs):
    with pytest.raises(ValueError):
        store.save_plan(**kwargs)
    assert fake_mongo.docs == {}


def test_list_raises_when_store_unavailable(monkeypatch):
    fake = FakeMongo()
    fake.ensure_collection = lambda name: False
    monkeypatch.setattr(store, "mongo_helper", fake)
    with pytest.raises(RuntimeError):
        store.list_plans()
