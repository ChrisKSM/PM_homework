from fastapi import APIRouter, HTTPException
from services import jira_service

router = APIRouter()


@router.get("/projects")
async def get_projects():
    try:
        projects = await jira_service.fetch_projects()
        return [
            {
                "key": p.get("key"),
                "name": p.get("name"),
                "id": p.get("id"),
                "project_type": p.get("projectTypeKey"),
                "avatar_url": (p.get("avatarUrls") or {}).get("48x48", ""),
            }
            for p in projects
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_key}/boards")
async def get_boards(project_key: str):
    try:
        boards = await jira_service.fetch_boards(project_key)
        return boards
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boards/{board_id}/sprints")
async def get_sprints(board_id: int, state: str = None):
    try:
        sprints = await jira_service.fetch_sprints(board_id, state)
        return [
            {
                "id": s.get("id"),
                "name": s.get("name"),
                "state": s.get("state"),
                "start_date": s.get("startDate"),
                "end_date": s.get("endDate"),
                "complete_date": s.get("completeDate"),
                "board_id": s.get("originBoardId"),
            }
            for s in sprints
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
