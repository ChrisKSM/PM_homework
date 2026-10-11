"""모델 현황 일정 저장/로드 API — Milvus 연동."""
from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from config import settings, smtp_is_configured
from services import mongo_helper
from services.email_service import decode_page_image_data, send_html_email, send_plain_and_html_email
from services.overview_snapshot_email import (
    build_overview_plain_text,
    build_overview_snapshot_html,
    build_overview_subject,
    _split_model_pages,
)
from services.model_schedule_recipients import dev_emails_from_models
from services.schedule_snapshot_email import build_snapshot_html, build_snapshot_subject

router = APIRouter(prefix="/api/model-schedule", tags=["model-schedule"])

COLLECTION = "model_schedule_data"
COLLECTION_OVERVIEW = "model_schedule_overview"


class ScheduleSaveRequest(BaseModel):
    rows: list[dict[str, Any]]


class OverviewSaveRequest(BaseModel):
    models: list[dict[str, Any]]


class OverviewPageImage(BaseModel):
    page: int = Field(..., ge=1, description="1-based page number")
    data: str = Field(..., description="PNG base64 (data:image/png;base64,... 또는 raw)")


class ScheduleShareRequest(BaseModel):
    period_label: str = Field(..., description="예: 9/15 ~ 10/26")
    dates: list[str] = Field(..., description="Gantt 열 날짜 YYYY-MM-DD")
    rows: list[dict[str, Any]] | None = Field(default=None, description="모델 검증 상세 Gantt rows")
    snapshot_type: str | None = Field(
        default=None,
        description='overview 이면 전 모델 일정 Snapshot (models + display_rows 필요)',
    )
    models: list[dict[str, Any]] | None = Field(default=None, description="전 모델 일정 models")
    display_rows: list[dict[str, Any]] | None = Field(default=None, description="전 모델 일정 display_rows")
    page_images: list[OverviewPageImage] | None = Field(default=None, description="overview snapshot PNG")
    audiences: list[str] = Field(..., description="DQA, 개발 — 하나 이상")
    recipients: list[str] | None = Field(default=None, description="테스트용 수신자 override")
    schedule_changes: list[dict[str, Any]] | None = Field(
        default=None,
        description="편집 전후 일정 diff (model, test_type, before, after)",
    )
    month_schedule_summary: list[dict[str, Any]] | None = Field(
        default=None,
        description="이번 달 모델별 일반성능 일정 요약 (model, schedule)",
    )


class OverviewShareRequest(BaseModel):
    period_label: str
    dates: list[str]
    models: list[dict[str, Any]]
    display_rows: list[dict[str, Any]]
    page_images: list[OverviewPageImage] | None = Field(
        default=None,
        description="Page 1/2 snapshot PNG (FE html2canvas)",
    )
    audiences: list[str] = Field(..., description="개발 (전 모델 일정은 개발만)")
    recipients: list[str] | None = Field(default=None, description="테스트용 수신자 override")


@router.get("/diagnose")
async def diagnose_schedule():
    """Milvus DB 연결 진단 — BE pod에서 curl 로 확인."""
    try:
        return mongo_helper.diagnose(COLLECTION)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"진단 실패: {e}")


@router.get("/load")
async def load_schedule():
    """Milvus에서 일정 데이터 로드."""
    try:
        if not mongo_helper.ensure_collection(COLLECTION):
            raise HTTPException(
                status_code=502,
                detail=f"DB collection 준비 실패: {COLLECTION} — {mongo_helper.collection_error(COLLECTION)}",
            )

        docs = mongo_helper.get_all_documents(COLLECTION, use_cache=False)
        for doc in docs:
            doc.pop("_id", None)
        return {"rows": docs, "count": len(docs)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"DB 오류: {e}")


@router.post("/save")
async def save_schedule(req: ScheduleSaveRequest):
    """Milvus에 일정 데이터 저장 (전체 교체)."""
    try:
        if not mongo_helper.ensure_collection(COLLECTION):
            raise HTTPException(
                status_code=502,
                detail=f"DB collection 준비 실패: {COLLECTION} — {mongo_helper.collection_error(COLLECTION)}",
            )

        if not mongo_helper.delete_all_documents(COLLECTION):
            raise HTTPException(status_code=502, detail="기존 데이터 삭제 실패")

        if req.rows and not mongo_helper.insert_documents(COLLECTION, req.rows):
            raise HTTPException(status_code=502, detail="DB 저장 실패")

        return {"saved": len(req.rows), "message": "저장 완료"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"DB 저장 오류: {e}")


def _parse_recipients(raw: str) -> list[str]:
    return [a.strip() for a in raw.split(",") if a.strip()]


def _resolve_share_recipients(
    audiences: set[str],
    override: list[str] | None,
    *,
    models: list[dict[str, Any]] | None = None,
) -> list[str]:
    if override:
        return override

    ordered: list[str] = []
    seen: set[str] = set()
    if "DQA" in audiences:
        for addr in _parse_recipients(settings.model_schedule_share_dqa_recipients):
            if addr not in seen:
                seen.add(addr)
                ordered.append(addr)
    if "개발" in audiences:
        schedule_dev = dev_emails_from_models(models)
        dev_addrs = schedule_dev or _parse_recipients(settings.model_schedule_share_dev_recipients)
        for addr in dev_addrs:
            if addr not in seen:
                seen.add(addr)
                ordered.append(addr)

    if ordered:
        return ordered

    legacy = _parse_recipients(settings.model_schedule_share_recipients)
    return legacy or ["seokmin.koh@lge.com"]


@router.get("/overview/load")
async def load_overview_schedule():
    """전 모델 일정 — Milvus에서 models + events 로드."""
    try:
        if not mongo_helper.ensure_collection(COLLECTION_OVERVIEW):
            raise HTTPException(
                status_code=502,
                detail=f"DB collection 준비 실패: {COLLECTION_OVERVIEW} — {mongo_helper.collection_error(COLLECTION_OVERVIEW)}",
            )
        docs = mongo_helper.get_all_documents(COLLECTION_OVERVIEW, use_cache=False)
        for doc in docs:
            doc.pop("_id", None)
        return {"models": docs, "count": len(docs)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"DB 오류: {e}")


@router.post("/overview/save")
async def save_overview_schedule(req: OverviewSaveRequest):
    """전 모델 일정 — Milvus 저장 (전체 교체)."""
    try:
        if not mongo_helper.ensure_collection(COLLECTION_OVERVIEW):
            raise HTTPException(
                status_code=502,
                detail=f"DB collection 준비 실패: {COLLECTION_OVERVIEW} — {mongo_helper.collection_error(COLLECTION_OVERVIEW)}",
            )
        if not mongo_helper.delete_all_documents(COLLECTION_OVERVIEW):
            raise HTTPException(status_code=502, detail="기존 overview 데이터 삭제 실패")
        if req.models and not mongo_helper.insert_documents(COLLECTION_OVERVIEW, req.models):
            raise HTTPException(status_code=502, detail="DB 저장 실패")
        return {"saved": len(req.models), "message": "overview 저장 완료"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"DB 저장 오류: {e}")


def _is_overview_share(req: ScheduleShareRequest) -> bool:
    return req.snapshot_type == "overview" or (req.models is not None and req.display_rows is not None)


def _overview_page_images_raw(page_images: list[OverviewPageImage] | None) -> list[dict[str, Any]]:
    if not page_images:
        return []
    return [{"page": img.page, "data": img.data} for img in page_images]


def _send_overview_share_email(
    *,
    req: ScheduleShareRequest | OverviewShareRequest,
    audiences: set[str],
) -> dict[str, Any]:
    page_total = len(_split_model_pages(req.models or []))
    page_images_raw = _overview_page_images_raw(getattr(req, "page_images", None))
    has_images = bool(page_images_raw)

    subject = build_overview_subject(date.today())
    plain = build_overview_plain_text(
        period_label=req.period_label,
        models=req.models or [],
        page_total=page_total,
        has_attachments=has_images,
    )
    html = build_overview_snapshot_html(
        period_label=req.period_label,
        dates=req.dates,
        models=req.models or [],
        display_rows=req.display_rows or [],
        audiences=sorted(audiences),
        page_images=page_images_raw,
    )

    inline: list[tuple[str, bytes, str]] = []
    attach: list[tuple[str, bytes, str]] = []
    for img in page_images_raw:
        page_no = int(img.get("page", 0))
        if page_no < 1:
            continue
        try:
            raw = decode_page_image_data(str(img.get("data", "")))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Page {page_no} 이미지 decode 실패: {e}") from e
        cid = f"overview-page-{page_no}"
        inline.append((cid, raw, "image/png"))
        attach.append((f"overview-page-{page_no}.png", raw, "image/png"))

    if not smtp_is_configured():
        raise HTTPException(
            status_code=503,
            detail="SMTP 미설정 — BE .env 에 SMTP_HOST 를 설정하세요 (기본: lgesmtp.lge.com).",
        )

    to_addrs = _resolve_share_recipients(audiences, req.recipients, models=req.models)
    if not to_addrs:
        raise HTTPException(status_code=400, detail="수신자 목록이 비어 있습니다.")

    try:
        send_plain_and_html_email(
            subject=subject,
            plain_body=plain,
            html_body=html,
            recipients=to_addrs,
            inline_images=inline or None,
            attachments=attach or None,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"메일 발송 실패: {e}") from e

    return {
        "message": "메일 발송 완료",
        "subject": subject,
        "recipients": to_addrs,
        "audiences": sorted(audiences),
    }


def _send_share_email(
    *,
    subject: str,
    html: str,
    audiences: set[str],
    recipients: list[str] | None,
    models: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if not smtp_is_configured():
        raise HTTPException(
            status_code=503,
            detail="SMTP 미설정 — BE .env 에 SMTP_HOST 를 설정하세요 (기본: lgesmtp.lge.com).",
        )

    to_addrs = _resolve_share_recipients(audiences, recipients, models=models)
    if not to_addrs:
        raise HTTPException(status_code=400, detail="수신자 목록이 비어 있습니다.")

    try:
        send_html_email(subject=subject, html_body=html, recipients=to_addrs)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"메일 발송 실패: {e}") from e

    return {
        "message": "메일 발송 완료",
        "subject": subject,
        "recipients": to_addrs,
        "audiences": sorted(audiences),
    }


@router.post("/share")
async def share_schedule_snapshot(req: ScheduleShareRequest):
    """Snapshot HTML 메일 발송 — 모델 검증 상세(DQA/개발) 또는 전 모델 overview(개발)."""
    if _is_overview_share(req):
        allowed = {"개발"}
        aud = {a.strip() for a in req.audiences if a and str(a).strip() in allowed}
        if not aud:
            raise HTTPException(status_code=400, detail="개발 대상만 선택 가능합니다.")
        if not req.models:
            raise HTTPException(status_code=400, detail="발송할 모델 데이터가 없습니다.")
        if not req.display_rows:
            raise HTTPException(status_code=400, detail="발송할 display_rows 가 없습니다.")

        return _send_overview_share_email(req=req, audiences=aud)

    allowed = {"DQA", "개발"}
    aud = {a.strip() for a in req.audiences if a and str(a).strip() in allowed}
    if not aud:
        raise HTTPException(status_code=400, detail="DQA 또는 개발 중 하나 이상 선택해야 발송됩니다.")

    if not req.rows:
        raise HTTPException(status_code=400, detail="발송할 일정 데이터가 없습니다.")

    subject = build_snapshot_subject(date.today())
    html = build_snapshot_html(
        period_label=req.period_label,
        dates=req.dates,
        rows=req.rows,
        audiences=sorted(aud),
        schedule_changes=req.schedule_changes or [],
        month_schedule_summary=req.month_schedule_summary or [],
    )
    return _send_share_email(
        subject=subject,
        html=html,
        audiences=aud,
        recipients=req.recipients,
    )


@router.post("/overview/share")
async def share_overview_snapshot(req: OverviewShareRequest):
    """전 모델 일정 Snapshot — /share 의 overview alias (하위 호환)."""
    return await share_schedule_snapshot(
        ScheduleShareRequest(
            period_label=req.period_label,
            dates=req.dates,
            snapshot_type="overview",
            models=req.models,
            display_rows=req.display_rows,
            page_images=req.page_images,
            audiences=req.audiences,
            recipients=req.recipients,
        )
    )
