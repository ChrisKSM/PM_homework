import dej_variables
from services.delivery_portal_client import (
    resolve_delivery_portal_all_deliveries_token_pair,
    resolve_delivery_portal_base_url_pair,
    resolve_delivery_portal_program_report_token_pair,
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
    token, source = resolve_delivery_portal_program_report_token_pair()
    assert token == "jwt-from-variables"
    assert source == "variables:DELIVERY_PORTAL_API_TOKEN"
    assert resolve_delivery_portal_token_pair()[0] == "jwt-from-variables"


def test_all_deliveries_token_uses_dedicated_variable(monkeypatch):
    class FakeVars:
        @staticmethod
        def get(key):
            if key == "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN":
                return "gantt-jwt"
            if key == "DELIVERY_PORTAL_API_TOKEN":
                return "report-jwt"
            return None

    monkeypatch.setattr(dej_variables, "_variables_mod", FakeVars())
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    ad, ad_src = resolve_delivery_portal_all_deliveries_token_pair()
    pr, pr_src = resolve_delivery_portal_program_report_token_pair()
    assert ad == "gantt-jwt"
    assert ad_src == "variables:DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN"
    assert pr == "report-jwt"
    assert pr_src == "variables:DELIVERY_PORTAL_API_TOKEN"


def test_normalize_strips_bearer_prefix():
    from services.delivery_portal_client import _normalize_token

    assert _normalize_token("Bearer eyJabc") == "eyJabc"
    assert _normalize_token('  "eyJx"  ') == "eyJx"


def test_all_deliveries_works_when_settings_lacks_new_field(monkeypatch):
    class FakeVars:
        @staticmethod
        def get(key):
            if key == "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN":
                return "gantt-only"
            return None

    monkeypatch.setattr(dej_variables, "_variables_mod", FakeVars())
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    monkeypatch.setattr(
        "services.delivery_portal_client.settings",
        type("S", (), {"delivery_portal_api_token": "x"})(),
    )
    ad, _ = resolve_delivery_portal_all_deliveries_token_pair()
    assert ad == "gantt-only"


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
