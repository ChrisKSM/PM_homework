from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


def _env_file_paths() -> tuple[str, ...]:
    """workspace dev pod(/workspace/project) + cwd .env 모두 시도."""
    candidates = (Path(".env"), Path("/workspace/project/.env"))
    found = tuple(str(p) for p in candidates if p.is_file())
    return found or (".env",)


class Settings(BaseSettings):
    # Jira Server 연결
    jira_base_url: str = "https://harmony.lge.com:8443/issue"
    jira_api_token: str = ""
    jira_verify_ssl: bool = False  # 내부 서버 자체 서명 인증서 대응

    # Board
    board_id: int = 12641

    # 커스텀 필드 ID (LGE Jira Server)
    story_points_field: str = "customfield_10808"
    epic_name_field: str = "customfield_10804"
    epic_link_field: str = "customfield_10801"
    sprint_field: str = "customfield_10800"
    release_sprint_field: str = "customfield_18834"
    chip_name_field: str = "customfield_14922"

    # 계획 추적성 — 커스텀 필드 (미설정 시 description 파싱 / 기본 DoD 사용)
    acceptance_criteria_field: str = "customfield_19604"
    dod_field: str = "customfield_18874"
    priority_rationale_field: str = "customfield_13449"

    # 품질 이슈 — 대응 계획/방안 (미설정 시 null 반환)
    response_plan_field: str = "customfield_10901"
    response_action_field: str = ""
    quality_project_key: str = ""

    # 리스크 JQL — 회사 Jira priority 이름 (쉼표 구분). LGE: P0,P1,P2
    risk_priorities: str = "P0,P1,P2"

    # 완료 상태 카테고리 키 (Jira 표준)
    done_status_category: str = "done"
    inprogress_status_category: str = "indeterminate"

    # CORS (쉼표 구분). prod FE 도메인 포함 필요
    cors_origins: str = "http://localhost:3000,http://localhost:5173,https://react-audio.apps.hedej.lge.com,https://workspace.hedej.lge.com"

    # Daily report
    report_enabled: bool = True
    report_recipients: str = "seokmin.koh@lge.com"
    report_subject_prefix: str = "[Jira Dashboard]"
    report_dashboard_url: str = ""
    report_api_key: str = ""

    # SMTP
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(
        env_file=_env_file_paths(),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
