"""LLM diagnostics shape — sprint report 연결 점검 API."""
from services import llm_client


def test_diagnostics_has_checks():
    diag = llm_client.diagnostics()
    assert "enabled" in diag
    assert "checks" in diag
    ids = {c["id"] for c in diag["checks"]}
    assert "llm_enabled" in ids
    assert "dej_sdk" in ids
    assert "llm_user_id" in ids
