from fastapi import APIRouter, HTTPException, Query

from config import settings
from services import model_status_initiative_service

router = APIRouter(prefix="/api/model-status", tags=["model-status"])


@router.get("/initiatives/ping")
async def initiatives_ping():
    """배포 확인 — Jira 호출 없음."""
    from tvjira_client import tvjira_token_source_info

    source, length = tvjira_token_source_info()
    return {
        "ok": True,
        "service": "model-status-initiatives",
        "models": list(model_status_initiative_service.INITIATIVE_JIRA_LABEL_BY_MODEL.keys()),
        "tvjira": {
            "baseUrl": settings.tvjira_base_url.rstrip("/"),
            "tokenSource": source,
            "tokenLength": length,
        },
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
        raise HTTPException(
            status_code=400,
            detail={
                "message": str(e),
                "hint": "model=H7_VI 와 label=SoundSuite_H7(VI) 를 함께 보내거나 BE patch 후 uvicorn 8000 재시작",
                "knownModels": list(
                    model_status_initiative_service.INITIATIVE_JIRA_LABEL_BY_MODEL.keys()
                ),
            },
        )
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "message": f"Initiative BE 파일 누락: {e}",
                "hint": "BE pod에서 sh scripts/be-model-status-initiative-patch.sh 후 restart-be-route-port.sh",
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"TV Jira API 오류: {e} — TVJIRA_API_TOKEN · GET /api/model-status/initiatives/ping",
        )
