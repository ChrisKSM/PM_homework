"""Delivery Portal — all_deliveries_data / program-report 프록시 (토큰은 BE .env)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from config import settings
from services.delivery_portal_client import (
    diagnose_delivery_portal,
    fetch_all_deliveries_data,
    program_report_bearer_token,
    resolve_delivery_portal_all_deliveries_token_pair,
    resolve_delivery_portal_base_url_pair,
    resolve_delivery_portal_program_report_token_pair,
)

router = APIRouter(prefix="/api/delivery-portal", tags=["delivery-portal"])


@router.get("/ping")
async def delivery_ping():
    pr_token, pr_source = resolve_delivery_portal_program_report_token_pair()
    ad_token, ad_source = resolve_delivery_portal_all_deliveries_token_pair()
    base, base_source = resolve_delivery_portal_base_url_pair()
    return {
        "ok": bool(pr_token or ad_token),
        "baseUrl": base,
        "baseUrlSource": base_source,
        "programReportTokenLength": len(pr_token),
        "programReportTokenSource": pr_source,
        "allDeliveriesTokenLength": len(ad_token),
        "allDeliveriesTokenSource": ad_source,
    }


@router.get("/diagnose")
async def delivery_diagnose():
    """Variables vs .env 토큰·BASE URL·Portal HTTP 프로브 (값 노출 없음)."""
    return await diagnose_delivery_portal()


async def _portal_get(path: str, *, params: dict | None = None) -> object:
    """GET /api/v1/{path} — program-report 는 DELIVERY_PORTAL_API_TOKEN."""
    import httpx

    base, _ = resolve_delivery_portal_base_url_pair()
    segment = path.strip("/")
    url = f"{base}/api/v1/{segment}/"
    token = program_report_bearer_token()
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
