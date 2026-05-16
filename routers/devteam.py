from fastapi import APIRouter, HTTPException
from services import jira_service

router = APIRouter(prefix="/api", tags=["devteam"])


@router.get("/sprints/current/summary")
async def sprint_summary():
    """현재 스프린트 KPI (남은 SP, 완료율, 블로커, D-day)."""
    try:
        return await jira_service.get_sprint_summary()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/sprints/current/burndown")
async def burndown_current():
    """현재 스프린트 번다운 차트 데이터."""
    try:
        return await jira_service.get_burndown()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/sprints/{sprint_id}/burndown")
async def burndown_by_id(sprint_id: int):
    """특정 스프린트 번다운 차트 데이터."""
    try:
        return await jira_service.get_burndown(sprint_id=sprint_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/team/workload")
async def team_workload():
    """팀원별 담당 Story Points 분배."""
    try:
        return await jira_service.get_team_workload()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/issues/current-sprint")
async def current_sprint_issues():
    """현재 스프린트 이슈 전체 목록."""
    try:
        return await jira_service.get_current_sprint_issues()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")
