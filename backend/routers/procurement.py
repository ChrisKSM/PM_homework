from fastapi import APIRouter, HTTPException, Query

from services import procurement_service

router = APIRouter(prefix="/api/procurement", tags=["procurement"])


@router.get("/ping")
async def procurement_ping():
    """배포 확인용 — Jira 호출 없음."""
    return {"ok": True, "service": "procurement"}


@router.get("/filters")
async def procurement_filters():
    """공급자 · 단계 필터 옵션."""
    return procurement_service.get_procurement_filters()


@router.get("/debug/dod")
async def procurement_debug_dod(
    issue_key: str = Query(..., description="예: MLCSIXZERO-123"),
):
    """DoD 필드 raw/parsed — API에서 값이 오는지 확인."""
    try:
        return await procurement_service.debug_procurement_dod(issue_key=issue_key)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/dashboard")
async def procurement_dashboard(
    vendor: str = Query("all", description="all | mcs | tonly | ite | actions"),
    phase: str = Query("all", description="all | plan | contract | signed | execute | verified | close"),
):
    """조달 KPI · 현황 · Request 목록."""
    try:
        return await procurement_service.get_procurement_dashboard(
            vendor=vendor,
            phase=phase,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")
