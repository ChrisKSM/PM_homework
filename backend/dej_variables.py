"""
AxStudio / DEJ SDK Variables — UI Variables 는 os.environ 이 아닌 variables.get 으로 주입됨.
로컬·pytest 는 os.getenv fallback.
"""
from __future__ import annotations

import base64
import hashlib
import os
from typing import Any

_variables_mod: Any | None = None
_import_tried = False


def _dej_variables():
    global _variables_mod, _import_tried
    if not _import_tried:
        _import_tried = True
        try:
            from dej_sdk import variables as v

            _variables_mod = v
        except ImportError:
            _variables_mod = None
    return _variables_mod


def dej_sdk_variables_available() -> bool:
    return _dej_variables() is not None


def _normalize(raw: Any) -> str:
    if raw is None:
        return ""
    if isinstance(raw, bytes):
        return raw.decode("utf-8", errors="ignore").strip()
    return str(raw).strip()


def _maybe_b64_decode_pat(value: str) -> str:
    """
    AxStudio variables.get 이 UI(44자)와 다른 60자 문자열을 줄 때 —
    Base64(44자 PAT) → 60자 인코딩인 경우만 디코드 (값 노출 없이 길이·fp로 검증).
    """
    t = (value or "").strip()
    if len(t) < 48:
        return t
    try:
        decoded = base64.b64decode(t, validate=True).decode("utf-8").strip()
    except Exception:
        return t
    if not decoded or not decoded.isascii():
        return t
    if 40 <= len(decoded) <= 48 and len(decoded) < len(t):
        return decoded
    return t


def dej_get(key: str) -> str:
    """DEJ SDK variables.get 만 (os.environ 미사용)."""
    vmod = _dej_variables()
    if vmod is None:
        return ""
    try:
        raw = _normalize(vmod.get(key))
        return _maybe_b64_decode_pat(raw)
    except Exception:
        return ""


def runtime_get(key: str) -> str:
    """variables.get → os.getenv (로컬 fallback)."""
    token = dej_get(key)
    if token:
        return token
    return _normalize(os.getenv(key))


def lengths_for_keys(*keys: str) -> dict[str, int]:
    return {k: len(dej_get(k)) for k in keys}


def process_env_lengths_for_keys(*keys: str) -> dict[str, int]:
    return {k: len(_normalize(os.getenv(k))) for k in keys}


def token_fingerprint(token: str) -> str:
    """PAT 값 노출 없이 Worker vs dpl Variables 일치 여부 비교용."""
    t = _normalize(token)
    if not t:
        return ""
    return hashlib.sha256(t.encode()).hexdigest()[:16]


def variables_get_length_detail(key: str) -> dict[str, int | bool | str]:
    """
    dej_sdk.variables.get — UI 글자 수 vs runtime len 불일치 진단.
    값은 노출하지 않고 길이·fingerprint 만 반환.
    """
    vmod = _dej_variables()
    if vmod is None:
        return {
            "len_raw": 0,
            "len_stripped": 0,
            "had_outer_whitespace": False,
            "fingerprint": "",
        }
    try:
        raw = vmod.get(key)
    except Exception:
        raw = None
    if raw is None:
        raw_s = ""
    elif isinstance(raw, bytes):
        raw_s = raw.decode("utf-8", errors="ignore")
    else:
        raw_s = str(raw)
    stripped = _normalize(raw_s)
    decoded = _maybe_b64_decode_pat(stripped)
    out: dict[str, int | bool | str] = {
        "len_raw": len(raw_s),
        "len_stripped": len(stripped),
        "had_outer_whitespace": raw_s != stripped,
        "fingerprint": token_fingerprint(stripped),
    }
    if decoded != stripped:
        out["len_b64_decoded"] = len(decoded)
        out["fingerprint_b64_decoded"] = token_fingerprint(decoded)
        out["looks_b64_wrapped_pat"] = True
    else:
        out["len_b64_decoded"] = 0
        out["fingerprint_b64_decoded"] = ""
        out["looks_b64_wrapped_pat"] = False
    return out
