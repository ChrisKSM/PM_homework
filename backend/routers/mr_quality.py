"""H7/M7/W7 MR 품질 이슈 API — Polarion testDefect 연동."""
from fastapi import APIRouter, HTTPException, Query

from services import mr_quality_service

router = APIRouter(prefix="/api/mr/quality", tags=["mr-quality"])


@router.get("/ping")
async def mr_quality_ping():
    """배포 확인용."""
    return {"ok": True, "service": "mr-quality"}


@router.get("/dashboard")
async def mr_quality_dashboard(
    model: str = Query("", description="모델명 필터 (빈값이면 전체)"),
):
    """MR 품질 이슈 대시보드 — KPI, 차트 데이터, 미결 이슈 목록."""
    try:
        return await mr_quality_service.get_mr_quality_dashboard(model_name=model)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Polarion API 오류: {e}")
