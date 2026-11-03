import dej_variables
from services.delivery_portal_client import (
    _read_from_dotenv_keys,
    _settings_delivery_portal_token_fallback,
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
    token, source = resolve_delivery_portal_token_pair()
    assert token == "jwt-from-variables"
    assert source == "variables:DELIVERY_PORTAL_API_TOKEN"
    assert resolve_delivery_portal_program_report_token_pair() == (token, source)
    assert resolve_delivery_portal_all_deliveries_token_pair() == (token, source)


def test_program_and_all_deliveries_share_single_resolve(monkeypatch):
    class FakeVars:
        @staticmethod
        def get(key):
            if key == "DELIVERY_PORTAL_API_TOKEN":
                return "shared-jwt"
            return None

    monkeypatch.setattr(dej_variables, "_variables_mod", FakeVars())
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    pr, _ = resolve_delivery_portal_program_report_token_pair()
    ad, _ = resolve_delivery_portal_all_deliveries_token_pair()
    assert pr == ad == "shared-jwt"


def test_settings_fallback_uses_api_token_when_all_deliveries_field_missing(monkeypatch):
    monkeypatch.setattr(dej_variables, "_variables_mod", None)
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    monkeypatch.setattr(
        "services.delivery_portal_client.settings",
        type("S", (), {"delivery_portal_api_token": "from-settings-api"})(),
    )
    assert _settings_delivery_portal_token_fallback() == "from-settings-api"
    token, source = resolve_delivery_portal_all_deliveries_token_pair()
    assert token == "from-settings-api"
    assert source == "settings"


def test_normalize_strips_bearer_prefix():
    from services.delivery_portal_client import _normalize_token

    assert _normalize_token("Bearer eyJabc") == "eyJabc"


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


def test_dotenv_reads_keys_in_priority_order(tmp_path, monkeypatch):
    env = tmp_path / ".env"
    env.write_text(
        "DELIVERY_PORTAL_API_TOKEN=from-api\n"
        "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN=from-ad\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(
        "services.delivery_portal_client._DOTENV_PATHS",
        (env,),
    )
    token, key = _read_from_dotenv_keys(
        "DELIVERY_PORTAL_API_TOKEN",
        "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN",
    )
    assert token == "from-api"
    assert key == "DELIVERY_PORTAL_API_TOKEN"
