"""
Daily report API — preview and manual trigger for testing.
"""
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import HTMLResponse

from config import settings
from services.email_service import build_report_subject, send_html_email
from services.report_service import build_daily_report_html

router = APIRouter(prefix="/api/report", tags=["report"])


def _check_api_key(x_report_key: str | None) -> None:
    if settings.report_api_key and x_report_key != settings.report_api_key:
        raise HTTPException(status_code=401, detail="Invalid report API key")


@router.get("/preview", response_class=HTMLResponse)
async def preview_report():
    """브라우저에서 HTML 리포트 미리보기."""
    html = await build_daily_report_html()
    return HTMLResponse(content=html)


@router.post("/send")
async def send_report(x_report_key: str | None = Header(default=None)):
    """수동 즉시 발송 (CronJob 테스트용)."""
    _check_api_key(x_report_key)

    if not settings.report_enabled:
        raise HTTPException(status_code=400, detail="REPORT_ENABLED=false")

    html = await build_daily_report_html()
    subject = build_report_subject()
    send_html_email(subject=subject, html_body=html)
    return {"message": "리포트 메일 발송 완료", "subject": subject}
