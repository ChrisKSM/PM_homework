"""
Jira Server REST API 비동기 HTTP 클라이언트.
PAT Bearer 토큰 인증 사용 (Jira Cloud Basic Auth와 다름).
REST API v2 + Agile API v1.0 지원.
"""
import os
import httpx
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config import settings

# 내부 서버 자체 서명 인증서 경고 억제
if not settings.jira_verify_ssl:
    warnings.filterwarnings("ignore", message="Unverified HTTPS request")

# prod(/usr/app/src) · workspace dev(/workspace/project) .env 경로
_DOTENV_PATHS = (
    Path("/usr/app/src/.env"),
    Path("/workspace/project/.env"),
    Path(".env"),
)


def _read_token_from_dotenv() -> str:
    """settings가 빈 token일 때 .env 파일에서 직접 읽기 (K8s 빈 env 우선 문제 회피)."""
    for path in _DOTENV_PATHS:
        if not path.is_file():
            continue
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            if key.strip() != "JIRA_API_TOKEN":
                continue
            token = val.strip().strip('"').strip("'")
            if token:
                return token
    return ""


def _normalize_token(raw: Any) -> str:
    if raw is None:
        return ""
    if isinstance(raw, bytes):
        return raw.decode("utf-8", errors="ignore").strip()
    return str(raw).strip()


def _resolve_jira_token() -> str:
    token = _normalize_token(settings.jira_api_token)
    if token:
        return token
    token = _read_token_from_dotenv()
    if token:
        return token
    for key in ("JIRA_API_TOKEN", "JIRA_TOKEN", "JIRA_PAT"):
        token = _normalize_token(os.getenv(key))
        if token:
            return token
    raise ValueError(
        "JIRA_API_TOKEN이 비어 있습니다. /usr/app/src/.env 또는 /workspace/project/.env 확인."
    )


def _bearer_token() -> str:
    return f"Bearer {_resolve_jira_token()}"


def _make_client() -> httpx.AsyncClient:
    """요청용 httpx AsyncClient 생성."""
    return httpx.AsyncClient(
        headers={
            "Authorization": _bearer_token(),
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        verify=settings.jira_verify_ssl,
        timeout=30.0,
    )


class JiraClient:
    """Jira Server REST API + Agile API 래퍼."""

    def __init__(self):
        self.base_url = settings.jira_base_url.rstrip("/")
        self.board_id = settings.board_id
        self.sp_field = settings.story_points_field
        self.epic_link_field = settings.epic_link_field
        self.epic_name_field = settings.epic_name_field

    # ── 공통 HTTP 메서드 ──────────────────────────────────────────────────────

    async def get(self, path: str, params: dict[str, Any] | None = None) -> dict:
        url = f"{self.base_url}{path}"
        async with _make_client() as client:
            resp = await client.get(url, params=params or {})
            resp.raise_for_status()
            return resp.json()

    async def post(self, path: str, payload: dict) -> dict:
        url = f"{self.base_url}{path}"
        async with _make_client() as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()

    # ── REST API v2 ───────────────────────────────────────────────────────────

    async def search(
        self,
        jql: str,
        fields: list[str] | None = None,
        expand: str | None = None,
        max_results: int = 1000,
        start_at: int = 0,
    ) -> dict:
        """JQL 검색. fields 미지정 시 핵심 필드만 조회."""
        default_fields = [
            "summary", "status", "issuetype", "assignee", "priority",
            self.sp_field, self.epic_link_field,
        ]
        params: dict[str, Any] = {
            "jql": jql,
            "fields": ",".join(fields if fields else default_fields),
            "maxResults": max_results,
            "startAt": start_at,
        }
        if expand:
            params["expand"] = expand
        return await self.get("/rest/api/2/search", params)

    async def get_issue(self, issue_key: str, fields: list[str] | None = None) -> dict:
        params: dict[str, Any] = {}
        if fields:
            params["fields"] = ",".join(fields)
        return await self.get(f"/rest/api/2/issue/{issue_key}", params)

    # ── Agile API v1.0 ────────────────────────────────────────────────────────

    async def get_board_sprints(
        self, state: str = "active", max_results: int = 10, start_at: int = 0
    ) -> dict:
        """보드의 스프린트 목록 조회."""
        return await self.get(
            f"/rest/agile/1.0/board/{self.board_id}/sprint",
            {"state": state, "maxResults": max_results, "startAt": start_at},
        )

    async def get_sprint(self, sprint_id: int) -> dict:
        """스프린트 상세 정보 조회."""
        return await self.get(f"/rest/agile/1.0/sprint/{sprint_id}")

    async def get_sprint_issues(
        self,
        sprint_id: int,
        fields: list[str] | None = None,
        expand: str | None = None,
        max_results: int = 1000,
    ) -> dict:
        """스프린트 이슈 목록 조회 (Agile API)."""
        default_fields = [
            "summary", "status", "issuetype", "assignee", "priority",
            self.sp_field, self.epic_link_field, self.epic_name_field,
        ]
        params: dict[str, Any] = {
            "fields": ",".join(fields if fields else default_fields),
            "maxResults": max_results,
        }
        if expand:
            params["expand"] = expand
        return await self.get(
            f"/rest/agile/1.0/sprint/{sprint_id}/issue", params
        )

    async def _collect_board_sprints(self, state: str) -> list[dict]:
        """보드 스프린트 전체 페이지네이션 수집."""
        all_sprints: list[dict] = []
        start = 0
        page = 50
        while True:
            data = await self.get_board_sprints(
                state=state, max_results=page, start_at=start
            )
            values = data.get("values", [])
            all_sprints.extend(values)
            if data.get("isLast", False) or len(values) < page or not values:
                break
            start += len(values)
        return all_sprints

    @staticmethod
    def _parse_sprint_dt(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    @classmethod
    def _pick_best_active_sprint(cls, actives: list[dict], today) -> dict | None:
        """
        Jira 보드에 active 스프린트가 여러 개일 때 '현재' 스프린트 선택.
        (동일 board에서 SP10·SP11·SP12가 동시 active인 경우 max(id)만 쓰면 잘못된 스프린트 선택)
        """
        if not actives:
            return None

        dated: list[tuple[dict, datetime | None, datetime | None]] = []
        for sprint in actives:
            start_dt = cls._parse_sprint_dt(sprint.get("startDate"))
            end_dt = cls._parse_sprint_dt(sprint.get("endDate"))
            dated.append((sprint, start_dt, end_dt))

        # 아직 종료되지 않은 active만 (종료일 지났는데 state=active인 스프린트 제외)
        not_ended = [
            sprint
            for sprint, _, end_dt in dated
            if end_dt is None or today <= end_dt.date()
        ]
        pool = not_ended or [sprint for sprint, _, _ in dated]

        in_progress = [
            sprint
            for sprint, start_dt, end_dt in dated
            if sprint in pool
            and start_dt
            and end_dt
            and start_dt.date() <= today <= end_dt.date()
        ]
        if in_progress:
            return sorted(
                in_progress,
                key=lambda s: (s.get("startDate") or "", s.get("id", 0)),
            )[-1]

        # 시작 전이지만 active로 켜 둔 스프린트(SP12 등) — 종료만 안 됐으면 가장 늦은 startDate
        with_start = [
            (sprint, start_dt)
            for sprint, start_dt, end_dt in dated
            if sprint in pool and start_dt
        ]
        if with_start:
            return sorted(
                with_start,
                key=lambda item: (item[1], item[0].get("id", 0)),
            )[-1][0]

        return sorted(pool, key=lambda s: s.get("id", 0))[-1]

    async def get_active_sprint(self) -> dict | None:
        """
        대시보드용 '현재' 스프린트.
        1) Jira state=active (여러 개면 날짜 기준으로 최적 1개)
        2) 없으면 오늘 날짜가 start~end 안에 드는 future/closed
        3) 없으면 가장 가까운 upcoming future
        """
        active_data = await self.get_board_sprints(state="active", max_results=50)
        actives = active_data.get("values", [])
        if actives:
            today = datetime.now(timezone.utc).date()
            picked = self._pick_best_active_sprint(actives, today)
            if picked:
                return picked

        today = datetime.now(timezone.utc).date()
        in_range: list[dict] = []
        for state in ("future", "closed"):
            for sprint in await self._collect_board_sprints(state):
                start_dt = self._parse_sprint_dt(sprint.get("startDate"))
                end_dt = self._parse_sprint_dt(sprint.get("endDate"))
                if start_dt and end_dt and start_dt.date() <= today <= end_dt.date():
                    in_range.append(sprint)

        if in_range:
            state_order = {"active": 0, "future": 1, "closed": 2}
            return sorted(
                in_range,
                key=lambda s: (state_order.get(s.get("state", ""), 9), s.get("id", 0)),
            )[-1]

        upcoming: list[tuple[datetime, dict]] = []
        for sprint in await self._collect_board_sprints("future"):
            start_dt = self._parse_sprint_dt(sprint.get("startDate"))
            if start_dt and start_dt.date() >= today:
                upcoming.append((start_dt, sprint))
        if upcoming:
            upcoming.sort(key=lambda item: item[0])
            return upcoming[0][1]

        return None

    async def get_closed_sprints(self, count: int = 7) -> list[dict]:
        """
        최근 완료된 스프린트 count개 반환 (오래된→최신 정렬).

        Agile API는 startAt=0에서 '오래된' 스프린트부터 주므로, max_results를 작게
        주면 가장 오래된 것만 잡힌다. 전체를 페이지네이션으로 모은 뒤 최신 count개를 고른다.
        """
        all_closed: list[dict] = []
        start = 0
        page = 50
        while True:
            data = await self.get_board_sprints(
                state="closed", max_results=page, start_at=start
            )
            values = data.get("values", [])
            all_closed.extend(values)
            # isLast가 없을 수 있으므로 페이지 크기 미만이면 마지막으로 간주
            if data.get("isLast", False) or len(values) < page or not values:
                break
            start += len(values)

        # 시작일(없으면 id) 기준 정렬 후 최신 count개
        all_closed.sort(key=lambda s: (s.get("startDate") or "", s.get("id", 0)))
        return all_closed[-count:] if count and count > 0 else all_closed

    async def get_all_board_sprints(self, max_results: int = 50) -> list[dict]:
        """보드의 active / closed / future 스프린트 전체."""
        sprints: list[dict] = []
        seen: set[int] = set()
        for state in ("active", "closed", "future"):
            data = await self.get_board_sprints(state=state, max_results=max_results)
            for sprint in data.get("values", []):
                sid = sprint.get("id")
                if sid is not None and sid not in seen:
                    seen.add(sid)
                    sprints.append(sprint)
        return sorted(sprints, key=lambda s: s.get("id", 0))

    async def get_board_filter_jql(self, board_id: int | None = None) -> str | None:
        """보드 filter JQL — board_id 보드 이슈만 검색할 때 사용."""
        bid = board_id if board_id is not None else self.board_id
        board = await self.get(f"/rest/agile/1.0/board/{bid}")
        filter_id = (board.get("filter") or {}).get("id")
        if not filter_id:
            return None
        filt = await self.get(f"/rest/api/2/filter/{filter_id}")
        jql = (filt.get("jql") or "").strip()
        if jql:
            return jql
        return f"filter = {filter_id}"


# 싱글톤
jira_client = JiraClient()
