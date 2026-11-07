import base64

from dej_variables import looks_like_jwt_bearer, normalize_polarion_pat

_JWT = "eyJ" + "h" * 180 + "." + "p" * 180 + "." + "s" * 48


def test_normalize_polarion_jwt_passthrough():
    assert normalize_polarion_pat(_JWT) == _JWT
    assert looks_like_jwt_bearer(_JWT)


def test_normalize_polarion_b64_wrapped_jwt():
    wrapped = base64.b64encode(_JWT.encode()).decode()
    assert normalize_polarion_pat(wrapped) == _JWT
