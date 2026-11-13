import os

import pytest

from tvjira_client import resolve_tvjira_token, tvjira_token_source_info


def test_tvjira_token_from_env(monkeypatch):
    monkeypatch.setenv("TVJIRA_API_TOKEN", "test-tv-pat")
    # settings may cache empty — env fallback still works
    source, length = tvjira_token_source_info()
    assert length == len("test-tv-pat")
    assert source.startswith("env:")
    assert resolve_tvjira_token() == "test-tv-pat"


def test_tvjira_token_missing(monkeypatch):
    monkeypatch.delenv("TVJIRA_API_TOKEN", raising=False)
    monkeypatch.delenv("TVJIRA_TOKEN", raising=False)
    monkeypatch.delenv("TVJIRA_PAT", raising=False)
    with pytest.raises(ValueError, match="TVJIRA_API_TOKEN"):
        resolve_tvjira_token()
