from config import Settings, effective_cors_origins


def test_effective_cors_includes_axstudio_when_env_missing(monkeypatch):
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "http://localhost:3000,https://react-audio.apps.hedej.lge.com",
    )
    s = Settings()
    monkeypatch.setattr("config.settings", s)
    origins = effective_cors_origins()
    assert "https://react-audio.apps.axstudio.lge.com" in origins
    assert "https://react-audio.apps.hedej.lge.com" in origins
