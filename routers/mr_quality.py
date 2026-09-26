"""H7/M7/W7 MR 품질 이슈 API — Polarion testDefect 연동."""
from fastapi import APIRouter, HTTPException, Query

from polarion_client import normalize_project_names
from services import mr_quality_service

router = APIRouter(prefix="/api/mr/quality", tags=["mr-quality"])


@router.get("/ping")
async def mr_quality_ping():
    """배포 확인용."""
    return {"ok": True, "service": "mr-quality"}


@router.get("/sequences")
async def mr_quality_sequences(
    project_name: list[str] = Query(default=[], description="Polarion project_name (OR, 반복 가능)"),
):
    """project_name에 해당하는 eventSequence 차수 목록 반환."""
    names = normalize_project_names(project_name)
    try:
        sequences = await mr_quality_service.get_event_sequences(project_name=names)
        return {"sequences": sequences, "projectNames": names}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Polarion API 오류: {e}")


@router.get("/dashboard")
async def mr_quality_dashboard(
    project_name: list[str] = Query(default=[], description="Polarion project_name 필터 (OR, 반복 가능)"),
    event_sequence: str = Query("ALL", description="차수 필터 (ALL 또는 eventSequence.KEY 값, AND)"),
    model: str = Query("", description="모델명 필터 (빈값이면 전체)"),
    created_from: str = Query("", description="생성일 From (YYYY-MM-DD 또는 YYYYMMDD, AND)"),
    created_to: str = Query("", description="생성일 To (YYYY-MM-DD 또는 YYYYMMDD, AND)"),
):
    """MR 품질 이슈 대시보드 — KPI, 차트 데이터, 미결 이슈 목록."""
    try:
        return await mr_quality_service.get_mr_quality_dashboard(
            project_name=normalize_project_names(project_name),
            event_sequence=event_sequence,
            model_name=model,
            created_from=created_from,
            created_to=created_to,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Polarion API 오류: {e}")
