"""
SMTP email delivery for daily reports.
"""
from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings


def _parse_recipients(raw: str) -> list[str]:
    return [addr.strip() for addr in raw.split(",") if addr.strip()]


def send_html_email(*, subject: str, html_body: str, recipients: list[str] | None = None) -> None:
    """Send HTML email via SMTP. Raises if SMTP is not configured."""
    to_addrs = recipients or _parse_recipients(settings.report_recipients)
    if not to_addrs:
        raise ValueError("수신자(REPORT_RECIPIENTS)가 설정되지 않았습니다.")

    if not settings.smtp_host:
        raise ValueError("SMTP_HOST가 설정되지 않았습니다.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user or "noreply@localhost"
    msg["To"] = ", ".join(to_addrs)
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(msg["From"], to_addrs, msg.as_string())


def build_report_subject() -> str:
    from datetime import date

    prefix = settings.report_subject_prefix.strip()
    today = date.today().isoformat()
    if prefix:
        return f"{prefix} Daily Snapshot — {today}"
    return f"Jira Dashboard Daily Snapshot — {today}"
