"""
TV Jira (TVPLAT 등) REST API 클라이언트.

Harmony 보드(JIRA_*)와 URL·PAT를 분리 — TVJIRA_BASE_URL / TVJIRA_API_TOKEN 사용.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from config import settings
from jira_client import _DOTENV_PATHS, _normalize_token, _read_token_from_dotenv_keys

try:
    from jira_client import _make_authed_client
except ImportError:
    # 구 BE pod — jira_client.py 에 helper 없을 때 (release/initiative TV Jira 호출용)
    def _make_authed_client(token: str, verify_ssl: bool) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            verify=verify_ssl,
            timeout=30.0,
        )

_TVJIRA_DOTENV_KEYS = ("TVJIRA_API_TOKEN",)
_TVJIRA_ENV_KEYS = ("TVJIRA_API_TOKEN", "TVJIRA_TOKEN", "TVJIRA_PAT")
_JIRA_FALLBACK_ENV = ("JIRA_API_TOKEN", "JIRA_TOKEN", "JIRA_PAT")


def _resolve_tvjira_token_pair() -> tuple[str, str]:
    """
    PAT + 출처 라벨. Pod .env 가 process env/settings 보다 우선 (수동 .env 수정·다중 replica).
    TVJIRA 없으면 Harmony JIRA_API_TOKEN fallback.
    """
    token = _read_token_from_dotenv_keys(*_TVJIRA_DOTENV_KEYS)
    if token:
        for path in _DOTENV_PATHS:
            if path.is_file():
                return token, f"dotenv:{path}:TVJIRA_API_TOKEN"
        return token, "dotenv:TVJIRA_API_TOKEN"

    for key in _TVJIRA_ENV_KEYS:
        token = _normalize_token(os.getenv(key))
        if token:
            return token, f"env:{key}"

    token = _normalize_token(settings.tvjira_api_token)
    if token:
        return token, "settings.tvjira_api_token"

    token = _read_token_from_dotenv_keys("JIRA_API_TOKEN")
    if token:
        return token, "dotenv:JIRA_API_TOKEN(fallback)"

    for key in _JIRA_FALLBACK_ENV:
        token = _normalize_token(os.getenv(key))
        if token:
            return token, f"env:{key}(fallback)"

    token = _normalize_token(settings.jira_api_token)
    if token:
        return token, "settings.jira_api_token(fallback)"

    return "", "none"


def tvjira_token_source_info() -> tuple[str, int]:
    """토큰 출처·길이만 반환 (값 노출 금지)."""
    _token, source = _resolve_tvjira_token_pair()
    return source, len(_token)


def resolve_tvjira_token() -> str:
    token, _source = _resolve_tvjira_token_pair()
    if token:
        return token
    raise ValueError(
        "TVJIRA_API_TOKEN이 비어 있습니다. "
        "/usr/app/src/.env 또는 /workspace/project/.env 에 "
        "TVJIRA_API_TOKEN=<PAT> 설정 (Harmony JIRA_API_TOKEN 과 별도). "
        "BE replica 여러 개면 Deployment Variables·모든 pod .env 동기화 필요."
    )


def tvjira_issue_browse_url(issue_key: str) -> str:
    base = settings.tvjira_base_url.rstrip("/")
    return f"{base}/browse/{issue_key}"


class TvJiraClient:
    """TV Jira REST API v2 — search 위주."""

    def __init__(self) -> None:
        self.base_url = settings.tvjira_base_url.rstrip("/")

    async def get_issue(self, issue_key: str, fields: list[str] | None = None) -> dict:
        key = issue_key.strip()
        url = f"{self.base_url}/rest/api/2/issue/{key}"
        params: dict[str, Any] = {}
        if fields:
            params["fields"] = ",".join(fields)
        token = resolve_tvjira_token()
        async with _make_authed_client(token, settings.tvjira_verify_ssl) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()

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


async def tvjira_get_issue(issue_key: str, fields: list[str]) -> dict:
    return await TvJiraClient().get_issue(issue_key, fields)


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
