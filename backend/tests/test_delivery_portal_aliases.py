from services.delivery_portal_catalog import resolve_overview_identity


def _row(portal_model: str, program_detail: str) -> dict:
    return {"portal_model": portal_model, "program_detail": program_detail, "model": portal_model}


def test_alias_s80c_realtime():
    r = resolve_overview_identity(
        _row(
            "Realtime -OS <br>Dolby Atmos 적용<br> Main SoC 신규변경",
            "Realtime -OS (MLC3760)",
        )
    )
    assert r["model"] == "S80C"
    assert r["overview_id"] == "ov-s80c"


def test_alias_cb_sh():
    r = resolve_overview_identity(_row("HDMI Connect Box", "HDMI Connect Box"))
    assert r["model"] == "CB-SH"
    assert r["overview_id"] == "ov-cb-sh"


def test_alias_w5():
    r = resolve_overview_identity(
        _row(
            "Sound Suite W5",
            "Bouffalo chip을 사용한 Sound suite SubWoofer W5모델",
        )
    )
    assert r["model"] == "W5"
    assert r["overview_id"] == "ov-w5"


def test_alias_windows_pc_app():
    r = resolve_overview_identity(_row("Others", "xboom Buds 용 윈도우PC 앱"))
    assert r["model"] == "윈도우PC 앱"
    assert r["overview_id"] == "ov-pc"


def test_alias_power9000():
    r = resolve_overview_identity(
        _row("Power9000, Power7000, Power5000", "Power 9000 / 7000/ 5000, 440W")
    )
    assert r["model"] == "Power9000"
    assert r["overview_id"] == "ov-power9000"


def test_webos_h7_mr10():
    r = resolve_overview_identity(_row("Sound Suite H7", "H7_MR10(11월)"))
    assert r["model"] == "H7 MR10(11월)"
    assert r["overview_id"] == "ov-h7-mr10-11"
