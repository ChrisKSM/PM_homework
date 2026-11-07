"""Polarion PAT — 길이 타당성 + variables/env/settings 선택."""
from polarion_client import polarion_pat, polarion_pat_source

_PAT44 = "a" * 44
_LONG760 = "b" * 760


def test_polarion_pat_prefers_plausible_variables(monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "polarion_pat", "")
    monkeypatch.setenv("POLARION_PAT", "")

    import dej_variables

    monkeypatch.setattr(
        dej_variables, "dej_get", lambda key: _PAT44 if key == "POLARION_PAT" else ""
    )

    assert polarion_pat() == _PAT44
    assert polarion_pat_source() == "variables:POLARION_PAT"


def test_polarion_pat_skips_implausible_variables_for_env(monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "polarion_pat", "stale-from-dotenv")
    monkeypatch.setenv("POLARION_PAT", _PAT44)

    import dej_variables

    monkeypatch.setattr(
        dej_variables, "dej_get", lambda key: _LONG760 if key == "POLARION_PAT" else ""
    )

    assert polarion_pat() == _PAT44
    assert polarion_pat_source() == "env:POLARION_PAT"


def test_polarion_pat_env_before_settings(monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "polarion_pat", "stale-from-dotenv")
    monkeypatch.setenv("POLARION_PAT", _PAT44)

    import dej_variables

    monkeypatch.setattr(dej_variables, "dej_get", lambda _key: "")

    assert polarion_pat() == _PAT44
    assert polarion_pat_source() == "env:POLARION_PAT"


def test_polarion_pat_falls_back_to_settings(monkeypatch):
    from config import settings

    monkeypatch.setattr(settings, "polarion_pat", _PAT44)
    monkeypatch.delenv("POLARION_PAT", raising=False)

    import dej_variables

    monkeypatch.setattr(dej_variables, "dej_get", lambda _key: "")

    assert polarion_pat() == _PAT44
    assert polarion_pat_source() == "settings.polarion_pat"
