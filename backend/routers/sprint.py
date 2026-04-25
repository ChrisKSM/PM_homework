from fastapi import APIRouter, HTTPException
from services import jira_service

router = APIRouter()


@router.get("/{sprint_id}/issues")
async def get_sprint_issues(sprint_id: int):
    try:
        raw = await jira_service.fetch_sprint_issues(sprint_id)
        return [jira_service.normalize_issue(i) for i in raw]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sprint_id}/wbs")
async def get_sprint_wbs(sprint_id: int):
    try:
        raw = await jira_service.fetch_sprint_issues(sprint_id)
        issues = [jira_service.normalize_issue(i) for i in raw]
        tree = jira_service.build_wbs_tree(issues)
        return {"tree": tree, "total_issues": len(issues)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sprint_id}/stats")
async def get_sprint_stats(sprint_id: int, board_id: int = None):
    try:
        raw = await jira_service.fetch_sprint_issues(sprint_id)
        issues = [jira_service.normalize_issue(i) for i in raw]
        sprint_info = {"id": sprint_id, "name": f"Sprint {sprint_id}", "state": "active",
                       "start_date": None, "end_date": None}
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
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
