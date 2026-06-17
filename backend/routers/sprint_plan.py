from fastapi import APIRouter, HTTPException

from services import sprint_plan_service

router = APIRouter(prefix="/api/sprint-plan", tags=["sprint-plan"])


@router.get("/ping")
async def sprint_plan_ping():
    """배포 확인용 — Jira 호출 없음."""
    return {"ok": True, "service": "sprint-plan"}


@router.get("/timeline")
async def sprint_plan_timeline():
    """Release/Sprint Gantt — Epic · Story · RISK (Description · Environment)."""
    try:
        return await sprint_plan_service.get_sprint_plan_timeline()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")
