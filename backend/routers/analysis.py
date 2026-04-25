from fastapi import APIRouter, HTTPException
from services import jira_service, ai_service

router = APIRouter()


@router.post("/sprint/{sprint_id}")
async def analyze_sprint(sprint_id: int, board_id: int = None):
    try:
        raw = await jira_service.fetch_sprint_issues(sprint_id)
        issues = [jira_service.normalize_issue(i) for i in raw]
        sprint_info = {"id": sprint_id, "name": f"Sprint {sprint_id}",
                       "state": "active", "start_date": None, "end_date": None}
        if board_id:
            sprints = await jira_service.fetch_sprints(board_id)
            for s in sprints:
                if s["id"] == sprint_id:
                    sprint_info = {
                        "id": s.get("id"), "name": s.get("name"), "state": s.get("state"),
                        "start_date": s.get("startDate"), "end_date": s.get("endDate"),
                        "complete_date": s.get("completeDate"), "board_id": s.get("originBoardId"),
                    }
                    break
        stats = jira_service.compute_sprint_stats(sprint_info, issues)
        analysis = await ai_service.analyze_sprint(stats, issues)
        return {"stats": stats, "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sprint/{sprint_id}/risks")
async def quick_risk_analysis(sprint_id: int):
    try:
        raw = await jira_service.fetch_sprint_issues(sprint_id)
        issues = [jira_service.normalize_issue(i) for i in raw]
        risks = await ai_service.analyze_risks_only(issues)
        return {"risks": risks, "sprint_id": sprint_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
