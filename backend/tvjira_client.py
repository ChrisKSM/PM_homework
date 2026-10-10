"""
TV Jira (TVPLAT 등) REST API 클라이언트.

Harmony 보드(JIRA_*)와 URL·PAT를 분리 — TVJIRA_BASE_URL / TVJIRA_API_TOKEN 사용.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from config import settings
from jira_client import (
    _DOTENV_PATHS,
    _make_authed_client,
    _normalize_token,
    _read_token_from_dotenv_keys,
)

_TVJIRA_DOTENV_KEYS = ("TVJIRA_API_TOKEN",)
_TVJIRA_ENV_KEYS = ("TVJIRA_API_TOKEN", "TVJIRA_TOKEN", "TVJIRA_PAT")


def tvjira_token_source_info() -> tuple[str, int]:
    """토큰 출처·길이만 반환 (값 노출 금지)."""
    token = _normalize_token(settings.tvjira_api_token)
    if token:
        return "settings.tvjira_api_token", len(token)
    token = _read_token_from_dotenv_keys(*_TVJIRA_DOTENV_KEYS)
    if token:
        for path in _DOTENV_PATHS:
            if path.is_file():
                return f"dotenv:{path}:TVJIRA_API_TOKEN", len(token)
        return "dotenv:TVJIRA_API_TOKEN", len(token)
    for key in _TVJIRA_ENV_KEYS:
        token = _normalize_token(os.getenv(key))
        if token:
            return f"env:{key}", len(token)
    token = _read_token_from_dotenv_keys("JIRA_API_TOKEN")
    if token:
        return "dotenv:JIRA_API_TOKEN(fallback)", len(token)
    token = _normalize_token(settings.jira_api_token)
    if token:
        return "settings.jira_api_token(fallback)", len(token)
    for key in ("JIRA_API_TOKEN", "JIRA_TOKEN", "JIRA_PAT"):
        token = _normalize_token(os.getenv(key))
        if token:
            return f"env:{key}(fallback)", len(token)
    return "none", 0


def resolve_tvjira_token() -> str:
    source, length = tvjira_token_source_info()
    if length == 0:
        raise ValueError(
            "TVJIRA_API_TOKEN이 비어 있습니다. "
            "/usr/app/src/.env 또는 /workspace/project/.env 에 "
            "TVJIRA_API_TOKEN=<PAT> 설정 (Harmony JIRA_API_TOKEN 과 별도)."
        )
    token = _normalize_token(settings.tvjira_api_token)
    if token:
        return token
    token = _read_token_from_dotenv_keys(*_TVJIRA_DOTENV_KEYS)
    if token:
        return token
    for key in _TVJIRA_ENV_KEYS:
        token = _normalize_token(os.getenv(key))
        if token:
            return token
    # Harmony-only .env 마이그레이션 (PAT 동일·변수명만 분리 전)
    token = _read_token_from_dotenv_keys("JIRA_API_TOKEN")
    if token:
        return token
    token = _normalize_token(settings.jira_api_token)
    if token:
        return token
    for key in ("JIRA_API_TOKEN", "JIRA_TOKEN", "JIRA_PAT"):
        token = _normalize_token(os.getenv(key))
        if token:
            return token
    raise ValueError("TVJIRA_API_TOKEN이 비어 있습니다.")


def tvjira_issue_browse_url(issue_key: str) -> str:
    base = settings.tvjira_base_url.rstrip("/")
    return f"{base}/browse/{issue_key}"


class TvJiraClient:
    """TV Jira REST API v2 — search 위주."""

    def __init__(self) -> None:
        self.base_url = settings.tvjira_base_url.rstrip("/")

    async def search(
        self,
        jql: str,
        fields: list[str] | None = None,
        max_results: int = 1000,
        start_at: int = 0,
    ) -> dict:
        params: dict[str, Any] = {
            "jql": jql,
            "fields": ",".join(fields or ["summary", "status"]),
            "maxResults": max_results,
            "startAt": start_at,
        }
        url = f"{self.base_url}/rest/api/2/search"
        token = resolve_tvjira_token()
        async with _make_authed_client(token, settings.tvjira_verify_ssl) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()


async def tvjira_search_all(jql: str, fields: list[str]) -> list[dict]:
    issues: list[dict] = []
    start_at = 0
    page_size = 100
    client = TvJiraClient()
    while True:
        data = await client.search(
            jql,
            fields=fields,
            max_results=page_size,
            start_at=start_at,
        )
        batch = data.get("issues", [])
        issues.extend(batch)
        total = data.get("total", len(issues))
        if not batch or start_at + len(batch) >= total:
            break
        start_at += len(batch)
    return issues


tv_jira_client = TvJiraClient()
