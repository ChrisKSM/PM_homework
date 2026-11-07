"""Polarion PAT — variables/env 가 settings.polarion_pat 보다 우선."""
from polarion_client import polarion_pat, polarion_pat_source


def test_polarion_pat_prefers_dej_over_settings(monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "polarion_pat", "stale-from-dotenv")
    monkeypatch.setenv("POLARION_PAT", "")

    import dej_variables

    monkeypatch.setattr(dej_variables, "dej_get", lambda key: "live-from-variables" if key == "POLARION_PAT" else "")

    assert polarion_pat() == "live-from-variables"
    assert polarion_pat_source() == "variables:POLARION_PAT"


def test_polarion_pat_env_before_settings(monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "polarion_pat", "stale-from-dotenv")
    monkeypatch.setenv("POLARION_PAT", "from-process-env")

    import dej_variables

    monkeypatch.setattr(dej_variables, "dej_get", lambda _key: "")

    assert polarion_pat() == "from-process-env"
    assert polarion_pat_source() == "env:POLARION_PAT"


def test_polarion_pat_falls_back_to_settings(monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "polarion_pat", "only-in-settings")
    monkeypatch.delenv("POLARION_PAT", raising=False)

    import dej_variables

    monkeypatch.setattr(dej_variables, "dej_get", lambda _key: "")

    assert polarion_pat() == "only-in-settings"
    assert polarion_pat_source() == "settings.polarion_pat"
