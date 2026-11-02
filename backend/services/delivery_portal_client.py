"""Delivery Portal HTTP client (all_deliveries_data, program-report)."""
from __future__ import annotations

import base64
import json
import os
import re
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

_TOKEN_KEYS = ("DELIVERY_PORTAL_API_TOKEN",)
_BASE_URL_KEYS = ("DELIVERY_PORTAL_BASE_URL",)


def _normalize_token(raw: Any) -> str:
    if raw is None:
        return ""
    if isinstance(raw, bytes):
        return raw.decode("utf-8", errors="ignore").strip()
    return str(raw).strip().strip('"').strip("'")


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


def _token_from_dej_or_env() -> tuple[str, str]:
    for key in _TOKEN_KEYS:
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


def resolve_delivery_portal_token_pair() -> tuple[str, str]:
    """
    AxStudio Variables(dej) 우선 — settings 는 import 시 .env 캐시라 stale 토큰 401 방지.
    """
    token, source = _token_from_dej_or_env()
    if token:
        return token, source
    token = _read_from_dotenv_keys(*_TOKEN_KEYS)
    if token:
        for path in _DOTENV_PATHS:
            if path.is_file():
                return token, f"dotenv:{path}"
        return token, "dotenv"
    token = _normalize_token(settings.delivery_portal_api_token)
    if token:
        return token, "settings.delivery_portal_api_token"
    token = _normalize_token(runtime_get("DELIVERY_PORTAL_API_TOKEN"))
    if token:
        return token, "runtime_get:DELIVERY_PORTAL_API_TOKEN"
    return "", "none"


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


def _token() -> str:
    token, _ = resolve_delivery_portal_token_pair()
    if not token:
        raise HTTPException(status_code=503, detail="DELIVERY_PORTAL_API_TOKEN 미설정")
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
    out: dict[str, Any] = {
        "looksLikeJwt": True,
        "payloadDecodeOk": True,
        "token_type": payload.get("token_type"),
        "sub": payload.get("sub") or payload.get("user_id"),
        "exp": payload.get("exp"),
        "iat": payload.get("iat"),
    }
    return out


async def _probe_portal_get(path_segment: str) -> dict[str, Any]:
    """Portal GET /api/v1/{path}/ — HTTP 코드만 (본문 일부)."""
    segment = path_segment.strip("/")
    url = f"{_base_url()}/api/v1/{segment}/"
    token = _token()
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


async def probe_all_deliveries_auth() -> dict[str, Any]:
    return await _probe_portal_get("all_deliveries_data")


async def probe_program_report_auth() -> dict[str, Any]:
    return await _probe_portal_get("program-report")


async def diagnose_delivery_portal() -> dict[str, Any]:
    token, token_source = resolve_delivery_portal_token_pair()
    base, base_source = resolve_delivery_portal_base_url_pair()
    settings_token_len = len(_normalize_token(settings.delivery_portal_api_token))
    dej_len = len(_normalize_token(dej_get("DELIVERY_PORTAL_API_TOKEN")))
    out: dict[str, Any] = {
        "ok": bool(token),
        "baseUrl": base,
        "baseUrlSource": base_source,
        "tokenConfigured": bool(token),
        "tokenLength": len(token),
        "tokenSource": token_source,
        "tokenFingerprint": token_fingerprint(token),
        "settingsTokenLength": settings_token_len,
        "variablesGetTokenLength": dej_len,
        "variablesGetDeliveryPortalToken": variables_get_length_detail("DELIVERY_PORTAL_API_TOKEN"),
        "verifySsl": settings.delivery_portal_verify_ssl,
        "hint": (
            "401: BASE_URL·JWT 환경 불일치 또는 stale .env 토큰. "
            "403 on all_deliveries_data: JWT는 유효하나 해당 API GET 역할 없음 — "
            "Delivery Portal 관리자에게 all_deliveries_data 접근 권한 또는 서비스 access token 발급 요청 "
            "(브라우저 Milestone UI SSO 와 Bearer JWT 역할이 다를 수 있음)."
        ),
    }
    if token:
        out["jwtHints"] = jwt_payload_hints(token)
        if token_source.startswith("variables:") and settings_token_len and settings_token_len != len(token):
            out["staleSettingsTokenLikely"] = True
        try:
            out["portalProbeAllDeliveries"] = await probe_all_deliveries_auth()
            out["portalProbeProgramReport"] = await probe_program_report_auth()
        except HTTPException as e:
            out["portalProbeAllDeliveries"] = {"httpStatus": e.status_code, "bodyPreview": str(e.detail)[:240]}
    return out


def _portal_http_detail(status: int, body: str) -> str:
    base = f"Delivery Portal HTTP {status}: {body[:500]}"
    if status == 403 and "all_deliveries_data" in body:
        return (
            f"{base} — JWT 인증은 통과했으나 GET /api/v1/all_deliveries_data/ API 권한 없음. "
            "Variables 토큰 주체(jwtHints.sub)에 Delivery Portal API 역할 부여 또는 "
            "Milestone Gantt 조회 가능 계정의 access token 으로 교체하세요."
        )
    return base


async def fetch_all_deliveries_data() -> dict:
    base = _base_url()
    url = f"{base}/api/v1/all_deliveries_data/"
    token = _token()
    try:
        async with httpx.AsyncClient(verify=settings.delivery_portal_verify_ssl, timeout=120.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=_portal_http_detail(resp.status_code, resp.text or ""),
                )
            data = resp.json()
            if not isinstance(data, dict):
                raise HTTPException(status_code=502, detail="Delivery Portal: unexpected JSON shape")
            return data
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Delivery Portal 연결 실패: {e}") from e
