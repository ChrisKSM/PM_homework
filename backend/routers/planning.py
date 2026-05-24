from fastapi import APIRouter, HTTPException, Query

from services import planning_service

router = APIRouter(prefix="/api/planning", tags=["planning"])


@router.get("/ping")
async def planning_ping():
    """배포 확인용 — Jira 호출 없음."""
    return {"ok": True, "service": "planning"}


@router.get("/filters")
async def planning_filters():
    """Gate / Sprint 필터 옵션."""
    try:
        return await planning_service.get_planning_filters()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/compliance")
async def planning_compliance():
    """계층 연결률, AC 충족률, Sprint Goal, 체크리스트."""
    try:
        return await planning_service.get_planning_compliance()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/hierarchy")
async def planning_hierarchy(
    gate: str | None = Query(None),
    sprint: str | None = Query(None),
    status: str | None = Query(None),
):
    """L1 Release → L2 Sprint → L3 Epic → L4 Story 계층 트리."""
    try:
        return await planning_service.get_planning_hierarchy(gate=gate, sprint=sprint, status=status)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/traceability")
async def planning_traceability(
    gate: str | None = Query(None),
    sprint: str | None = Query(None),
    status: str | None = Query(None),
):
    """Story × Gate · Sprint · Epic · AC · DoD 추적성 매트릭스."""
    try:
        return await planning_service.get_planning_traceability(gate=gate, sprint=sprint, status=status)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/stories/{issue_key}")
async def story_detail(issue_key: str):
    """Story 상세 — AC, DoD, Sprint Goal, 우선순위 근거."""
    try:
        return await planning_service.get_story_detail(issue_key)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")
