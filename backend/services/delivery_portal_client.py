"""Delivery Portal HTTP client (all_deliveries_data, program-report)."""
from __future__ import annotations

import httpx
from fastapi import HTTPException

from config import settings
from dej_variables import runtime_get


def _token() -> str:
    token = (settings.delivery_portal_api_token or "").strip() or runtime_get(
        "DELIVERY_PORTAL_API_TOKEN"
    )
    if not token:
        raise HTTPException(status_code=503, detail="DELIVERY_PORTAL_API_TOKEN 미설정")
    return token


async def fetch_all_deliveries_data() -> dict:
    base = settings.delivery_portal_base_url.rstrip("/")
    url = f"{base}/api/v1/all_deliveries_data/"
    token = _token()
    try:
        async with httpx.AsyncClient(verify=settings.delivery_portal_verify_ssl, timeout=120.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=f"Delivery Portal HTTP {resp.status_code}: {resp.text[:500]}",
                )
            data = resp.json()
            if not isinstance(data, dict):
                raise HTTPException(status_code=502, detail="Delivery Portal: unexpected JSON shape")
            return data
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Delivery Portal 연결 실패: {e}") from e
