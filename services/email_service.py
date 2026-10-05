"""
SMTP email delivery — LGE 내부 relay(lgesmtp.lge.com:25, STARTTLS, 무인증) 지원.
"""
from __future__ import annotations

import smtplib
import ssl
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings

MAX_RETRIES = 3


def _parse_recipients(raw: str) -> list[str]:
    return [addr.strip() for addr in raw.split(",") if addr.strip()]


def _normalize_sender(raw: str) -> str:
    """`.env` 줄 붙음 bug: `...@lge.comSMTP_HOST=...` → 발신 주소만 추출."""
    addr = str(raw or "").strip()
    if "SMTP_" in addr:
        addr = addr.split("SMTP_", 1)[0].rstrip()
    return addr


def _tls_context() -> ssl.SSLContext | None:
    """내부 relay용 — 인증서 검증 생략 (사내 스크립트와 동일)."""
    if settings.smtp_verify_ssl:
        return None
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _create_smtp_connection() -> smtplib.SMTP:
    server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30)
    server.ehlo()
    if settings.smtp_use_tls:
        server.starttls(context=_tls_context())
        server.ehlo()
    if settings.smtp_user:
        server.login(settings.smtp_user, settings.smtp_password or "")
    return server


def _send_with_retry(*, sender: str, to_addrs: list[str], msg: str) -> None:
    server = _create_smtp_connection()
    try:
        for attempt in range(MAX_RETRIES):
            try:
                server.sendmail(sender, to_addrs, msg)
                return
            except (
                smtplib.SMTPServerDisconnected,
                smtplib.SMTPConnectError,
                ConnectionResetError,
            ):
                if attempt >= MAX_RETRIES - 1:
                    raise
                try:
                    server.close()
                except Exception:
                    pass
                time.sleep(2)
                server = _create_smtp_connection()
    finally:
        try:
            server.quit()
        except Exception:
            pass


def send_html_email(*, subject: str, html_body: str, recipients: list[str] | None = None) -> None:
    """Send HTML email via SMTP. Raises if SMTP is not configured."""
    to_addrs = recipients or _parse_recipients(settings.report_recipients)
    if not to_addrs:
        raise ValueError("수신자(REPORT_RECIPIENTS)가 설정되지 않았습니다.")

    if not settings.smtp_host:
        raise ValueError("SMTP_HOST가 설정되지 않았습니다.")

    sender = _normalize_sender(
        settings.smtp_from or settings.smtp_user or "DL-webOS_PMO-AudioSWPO@lge.com"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(to_addrs)
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    _send_with_retry(sender=sender, to_addrs=to_addrs, msg=msg.as_string())


def build_report_subject() -> str:
    from datetime import date

    prefix = settings.report_subject_prefix.strip()
    today = date.today().isoformat()
    if prefix:
        return f"{prefix} Daily Snapshot — {today}"
    return f"Jira Dashboard Daily Snapshot — {today}"
