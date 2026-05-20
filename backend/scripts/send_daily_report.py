#!/usr/bin/env python3
"""
Daily dashboard report CLI — for K8s CronJob or manual execution.

Usage:
  python scripts/send_daily_report.py              # send email
  python scripts/send_daily_report.py --dry-run    # print summary, no email
  python scripts/send_daily_report.py --output report.html
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# backend/ 를 import path에 추가
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from config import settings
from services.email_service import build_report_subject, send_html_email
from services.report_service import build_daily_report_html


async def run(*, dry_run: bool, output: Path | None) -> int:
    if not settings.report_enabled and not dry_run:
        print("REPORT_ENABLED=false — 발송 건너뜀")
        return 0

    print("리포트 데이터 수집 중...")
    html = await build_daily_report_html()

    if output:
        output.write_text(html, encoding="utf-8")
        print(f"HTML 저장: {output}")

    if dry_run:
        print(f"[dry-run] HTML 길이: {len(html)} bytes")
        print(f"[dry-run] 수신자: {settings.report_recipients or '(미설정)'}")
        return 0

    subject = build_report_subject()
    send_html_email(subject=subject, html_body=html)
    print(f"메일 발송 완료: {subject}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Send daily Jira dashboard report email")
    parser.add_argument("--dry-run", action="store_true", help="Generate HTML only, do not send email")
    parser.add_argument("--output", type=Path, help="Save HTML to file")
    args = parser.parse_args()

    try:
        code = asyncio.run(run(dry_run=args.dry_run, output=args.output))
        raise SystemExit(code)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
