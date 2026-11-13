"""요구사항 검토 — Initiative(TV Jira) due date 조회 (편집창 '가져오기' 전용)."""
from __future__ import annotations

import asyncio
import re
from typing import Any

import httpx

MAX_KEYS = 6
_ISSUE_KEY_RE = re.compile(r"^[A-Z][A-Z0-9_]+-\d+$")


def parse_issue_keys(raw: str) -> list[str]:
    keys: list[str] = []
    for part in re.split(r"[,\s]+", raw or ""):
        key = part.strip().upper()
        if not key:
            continue
        if not _ISSUE_KEY_RE.match(key):
            raise ValueError(f"invalid Jira issue key: {part!r}")
        if key not in keys:
            keys.append(key)
    if not keys:
        raise ValueError("keys required")
    if len(keys) > MAX_KEYS:
        raise ValueError(f"at most {MAX_KEYS} keys")
    return keys


def _error_text(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        if code == 404:
            return "Jira 이슈 없음 (404)"
        if code in (401, 403):
            return f"Jira 권한 없음 ({code})"
        return f"Jira HTTP {code}"
    return str(exc)[:160]


async def fetch_initiative_due_dates(keys: list[str]) -> list[dict[str, Any]]:
    from tvjira_client import tvjira_get_issue, tvjira_issue_browse_url

    async def one(key: str) -> dict[str, Any]:
        row: dict[str, Any] = {"key": key, "url": tvjira_issue_browse_url(key), "dueDate": ""}
        try:
            issue = await tvjira_get_issue(key, ["duedate", "summary", "status"])
        except ValueError:
            raise
        except Exception as exc:
            row["error"] = _error_text(exc)
            return row
        fields = issue.get("fields") or {}
        due = str(fields.get("duedate") or "").strip()
        row["dueDate"] = due[:10]
        row["summary"] = str(fields.get("summary") or "")
        status = fields.get("status")
        row["status"] = str(status.get("name") or "") if isinstance(status, dict) else ""
        return row

    return list(await asyncio.gather(*(one(k) for k in keys)))
