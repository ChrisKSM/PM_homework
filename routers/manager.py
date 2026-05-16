from fastapi import APIRouter, HTTPException
from services import jira_service

router = APIRouter(prefix="/api", tags=["manager"])


@router.get("/metrics/summary")
async def project_summary():
    """조직 책임자용 전체 KPI 요약."""
    try:
        return await jira_service.get_project_summary()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/epics/progress")
async def epic_progress():
    """Epic별 진행률 (완료 / 진행중 / 미시작 SP)."""
    try:
        return await jira_service.get_epic_progress()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/issues/distribution")
async def issue_distribution():
    """이슈 상태 분포 집계."""
    try:
        return await jira_service.get_issue_distribution()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/sprints/velocity")
async def velocity():
    """스프린트별 계획 대비 완료 Velocity."""
    try:
        return await jira_service.get_velocity()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.get("/issues/risks")
async def risk_issues():
    """Blocked / 고우선순위 리스크 이슈 목록."""
    try:
        return await jira_service.get_risk_issues()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")
