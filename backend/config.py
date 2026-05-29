from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


def _env_file_paths() -> tuple[str, ...]:
    """prod(/usr/app/src) · workspace dev(/workspace/project) · cwd .env"""
    candidates = (
        Path("/usr/app/src/.env"),
        Path("/workspace/project/.env"),
        Path(".env"),
    )
    found = tuple(str(p) for p in candidates if p.is_file())
    return found or (".env",)


class Settings(BaseSettings):
    # Jira Server 연결 — token은 .env / JIRA_API_TOKEN env (소스에 하드코딩 금지)
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

    # 조달 Request DoD (Story DoD customfield_18874 와 별도)
    procurement_dod_field: str = "customfield_10504"

    # 계획 추적성 — Story DoD
    acceptance_criteria_field: str = "customfield_19604"
    dod_field: str = "customfield_18874"
    priority_rationale_field: str = "customfield_13449"

    # 품질 이슈 — 대응 계획/방안 (미설정 시 null 반환)
    response_plan_field: str = "customfield_10901"
    response_action_field: str = ""
    quality_project_key: str = ""

    # 리스크 — EMV 정량 (Jira 표준 Environment 필드 텍스트 파싱)
    risk_environment_field: str = "environment"
    risk_schedule_reserve_days: int = 45
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
        # OpenShift에 JIRA_API_TOKEN="" 로 잡혀 있으면 .env 값을 쓰도록
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()
