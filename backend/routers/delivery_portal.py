"""Delivery Portal — all_deliveries_data / program-report 프록시 (토큰은 BE .env)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from config import settings
from services.delivery_portal_client import fetch_all_deliveries_data

router = APIRouter(prefix="/api/delivery-portal", tags=["delivery-portal"])


def _resolve_token() -> str:
    token = (settings.delivery_portal_api_token or "").strip()
    if token:
        return token
    raise HTTPException(
        status_code=503,
        detail="DELIVERY_PORTAL_API_TOKEN 미설정 — BE .env 확인",
    )


@router.get("/ping")
async def delivery_ping():
    token = (settings.delivery_portal_api_token or "").strip()
    return {
        "ok": True,
        "baseUrl": settings.delivery_portal_base_url.rstrip("/"),
        "tokenLength": len(token),
    }


async def _portal_get(path: str, *, params: dict | None = None) -> object:
    """GET /api/v1/{path} — Bearer DELIVERY_PORTAL_API_TOKEN."""
    import httpx

    base = settings.delivery_portal_base_url.rstrip("/")
    segment = path.strip("/")
    url = f"{base}/api/v1/{segment}/"
    token = _resolve_token()
    try:
        async with httpx.AsyncClient(verify=settings.delivery_portal_verify_ssl, timeout=120.0) as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                params=params or None,
            )
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=f"Delivery Portal HTTP {resp.status_code}: {resp.text[:500]}",
                )
            return resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Delivery Portal 연결 실패: {e}") from e


@router.get("/all-deliveries")
async def all_deliveries():
    """Davis MilestonePage — GET /api/v1/all_deliveries_data/"""
    return await fetch_all_deliveries_data()


@router.get("/program-report")
async def program_report(request: Request):
    """GET /api/v1/program-report/ — 쿼리스트링 그대로 전달."""
    params = dict(request.query_params)
    return await _portal_get("program-report", params=params or None)
