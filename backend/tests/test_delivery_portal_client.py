import dej_variables
from services.delivery_portal_client import (
    resolve_delivery_portal_base_url_pair,
    resolve_delivery_portal_token_pair,
)


def test_delivery_portal_token_prefers_dej_over_settings(monkeypatch):
    class FakeVars:
        @staticmethod
        def get(key):
            if key == "DELIVERY_PORTAL_API_TOKEN":
                return "jwt-from-variables"
            return None

    monkeypatch.setattr(dej_variables, "_variables_mod", FakeVars())
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    monkeypatch.setattr(
        "services.delivery_portal_client.settings",
        type(
            "S",
            (),
            {"delivery_portal_api_token": "stale-from-settings"},
        )(),
    )
    token, source = resolve_delivery_portal_token_pair()
    assert token == "jwt-from-variables"
    assert source == "variables:DELIVERY_PORTAL_API_TOKEN"


def test_delivery_portal_base_url_prefers_dej(monkeypatch):
    class FakeVars:
        @staticmethod
        def get(key):
            if key == "DELIVERY_PORTAL_BASE_URL":
                return "https://delivery-portal-backend.apps.hedej.lge.com"
            return None

    monkeypatch.setattr(dej_variables, "_variables_mod", FakeVars())
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    url, source = resolve_delivery_portal_base_url_pair()
    assert url == "https://delivery-portal-backend.apps.hedej.lge.com"
    assert source == "variables:DELIVERY_PORTAL_BASE_URL"
