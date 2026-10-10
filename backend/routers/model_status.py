from fastapi import APIRouter, HTTPException, Query

from services import model_status_initiative_service

router = APIRouter(prefix="/api/model-status", tags=["model-status"])


@router.get("/initiatives/ping")
async def initiatives_ping():
    """배포 확인 — Jira 호출 없음."""
    return {
        "ok": True,
        "service": "model-status-initiatives",
        "models": list(model_status_initiative_service.INITIATIVE_JIRA_LABEL_BY_MODEL.keys()),
    }


@router.get("/initiatives")
async def list_initiatives(
    model: str | None = Query(None, description="UI model code e.g. H7_VI"),
    label: str | None = Query(None, description='Jira label e.g. SoundSuite_H7(VI)'),
    project: str = Query("TVPLAT", description="Jira project key"),
):
    """
    TVPLAT Initiative 목록.
    기본 JQL: project = TVPLAT AND issuetype = Initiative AND labels in ("…")
    """
    try:
        return await model_status_initiative_service.get_initiatives_for_model(
            model=model,
            label=label,
            project_key=project,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Jira API 오류: {e} — GET /api/jira/diagnose",
        )
