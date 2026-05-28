from fastapi import APIRouter, HTTPException, Query

from services import risk_service

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/ping")
async def risk_ping():
    """배포 확인용 — Jira 호출 없음."""
    return {"ok": True, "service": "risk"}


@router.get("/filters")
async def risk_filters():
    """범주(Components) 필터 옵션."""
    return risk_service.get_risk_filters()


@router.get("/dashboard")
async def risk_dashboard(
    category: str = Query("all", description="all | 요구사항 | 일정 | … | 미지정"),
):
    """리스크 KPI · 범주별 집계 · 이슈 목록 (labels=risk)."""
    try:
        return await risk_service.get_risk_dashboard(category=category)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")
