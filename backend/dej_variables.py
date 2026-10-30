"""
AxStudio / DEJ SDK Variables — UI Variables 는 os.environ 이 아닌 variables.get 으로 주입됨.
로컬·pytest 는 os.getenv fallback.
"""
from __future__ import annotations

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


def dej_get(key: str) -> str:
    """DEJ SDK variables.get 만 (os.environ 미사용)."""
    vmod = _dej_variables()
    if vmod is None:
        return ""
    try:
        return _normalize(vmod.get(key))
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
