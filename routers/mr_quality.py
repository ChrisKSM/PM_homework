"""H7/M7/W7 MR 품질 이슈 API — Polarion testDefect 연동."""
from fastapi import APIRouter, HTTPException, Query

from polarion_client import fetch_list_page, flatten_workitem, normalize_project_names
from services import mr_quality_service

router = APIRouter(prefix="/api/mr/quality", tags=["mr-quality"])

NO_PROJECT_DETAIL = (
    "project_name을 1개 이상 지정하세요. "
    "프로젝트 없이 조회하면 Polarion 전체 testDefect를 긁어 503이 납니다."
)


@router.get("/ping")
async def mr_quality_ping():
    """배포 확인용."""
    return {"ok": True, "service": "mr-quality"}


@router.get("/raw")
async def mr_quality_raw(
    query: str = Query(..., description="Polarion query 원문 (예: project_name:(\"A\" OR \"B\") AND created:[20260909 TO 20260926])"),
):
    """Polarion에 query를 그대로 보내 totalCount와 첫 row를 확인 (디버그용)."""
    if "project_name" not in query:
        raise HTTPException(status_code=400, detail=NO_PROJECT_DETAIL)
    try:
        rows, total = await fetch_list_page(page=1, query=query, page_size=5)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Polarion API 오류: {e}")
    return {
        "query": query,
        "totalCount": total,
        "sample": rows[:2],
        "sampleFlattened": [flatten_workitem(r) for r in rows[:2]],
    }


@router.get("/sequences")
async def mr_quality_sequences(
    project_name: list[str] = Query(default=[], description="Polarion project_name (OR, 반복 가능)"),
):
    """project_name에 해당하는 eventSequence 차수 목록 반환."""
    names = normalize_project_names(project_name)
    if not names:
        raise HTTPException(status_code=400, detail=NO_PROJECT_DETAIL)
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
    names = normalize_project_names(project_name)
    if not names:
        raise HTTPException(status_code=400, detail=NO_PROJECT_DETAIL)
    try:
        return await mr_quality_service.get_mr_quality_dashboard(
            project_name=names,
            event_sequence=event_sequence,
            model_name=model,
            created_from=created_from,
            created_to=created_to,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Polarion API 오류: {e}")
