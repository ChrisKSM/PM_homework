import pytest

import dej_variables
from jira_client import _token_from_dej_or_env


def test_runtime_get_falls_back_to_os_env(monkeypatch):
    monkeypatch.setenv("JIRA_API_TOKEN", "from-os")
    assert dej_variables.runtime_get("JIRA_API_TOKEN") == "from-os"


def test_dej_get_preferred_over_os(monkeypatch):
    monkeypatch.setenv("JIRA_API_TOKEN", "from-os")

    class FakeVars:
        @staticmethod
        def get(key):
            if key == "JIRA_API_TOKEN":
                return "from-dej"
            return None

    monkeypatch.setattr(dej_variables, "_variables_mod", FakeVars())
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    token, source = _token_from_dej_or_env()
    assert token == "from-dej"
    assert source == "variables:JIRA_API_TOKEN"


def test_variables_get_length_detail_strips(monkeypatch):
    class FakeVars:
        @staticmethod
        def get(key):
            if key == "JIRA_API_TOKEN":
                return "  abcd  "
            return None

    monkeypatch.setattr(dej_variables, "_variables_mod", FakeVars())
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    detail = dej_variables.variables_get_length_detail("JIRA_API_TOKEN")
    assert detail["len_raw"] == 8
    assert detail["len_stripped"] == 4
    assert detail["had_outer_whitespace"] is True
    assert detail["fingerprint"]


def test_token_from_dej_or_env_os_only(monkeypatch):
    monkeypatch.setattr(dej_variables, "_variables_mod", None)
    monkeypatch.setattr(dej_variables, "_import_tried", True)
    monkeypatch.setenv("JIRA_API_TOKEN", "pat-os")
    token, source = _token_from_dej_or_env()
    assert token == "pat-os"
    assert source == "env:JIRA_API_TOKEN"
