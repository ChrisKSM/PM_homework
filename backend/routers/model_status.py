import socket

from fastapi import APIRouter, HTTPException, Query

from config import settings
from services import model_status_initiative_service


def _release_gantt_service():
    """Pod에 router만 있고 service 파일이 없을 때 uvicorn 기동은 유지."""
    try:
        from services import release_gantt_service as svc

        return svc
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "message": f"release_gantt BE 파일 누락: {e}",
                "hint": (
                    "pod에서 sh scripts/fix-release-gantt-missing.sh "
                    "또는 sh scripts/be-model-status-initiative-patch.sh 후 "
                    "sh scripts/restart-be-route-port.sh"
                ),
            },
        ) from e


def _pod_identity() -> dict[str, str]:
    return {"hostname": socket.gethostname()}

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
        "pod": _pod_identity(),
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
    # 구 FE: label 쿼리 없이 model=H7_VI 만 오는 경우 (구 BE·다중 pod 호환)
    if not (label and label.strip()) and model:
        auto = model_status_initiative_service.resolve_initiative_label(model, None)
        if auto:
            label = auto
        elif model.strip().upper().replace("-", "_").replace(" ", "_") == "H7_VI":
            label = "SoundSuite_H7(VI)"

    try:
        return await model_status_initiative_service.get_initiatives_for_model(
            model=model,
            label=label,
            project_key=project,
        )
    except ValueError as e:
        msg = str(e)
        if "TVJIRA_API_TOKEN" in msg or "JIRA_API_TOKEN" in msg:
            from tvjira_client import tvjira_token_source_info

            source, length = tvjira_token_source_info()
            raise HTTPException(
                status_code=503,
                detail={
                    "message": msg,
                    "hint": (
                        "/workspace/project/.env 에 TVJIRA_API_TOKEN=<TV Jira PAT> 추가 "
                        "(Harmony JIRA_API_TOKEN 과 별도 변수). "
                        "cp /workspace/project/.env /usr/app/src/.env · "
                        "sh scripts/be-jira-token-setup.sh · "
                        "OpenShift Variables 에 빈 TVJIRA_API_TOKEN 없는지 확인"
                    ),
                    "tvjira": {"tokenSource": source, "tokenLength": length},
                    "pod": _pod_identity(),
                },
            ) from e
        known = list(model_status_initiative_service.INITIATIVE_JIRA_LABEL_BY_MODEL.keys())
        example_label = model_status_initiative_service.INITIATIVE_JIRA_LABEL_BY_MODEL.get(
            "H7_VI", "SoundSuite_H7(VI)"
        )
        raise HTTPException(
            status_code=400,
            detail={
                "message": msg,
                "hint": (
                    f"label 쿼리 필요: &label={example_label} "
                    "(FE patch 또는 model=H7_VI&label=… 로 호출)"
                ),
                "request": {"model": model, "label": label},
                "knownModels": known,
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


@router.get("/release/calendar")
async def release_calendar():
    """2026 IR1~IR5 · SP01~SP26 고정 캘린더 (Jira 호출 없음)."""
    from services.release_sprint_calendar_2026 import calendar_payload

    return calendar_payload()


@router.get("/release/gantt/diagnose-counts")
async def release_gantt_diagnose_counts(
    model: str | None = Query(None),
    label: str | None = Query(None),
    project: str = Query("TVPLAT"),
    fix_version: str | None = Query(None, description="Milestone fixVersion override e.g. Audio_2025"),
):
    """Initiative/Epic/Milestone 단계별 Jira 건수 — pod curl 진단용."""
    if not (label and label.strip()) and model:
        auto = model_status_initiative_service.resolve_initiative_label(model, None)
        if auto:
            label = auto
    try:
        return await _release_gantt_service().diagnose_gantt_pipeline_counts(
            model=model,
            label=label,
            project_key=project,
            milestone_fix_version=fix_version,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/release/gantt/ping")
async def release_gantt_ping():
    """배포 확인 — TV Jira 호출 없음. 응답에 meta 가 있으면 release_gantt BE 파일·라우트 정상."""
    svc = _release_gantt_service()
    cal = svc.get_release_calendar()
    return {
        "ok": True,
        "meta": {
            "ping": True,
            "errors": [],
            "epicCount": 0,
            "milestoneCount": 0,
            "sprintMax": cal.get("sprintMax"),
        },
        "calendar": cal,
        "epics": [],
        "milestones": [],
    }


@router.get("/release/discover")
async def release_discover(
    model: str | None = Query(None, description="UI model code e.g. H7_VI"),
    label: str | None = Query(None, description='Jira label e.g. SoundSuite_H7(VI)'),
    initiative_key: str | None = Query(None, description="TVPLAT Initiative key"),
    project: str = Query("TVPLAT", description="Jira project key"),
    all_initiatives: bool = Query(
        False, description="true 면 라벨 Initiative 9건 전체, false 면 initiative_key 1건만"
    ),
):
    """Epic 0건일 때 Jira 탐색 요약 (링크·Story Epic Link·fixVersion JQL)."""
    if not (label and label.strip()) and model:
        auto = model_status_initiative_service.resolve_initiative_label(model, None)
        if auto:
            label = auto
    try:
        return await _release_gantt_service().diagnose_release_links(
            model=model,
            label=label,
            initiative_key=initiative_key,
            project_key=project,
            all_initiatives=all_initiatives,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/release/gantt")
async def release_gantt(
    model: str | None = Query(None, description="UI model code e.g. H7_VI"),
    label: str | None = Query(None, description='Jira label e.g. SoundSuite_H7(VI)'),
    initiative_key: str | None = Query(None, description="TVPLAT Initiative key"),
    project: str = Query("TVPLAT", description="Jira project key"),
    refresh: bool = Query(False, description="true 시 5분 캐시 무시"),
    all_initiatives: bool = Query(
        False, description="true 면 라벨 Initiative 전체 Epic, false 면 initiative_key 1건 기준"
    ),
):
    """Initiative 연계 Epic 실행 구간 + Milestone (2026 SP 캘린더 기준)."""
    if not (label and label.strip()) and model:
        auto = model_status_initiative_service.resolve_initiative_label(model, None)
        if auto:
            label = auto
        elif model.strip().upper().replace("-", "_").replace(" ", "_") == "H7_VI":
            label = "SoundSuite_H7(VI)"

    try:
        if refresh:
            from cache import clear_cache

            await clear_cache()
        return await _release_gantt_service().get_release_gantt(
            model=model,
            label=label,
            initiative_key=initiative_key,
            project_key=project,
            all_initiatives=all_initiatives,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"TV Jira release gantt 오류: {e}",
        ) from e
