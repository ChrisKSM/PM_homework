"""Delivery Portal — all_deliveries_data 프록시 (PAT는 BE .env)."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from config import settings

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


@router.get("/all-deliveries")
async def all_deliveries():
    """Davis MilestonePage — GET /api/v1/all_deliveries_data/"""
    base = settings.delivery_portal_base_url.rstrip("/")
    url = f"{base}/api/v1/all_deliveries_data/"
    token = _resolve_token()
    try:
        async with httpx.AsyncClient(verify=settings.delivery_portal_verify_ssl, timeout=120.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=f"Delivery Portal HTTP {resp.status_code}: {resp.text[:300]}",
                )
            return resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Delivery Portal 연결 실패: {e}") from e
