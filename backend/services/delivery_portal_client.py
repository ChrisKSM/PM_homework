"""Delivery Portal HTTP client (all_deliveries_data, program-report)."""
from __future__ import annotations

import base64
import json
import os
import socket
from datetime import datetime, timezone
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

# Portal 정책: program-report · all_deliveries_data 동일 JWT (Variables 키 2개는 같은 값 허용)
_DELIVERY_PORTAL_TOKEN_KEYS = (
    "DELIVERY_PORTAL_API_TOKEN",
    "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN",
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


def _read_dotenv_value(key: str) -> str:
    want = key.strip()
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
            k, _, val = line.partition("=")
            if k.strip() != want:
                continue
            token = _normalize_token(val)
            if token:
                return token
    return ""


def _read_from_dotenv_keys(*env_keys: str) -> tuple[str, str]:
    """env_keys 순서대로 .env 조회 (파일 줄 순서가 아님)."""
    for key in env_keys:
        token = _read_dotenv_value(key)
        if token:
            return token, key
    return "", ""


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


def _settings_delivery_portal_token_fallback() -> str:
    """pydantic settings — api_token 우선, 구버전 pod(all_deliveries 필드 없음) 대응."""
    primary = _normalize_token(getattr(settings, "delivery_portal_api_token", ""))
    if primary:
        return primary
    return _normalize_token(getattr(settings, "delivery_portal_all_deliveries_api_token", ""))


def resolve_delivery_portal_token_pair() -> tuple[str, str]:
    """
    program-report · all_deliveries_data 공통 JWT.
    AxStudio Variables(dej) → os.environ → .env(키 우선순위) → settings.
    """
    token, source = _token_from_dej_or_env_for_keys(*_DELIVERY_PORTAL_TOKEN_KEYS)
    if token:
        return token, source
    token, dot_key = _read_from_dotenv_keys(*_DELIVERY_PORTAL_TOKEN_KEYS)
    if token:
        for path in _DOTENV_PATHS:
            if path.is_file():
                return token, f"dotenv:{path}#{dot_key}"
        return token, f"dotenv#{dot_key}"
    token = _settings_delivery_portal_token_fallback()
    if token:
        return token, "settings"
    for key in _DELIVERY_PORTAL_TOKEN_KEYS:
        token = _normalize_token(runtime_get(key))
        if token:
            return token, f"runtime_get:{key}"
    return "", "none"


def resolve_delivery_portal_program_report_token_pair() -> tuple[str, str]:
    return resolve_delivery_portal_token_pair()


def resolve_delivery_portal_all_deliveries_token_pair() -> tuple[str, str]:
    return resolve_delivery_portal_token_pair()


def resolve_delivery_portal_base_url_pair() -> tuple[str, str]:
    url, source = _base_url_from_dej_or_env()
    if url:
        return url, source
    url, _ = _read_from_dotenv_keys(*_BASE_URL_KEYS)
    if url:
        return url.rstrip("/"), "dotenv"
    url = _normalize_token(settings.delivery_portal_base_url).rstrip("/")
    if url:
        return url, "settings.delivery_portal_base_url"
    return "https://delivery-portal-backend.apps.hedej.lge.com", "default"


def _delivery_portal_token() -> str:
    token, _ = resolve_delivery_portal_token_pair()
    if not token:
        raise HTTPException(
            status_code=503,
            detail="DELIVERY_PORTAL_API_TOKEN 미설정 (all_deliveries 와 동일 토큰)",
        )
    return token


def _base_url() -> str:
    base, _ = resolve_delivery_portal_base_url_pair()
    return base.rstrip("/")


def jwt_payload_hints(token: str) -> dict[str, Any]:
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
    exp = payload.get("exp")
    exp_utc = ""
    if isinstance(exp, (int, float)) and exp > 0:
        try:
            exp_utc = datetime.fromtimestamp(int(exp), tz=timezone.utc).isoformat()
        except (OSError, OverflowError, ValueError):
            exp_utc = ""
    return {
        "looksLikeJwt": True,
        "payloadDecodeOk": True,
        "jwtPartCount": len(parts),
        "token_type": payload.get("token_type"),
        "sub": payload.get("sub") or payload.get("user_id"),
        "exp": exp,
        "expUtc": exp_utc,
        "iat": payload.get("iat"),
    }


def delivery_portal_resolve_trace() -> dict[str, Any]:
    """토큰/BASE resolve 경로 — 값 노출 없이 길이·fingerprint 만."""
    token, source = resolve_delivery_portal_token_pair()
    base, base_source = resolve_delivery_portal_base_url_pair()
    pr_len = len(_normalize_token(dej_get("DELIVERY_PORTAL_API_TOKEN")))
    ad_len = len(_normalize_token(dej_get("DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN")))
    fp_api = token_fingerprint(_normalize_token(dej_get("DELIVERY_PORTAL_API_TOKEN")))
    fp_ad = token_fingerprint(_normalize_token(dej_get("DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN")))
    return {
        "effectiveTokenSource": source,
        "effectiveTokenLength": len(token),
        "effectiveTokenFingerprint": token_fingerprint(token),
        "variablesApiTokenLength": pr_len,
        "variablesAllDeliveriesTokenLength": ad_len,
        "variablesFingerprintsMatch": bool(fp_api and fp_ad and fp_api == fp_ad),
        "settingsApiTokenLength": len(_normalize_token(getattr(settings, "delivery_portal_api_token", ""))),
        "settingsAllDeliveriesTokenLength": len(
            _normalize_token(getattr(settings, "delivery_portal_all_deliveries_api_token", ""))
        ),
        "baseUrl": base,
        "baseUrlSource": base_source,
        "allDeliveriesUrl": f"{base}/api/v1/all_deliveries_data/",
        "programReportUrl": f"{base}/api/v1/program-report/",
        "verifySsl": settings.delivery_portal_verify_ssl,
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
                "requestUrl": url,
                "path": f"/api/v1/{segment}/",
                "httpStatus": resp.status_code,
                "bodyPreview": (resp.text or "")[:240],
            }
    except httpx.HTTPError as e:
        return {
            "requestUrl": url,
            "path": f"/api/v1/{segment}/",
            "httpStatus": 0,
            "bodyPreview": str(e)[:240],
        }


async def diagnose_delivery_portal() -> dict[str, Any]:
    token, source = resolve_delivery_portal_token_pair()
    trace = delivery_portal_resolve_trace()
    out: dict[str, Any] = {
        "hostname": socket.gethostname(),
        "ok": bool(token),
        "baseUrl": trace["baseUrl"],
        "baseUrlSource": trace["baseUrlSource"],
        "verifySsl": trace["verifySsl"],
        "trace": trace,
        "tokenLength": len(token),
        "tokenSource": source,
        "tokenFingerprint": token_fingerprint(token),
        "jwtHints": jwt_payload_hints(token) if token else {},
        "variablesGet": {
            "DELIVERY_PORTAL_API_TOKEN": variables_get_length_detail("DELIVERY_PORTAL_API_TOKEN"),
            "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN": variables_get_length_detail(
                "DELIVERY_PORTAL_ALL_DELIVERIES_API_TOKEN"
            ),
        },
        "hint": (
            "Portal: program-report 와 all_deliveries_data 는 동일 JWT(eyJ… 3 segment). "
            "Variables DELIVERY_PORTAL_BASE_URL=hedej 권장. public(axstudio default) vs local(.env hedej) "
            "불일치 시 UI 401."
        ),
    }
    hints = out.get("jwtHints") or {}
    if token and hints.get("looksLikeJwt") is False:
        out["invalidJwtWarning"] = (
            f"Variables 토큰 len={len(token)} 이 JWT 형식이 아님(looksLikeJwt=false). "
            "Delivery Portal access JWT(eyJ…) 전체를 DELIVERY_PORTAL_API_TOKEN 에 넣으세요. "
            "public BE 가 576자 등 잘못된 값이면 브라우저 sync 401."
        )
    if trace.get("baseUrlSource") == "settings.delivery_portal_base_url":
        out["baseUrlWarning"] = (
            "DELIVERY_PORTAL_BASE_URL Variables/env 없음 — pydantic default 사용. "
            "Variables 에 https://delivery-portal-backend.apps.hedej.lge.com 설정 권장."
        )
    if trace.get("variablesFingerprintsMatch") is False and trace.get("variablesApiTokenLength") and trace.get(
        "variablesAllDeliveriesTokenLength"
    ):
        out["warn"] = (
            "Variables API_TOKEN 과 ALL_DELIVERIES_API_TOKEN fingerprint 불일치 — "
            "담당자 안내대로 동일 토큰이면 두 Variables 값을 같게 맞추세요."
        )
    if token:
        out["portalProbeProgramReport"] = await _probe_portal_get("program-report", token=token)
        out["portalProbeAllDeliveries"] = await _probe_portal_get("all_deliveries_data", token=token)
        pr_st = out["portalProbeProgramReport"].get("httpStatus")
        ad_st = out["portalProbeAllDeliveries"].get("httpStatus")
        if pr_st == 200 and ad_st and ad_st >= 400:
            out["splitProbeHint"] = (
                "동일 effectiveToken 으로 program-report 는 200, all_deliveries 는 실패 — "
                "BE resolve 버그 가능성 낮음(URL·동일 Bearer). Portal 또는 BASE_URL 불일치를 Portal 팀과 확인."
            )
    return out


def _portal_http_detail(status: int, body: str, *, token_source: str = "") -> str:
    base = f"Delivery Portal HTTP {status}: {body[:500]}"
    src = f" (BE tokenSource={token_source})" if token_source else ""
    if status == 401:
        token, _ = resolve_delivery_portal_token_pair()
        hints = jwt_payload_hints(token) if token else {}
        fp = token_fingerprint(token) if token else ""
        parts = len((token or "").split("."))
        return (
            f"{base}{src} — JWT 거부 (fingerprint={fp} len={len(token)} jwtParts={parts}, "
            f"jwtHints={hints}). Pod: GET /api/delivery-portal/diagnose 의 hostname·portalProbe 와 "
            "브라우저 BE URL 동일 Pod 인지 확인. Variables 변경 후 restart-be-route-port·Publish. "
            "성공 시 fingerprint f029e46d16cf4990 len=432 참고."
        )
    if status == 403 and "all_deliveries_data" in body:
        return (
            f"{base}{src} — all_deliveries_data 403 (program-report 는 동일 토큰). "
            "BASE_URL·Portal ACL 또는 담당자 curl 과 requestUrl 비교 (diagnose.trace)."
        )
    return base + src


async def fetch_all_deliveries_data() -> dict:
    base = _base_url()
    url = f"{base}/api/v1/all_deliveries_data/"
    token, token_source = resolve_delivery_portal_token_pair()
    if not token:
        raise HTTPException(status_code=503, detail="DELIVERY_PORTAL_API_TOKEN 미설정")
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
    return _delivery_portal_token()
