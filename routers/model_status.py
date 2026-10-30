import socket

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import settings
from services import model_status_initiative_service


def _sprint_story_label_models() -> set[str]:
    return set(model_status_initiative_service.INITIATIVE_JIRA_LABEL_BY_MODEL.keys())


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


def _gantt_http_detail_message(detail: object) -> str:
    if isinstance(detail, str):
        return detail
    if isinstance(detail, dict):
        msg = detail.get("message") or detail.get("detail")
        hint = detail.get("hint")
        parts = [str(msg)] if msg else [str(detail)]
        if hint:
            parts.append(str(hint))
        return " — ".join(parts)
    return str(detail)


def _gantt_http_status_for_error(detail: object, default: int = 400) -> int:
    msg = _gantt_http_detail_message(detail)
    try:
        from tvjira_client import is_tvjira_config_error

        if is_tvjira_config_error(msg):
            return 503
    except ImportError:
        pass
    return default


def _gantt_failure_response(
    status_code: int,
    detail: object,
    *,
    model: str | None = None,
    label: str | None = None,
) -> JSONResponse:
    try:
        from services.release_gantt_service import release_gantt_error_envelope
    except ImportError as imp:
        body = {
            "meta": {
                "errors": [
                    _gantt_http_detail_message(detail),
                    f"release_gantt_service import failed: {imp}",
                ],
                "epicCount": 0,
                "milestoneCount": 0,
                "discovery": {"failed": True},
            },
            "calendar": {"sprintMin": 1, "sprintMax": 26, "sprints": [], "irBands": []},
            "initiative": None,
            "epics": [],
            "milestones": [],
        }
        return JSONResponse(status_code=status_code, content=body)
    body = release_gantt_error_envelope(
        _gantt_http_detail_message(detail),
        model=model,
        label=label,
    )
    body["meta"]["discovery"]["httpStatus"] = status_code
    body["meta"]["pod"] = _pod_identity()
    return JSONResponse(status_code=status_code, content=body)

router = APIRouter(prefix="/api/model-status", tags=["model-status"])


@router.get("/initiatives/ping")
async def initiatives_ping():
    """배포 확인 — Jira 호출 없음."""
    from tvjira_client import tvjira_token_source_info

    from jira_client import (
        jira_related_dej_variable_lengths,
        jira_related_dotenv_lengths,
        jira_related_env_lengths,
        jira_related_process_env_lengths,
    )
    from dej_variables import dej_sdk_variables_available

    source, length = tvjira_token_source_info()
    env_lens = jira_related_env_lengths()
    return {
        "ok": True,
        "service": "model-status-initiatives",
        "models": sorted(
            set(model_status_initiative_service.INITIATIVE_JIRA_LABEL_BY_MODEL.keys())
            | set(_sprint_story_label_models())
        ),
        "sprintModels": sorted(_sprint_story_label_models()),
        "tvjira": {
            "baseUrl": settings.tvjira_base_url.rstrip("/"),
            "tokenSource": source,
            "tokenLength": length,
        },
        "envLengths": env_lens,
        "dejVariableLengths": jira_related_dej_variable_lengths(),
        "processEnvLengths": jira_related_process_env_lengths(),
        "dejSdkVariables": dej_sdk_variables_available(),
        "dotenvTokenLengths": jira_related_dotenv_lengths(),
        "pod": _pod_identity(),
    }


@router.get("/initiatives/story-sp-kpi")
async def initiatives_story_sp_kpi(
    model: str | None = Query(None),
    label: str | None = Query(None),
    project: str = Query("TVPLAT"),
    debug_initiative_key: str | None = Query(
        None, description="예: TVPLAT-943406 — Description·Story SP 진단"
    ),
):
    """
    KPI-1 SP 소진율 — 라벨 Initiative(9건) Description 표 '예상 SP' 합 vs Story SP 합.
    릴리즈 Gantt SP 캘린더 경과율과 별개.
    """
    if not (label and label.strip()) and model:
        auto = model_status_initiative_service.resolve_initiative_label(model, None)
        if auto:
            label = auto
    try:
        from services.initiative_sp_kpi_service import preview_story_sp_kpi

        return await preview_story_sp_kpi(
            model=model,
            label=label,
            project_key=project,
            debug_initiative_key=debug_initiative_key,
        )
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "message": f"initiative_sp_kpi_service missing: {e}",
                "hint": "sh scripts/apply-be-story-sp-kpi.sh && restart-be-route-port.sh",
                "plannedSpTotal": None,
            },
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={
                "message": str(e),
                "plannedSpTotal": None,
                "hint": "TVJIRA_API_TOKEN · GET /api/model-status/initiatives/ping",
            },
        ) from e


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


@router.get("/release/gantt/demo-milestones")
async def release_gantt_demo_milestones(
    model: str | None = Query(None),
    label: str | None = Query(None),
    project: str = Query("TVPLAT"),
    initiative_key: str | None = Query(None),
    all_initiatives: bool = Query(True, description="false 면 initiative_key 1건만"),
):
    """
    Initiative → linked Epic 중 [Demo]+Initiative제목 Epic → Epic Link Milestone 전체 목록.
    총 마일스톤 건수 확인용 (fixVersion JQL 미사용).
    """
    if not (label and label.strip()) and model:
        auto = model_status_initiative_service.resolve_initiative_label(model, None)
        if auto:
            label = auto
    try:
        return await _release_gantt_service().list_demo_milestone_inventory(
            model=model,
            label=label,
            project_key=project,
            all_initiatives=all_initiatives,
            initiative_key=initiative_key,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


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
    build = getattr(svc, "RELEASE_GANTT_SERVICE_BUILD", "unknown")
    return {
        "ok": True,
        "meta": {
            "ping": True,
            "errors": [],
            "epicCount": 0,
            "milestoneCount": 0,
            "sprintMax": cal.get("sprintMax"),
            "discovery": {"serviceBuild": build},
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
        True, description="true 면 라벨 Initiative 9건 [Demo] Epic, false 면 initiative_key 1건만"
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
    except HTTPException as e:
        return _gantt_failure_response(
            e.status_code,
            e.detail,
            model=model,
            label=label,
        )
    except ValueError as e:
        code = _gantt_http_status_for_error(str(e), 400)
        return _gantt_failure_response(code, str(e), model=model, label=label)
    except Exception as e:
        msg = f"TV Jira release gantt 오류: {e}"
        code = _gantt_http_status_for_error(msg, 502)
        return _gantt_failure_response(code, msg, model=model, label=label)


@router.get("/prd/query-catalog")
async def model_status_prd_query_catalog(
    model: str | None = Query(None, description="UI model e.g. H7_VI"),
    project_key: str | None = Query(None, description="Polarion project override"),
    max_queries: int = Query(50, ge=1, le=80),
):
    """
    PRD Lucene 후보 probe — **Polarion UI URL** 포함.
    브라우저에서 recommended[].polarionUrl 로 hit 쿼리 확인.
    """
    from services.model_status_prd_service import get_prd_query_catalog

    try:
        return await get_prd_query_catalog(model, project_key=project_key, max_queries=max_queries)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"PRD query catalog 오류: {e}") from e


@router.get("/sprint/dashboard")
async def model_status_sprint_dashboard(
    model: str | None = Query(None, description="UI model e.g. H7_VI"),
    label: str | None = Query(None, description='Jira label e.g. SoundSuite_H7(VI)'),
    project: str = Query("TVPLAT", description="Jira project key"),
):
    """
    TV Jira (TVPLAT) — Initiative Description 마일스톤 + release/gantt Epic Milestone.
    Harmony 보드 / S80C 스프린트와 무관. H7_VI 등 Initiative label 매핑 모델.
    """
    from services.model_status_sprint_service import (
        get_sprint_dashboard_for_model,
        resolve_sprint_model_label,
    )

    if not (label and label.strip()) and model:
        auto = resolve_sprint_model_label(model, None)
        if auto:
            label = auto
        elif model.strip().upper().replace("-", "_").replace(" ", "_") == "H7_VI":
            label = "SoundSuite_H7(VI)"

    try:
        return await get_sprint_dashboard_for_model(model=model, label=label, project_key=project)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "message": str(e),
                "knownModels": sorted(model_status_initiative_service.INITIATIVE_JIRA_LABEL_BY_MODEL.keys()),
                "hint": "model=H7_VI & label=SoundSuite_H7(VI) — Initiative/릴리즈 탭과 동일",
            },
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"TV Jira sprint 집계 오류: {e} — TVJIRA_API_TOKEN · GET /api/model-status/initiatives/ping",
        ) from e


@router.get("/prd")
async def model_status_prd(
    model: str | None = Query(None, description="UI model e.g. H7_VI"),
    probe: bool = Query(False, description="true면 Lucene probe 결과 포함"),
    discover: bool = Query(False, description="true면 type/필드 discovery probe (probe 0 hit 시 자동)"),
    project_key: str | None = Query(None, description="Polarion project override"),
    alm_type: str = Query("tv", description="davis alm_type (alm page.js)"),
):
    """
    ALM PRD workitem — 적용모델(Sound Suite H7 등) 필터 probe/조회.
    Polarion PAT 또는 DAVIS_DB_API_* 설정 필요.
    """
    from services.model_status_prd_service import get_prd_for_model

    try:
        return await get_prd_for_model(
            model,
            probe=probe,
            discover=discover,
            project_key=project_key,
            alm_type=alm_type,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"PRD ALM 조회 오류: {e}") from e


class ModelStatusPrdLabelBody(BaseModel):
    model: str = Field(..., description="UI model e.g. H7_VI")
    prdId: str = Field(..., description="Polarion workitem id")
    reviewLabel: str = Field("", description="검토 일정/그룹 라벨 (Milvus 저장)")
    almLabels: list[str] | None = Field(None, description="저장 시 ALM labels 스냅샷")


@router.put("/prd/labels")
async def model_status_prd_save_label(body: ModelStatusPrdLabelBody):
    """PRD 검토 라벨 — Milvus model_status_prd_labels."""
    from services.model_status_prd_labels import save_review_label

    try:
        doc = save_review_label(
            model=body.model,
            prd_id=body.prdId,
            review_label=body.reviewLabel,
            alm_labels=body.almLabels,
        )
        return {"ok": True, "label": doc}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"PRD label 저장 오류: {e}") from e
