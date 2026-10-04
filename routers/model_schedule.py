"""모델 현황 일정 저장/로드 API — Milvus 연동."""
from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from config import settings
from services import mongo_helper
from services.email_service import send_html_email
from services.schedule_snapshot_email import build_snapshot_html, build_snapshot_subject

router = APIRouter(prefix="/api/model-schedule", tags=["model-schedule"])

COLLECTION = "model_schedule_data"


class ScheduleSaveRequest(BaseModel):
    rows: list[dict[str, Any]]


class ScheduleShareRequest(BaseModel):
    period_label: str = Field(..., description="예: 9/15 ~ 10/26")
    dates: list[str] = Field(..., description="Gantt 열 날짜 YYYY-MM-DD")
    rows: list[dict[str, Any]]
    audiences: list[str] = Field(..., description="DQA, 개발 — 하나 이상")
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


def _resolve_share_recipients(audiences: set[str], override: list[str] | None) -> list[str]:
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
        for addr in _parse_recipients(settings.model_schedule_share_dev_recipients):
            if addr not in seen:
                seen.add(addr)
                ordered.append(addr)

    if ordered:
        return ordered

    legacy = _parse_recipients(settings.model_schedule_share_recipients)
    return legacy or ["seokmin.koh@lge.com"]


@router.post("/share")
async def share_schedule_snapshot(req: ScheduleShareRequest):
    """Snapshot HTML 메일 발송 — DQA 또는 개발 선택 시."""
    allowed = {"DQA", "개발"}
    aud = {a.strip() for a in req.audiences if a and str(a).strip() in allowed}
    if not aud:
        raise HTTPException(status_code=400, detail="DQA 또는 개발 중 하나 이상 선택해야 발송됩니다.")

    if not req.rows:
        raise HTTPException(status_code=400, detail="발송할 일정 데이터가 없습니다.")

    if not settings.smtp_host:
        raise HTTPException(
            status_code=503,
            detail="SMTP 미설정 — BE .env 에 SMTP_HOST, SMTP_USER, SMTP_PASSWORD 를 설정하세요.",
        )

    to_addrs = _resolve_share_recipients(aud, req.recipients)
    if not to_addrs:
        raise HTTPException(status_code=400, detail="수신자 목록이 비어 있습니다.")

    subject = build_snapshot_subject(date.today())
    html = build_snapshot_html(
        period_label=req.period_label,
        dates=req.dates,
        rows=req.rows,
        audiences=sorted(aud),
    )

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
        "audiences": sorted(aud),
    }
