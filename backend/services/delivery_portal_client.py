"""Delivery Portal HTTP client (all_deliveries_data, program-report)."""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException

from config import settings
from dej_variables import dej_get, runtime_get, token_fingerprint, variables_get_length_detail

_DOTENV_PATHS = (
    Path("/usr/app/src/.env"),
    Path("/workspace/project/.env"),
    Path(".env"),
)

# program-report · 기본 프록시
_PROGRAM_REPORT_TOKEN_KEYS = ("DELIVERY_PORTAL_API_TOKEN",)
# Gantt / 전 모델 일정 sync — 전용 토큰 우선, 없으면 API_TOKEN 폴백
_ALL_DELIVERIES_TOKEN_KEYS = (
    "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN",
    "DELIVERY_PORTAL_API_TOKEN",
)
_BASE_URL_KEYS = ("DELIVERY_PORTAL_BASE_URL",)


def _normalize_token(raw: Any) -> str:
    if raw is None:
        return ""
    if isinstance(raw, bytes):
        t = raw.decode("utf-8", errors="ignore").strip()
    else:
        t = str(raw).strip().strip('"').strip("'")
    if t.lower().startswith("bearer "):
        t = t[7:].strip()
    return t


def _read_from_dotenv_keys(*env_keys: str) -> str:
    keys_set = {k.strip() for k in env_keys if k.strip()}
    for path in _DOTENV_PATHS:
        if not path.is_file():
            continue
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            if key.strip() not in keys_set:
                continue
            token = _normalize_token(val)
            if token:
                return token
    return ""


def _token_from_dej_or_env_for_keys(*keys: str) -> tuple[str, str]:
    for key in keys:
        token = _normalize_token(dej_get(key))
        if token:
            return token, f"variables:{key}"
        token = _normalize_token(os.getenv(key))
        if token:
            return token, f"env:{key}"
    return "", "none"


def _base_url_from_dej_or_env() -> tuple[str, str]:
    for key in _BASE_URL_KEYS:
        url = _normalize_token(dej_get(key))
        if url:
            return url.rstrip("/"), f"variables:{key}"
        url = _normalize_token(os.getenv(key))
        if url:
            return url.rstrip("/"), f"env:{key}"
    return "", "none"


def _resolve_token_for_keys(
    *keys: str,
    settings_fallback: str = "",
) -> tuple[str, str]:
    """AxStudio Variables(dej) 우선 — settings 는 import 시 .env 캐시."""
    token, source = _token_from_dej_or_env_for_keys(*keys)
    if token:
        return token, source
    token = _read_from_dotenv_keys(*keys)
    if token:
        for path in _DOTENV_PATHS:
            if path.is_file():
                return token, f"dotenv:{path}"
        return token, "dotenv"
    token = _normalize_token(settings_fallback)
    if token:
        return token, "settings"
    for key in keys:
        token = _normalize_token(runtime_get(key))
        if token:
            return token, f"runtime_get:{key}"
    return "", "none"


def resolve_delivery_portal_program_report_token_pair() -> tuple[str, str]:
    return _resolve_token_for_keys(
        *_PROGRAM_REPORT_TOKEN_KEYS,
        settings_fallback=settings.delivery_portal_api_token,
    )


def _settings_all_deliveries_token() -> str:
    return _normalize_token(getattr(settings, "delivery_portal_all_deliveries_api_token", ""))


def resolve_delivery_portal_all_deliveries_token_pair() -> tuple[str, str]:
    token, source = _resolve_token_for_keys(
        *_ALL_DELIVERIES_TOKEN_KEYS,
        settings_fallback=_settings_all_deliveries_token(),
    )
    if token:
        return token, source
    return "", "none"


def resolve_delivery_portal_token_pair() -> tuple[str, str]:
    """하위 호환 — program-report 와 동일."""
    return resolve_delivery_portal_program_report_token_pair()


def resolve_delivery_portal_base_url_pair() -> tuple[str, str]:
    url, source = _base_url_from_dej_or_env()
    if url:
        return url, source
    url = _read_from_dotenv_keys(*_BASE_URL_KEYS)
    if url:
        return url.rstrip("/"), "dotenv"
    url = _normalize_token(settings.delivery_portal_base_url).rstrip("/")
    if url:
        return url, "settings.delivery_portal_base_url"
    return "https://delivery-portal-backend.apps.axstudio.lge.com", "default"


def _program_report_token() -> str:
    token, _ = resolve_delivery_portal_program_report_token_pair()
    if not token:
        raise HTTPException(status_code=503, detail="DELIVERY_PORTAL_API_TOKEN 미설정")
    return token


def _all_deliveries_token() -> str:
    token, _ = resolve_delivery_portal_all_deliveries_token_pair()
    if not token:
        raise HTTPException(
            status_code=503,
            detail=(
                "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN 미설정 "
                "(또는 DELIVERY_PORTAL_API_TOKEN 폴백)"
            ),
        )
    return token


def _base_url() -> str:
    base, _ = resolve_delivery_portal_base_url_pair()
    return base.rstrip("/")


def jwt_payload_hints(token: str) -> dict[str, Any]:
    """JWT payload 일부만 노출 (서명 검증 없음) — exp·token_type 진단."""
    parts = (token or "").split(".")
    if len(parts) < 2:
        return {"looksLikeJwt": False}
    try:
        pad = "=" * (-len(parts[1]) % 4)
        raw = base64.urlsafe_b64decode(parts[1] + pad)
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        return {"looksLikeJwt": True, "payloadDecodeOk": False}
    if not isinstance(payload, dict):
        return {"looksLikeJwt": True, "payloadDecodeOk": False}
    return {
        "looksLikeJwt": True,
        "payloadDecodeOk": True,
        "token_type": payload.get("token_type"),
        "sub": payload.get("sub") or payload.get("user_id"),
        "exp": payload.get("exp"),
        "iat": payload.get("iat"),
    }


def _token_slot_diagnostic(var_key: str, token: str, source: str) -> dict[str, Any]:
    return {
        "configured": bool(token),
        "tokenLength": len(token),
        "tokenSource": source,
        "tokenFingerprint": token_fingerprint(token),
        "variablesGet": variables_get_length_detail(var_key),
        "jwtHints": jwt_payload_hints(token) if token else {},
    }


async def _probe_portal_get(path_segment: str, *, token: str) -> dict[str, Any]:
    segment = path_segment.strip("/")
    url = f"{_base_url()}/api/v1/{segment}/"
    try:
        async with httpx.AsyncClient(
            verify=settings.delivery_portal_verify_ssl, timeout=30.0
        ) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            return {
                "path": f"/api/v1/{segment}/",
                "httpStatus": resp.status_code,
                "bodyPreview": (resp.text or "")[:240],
            }
    except httpx.HTTPError as e:
        return {"path": f"/api/v1/{segment}/", "httpStatus": 0, "bodyPreview": str(e)[:240]}


async def diagnose_delivery_portal() -> dict[str, Any]:
    pr_token, pr_source = resolve_delivery_portal_program_report_token_pair()
    ad_token, ad_source = resolve_delivery_portal_all_deliveries_token_pair()
    base, base_source = resolve_delivery_portal_base_url_pair()
    out: dict[str, Any] = {
        "ok": bool(pr_token or ad_token),
        "baseUrl": base,
        "baseUrlSource": base_source,
        "verifySsl": settings.delivery_portal_verify_ssl,
        "tokens": {
            "programReport": _token_slot_diagnostic(
                "DELIVERY_PORTAL_API_TOKEN", pr_token, pr_source
            ),
            "allDeliveries": _token_slot_diagnostic(
                "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN", ad_token, ad_source
            ),
        },
        "hint": (
            "Variables: DELIVERY_PORTAL_API_TOKEN=program-report JWT, "
            "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN=Gantt/all_deliveries_data JWT. "
            "전용 토큰 없으면 all_deliveries 는 API_TOKEN 으로 폴백."
        ),
    }
    if ad_token:
        out["portalProbeAllDeliveries"] = await _probe_portal_get(
            "all_deliveries_data", token=ad_token
        )
    if pr_token:
        out["portalProbeProgramReport"] = await _probe_portal_get(
            "program-report", token=pr_token
        )
    return out


def _portal_http_detail(status: int, body: str, *, token_source: str = "") -> str:
    base = f"Delivery Portal HTTP {status}: {body[:500]}"
    src = f" (BE tokenSource={token_source})" if token_source else ""
    if status == 401:
        return (
            f"{base}{src} — JWT 거부. "
            "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN 에 access JWT(eyJ…) 전체·Bearer 없이·"
            "program-report 토큰과 바꿔 넣지 않았는지, BASE_URL(hedej/axstudio) 발급 환경과 "
            "일치하는지, .env stale 값 삭제 후 restart 확인. GET /api/delivery-portal/diagnose"
        )
    if status == 403 and "all_deliveries_data" in body:
        return (
            f"{base}{src} — GET /api/v1/all_deliveries_data/ 권한 없음. "
            "Variables DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN 확인."
        )
    return base + src


async def fetch_all_deliveries_data() -> dict:
    base = _base_url()
    url = f"{base}/api/v1/all_deliveries_data/"
    token, token_source = resolve_delivery_portal_all_deliveries_token_pair()
    if not token:
        raise HTTPException(
            status_code=503,
            detail=(
                "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN 미설정 "
                "(또는 DELIVERY_PORTAL_API_TOKEN 폴백)"
            ),
        )
    try:
        async with httpx.AsyncClient(verify=settings.delivery_portal_verify_ssl, timeout=120.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=_portal_http_detail(
                        resp.status_code, resp.text or "", token_source=token_source
                    ),
                )
            data = resp.json()
            if not isinstance(data, dict):
                raise HTTPException(status_code=502, detail="Delivery Portal: unexpected JSON shape")
            return data
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Delivery Portal 연결 실패: {e}") from e


def program_report_bearer_token() -> str:
    """routers/delivery_portal.py program-report 프록시."""
    return _program_report_token()
