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
    # Harmony Jira — MLCSIXZERO 보드·스프린트 등 (기존 JIRA_* env)
    jira_base_url: str = "https://harmony.lge.com:8443/issue"
    jira_api_token: str = ""
    jira_verify_ssl: bool = False  # 내부 서버 자체 서명 인증서 대응

    # TV Jira — TVPLAT Initiative 등 (TVJIRA_* env, Harmony와 토큰·URL 분리)
    tvjira_base_url: str = "http://jira.lge.com/issue"
    tvjira_api_token: str = ""
    tvjira_verify_ssl: bool = False

    # Delivery Portal — 릴리즈 마일스톤 Gantt (Davis MilestonePage)
    delivery_portal_base_url: str = "https://delivery-portal-backend.apps.axstudio.lge.com"
    delivery_portal_api_token: str = ""
    delivery_portal_verify_ssl: bool = True

    # Board
    board_id: int = 12641

    # 커스텀 필드 ID (LGE Jira Server)
    story_points_field: str = "customfield_10808"
    epic_name_field: str = "customfield_10804"
    epic_link_field: str = "customfield_10801"
    sprint_field: str = "customfield_10800"
    release_sprint_field: str = "customfield_18834"
    chip_name_field: str = "customfield_14922"

    # TVPLAT Initiative (Davis InitiativePage INITIATIVE_FIELDS 기준)
    initiative_start_date_field: str = "customfield_35441"
    initiative_grouping_field: str = "customfield_35455"
    initiative_categorization_field: str = "customfield_35516"
    initiative_estimated_effort_field: str = "customfield_35454"

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
    cors_origins: str = (
        "http://localhost:3000,http://localhost:5173,"
        "https://react-audio.apps.axstudio.lge.com,https://react-audio.apps.hedej.lge.com,"
        "https://workspace.hedej.lge.com,https://workspace.axstudio.lge.com"
    )

    # 모델 현황 Snapshot 메일 공유 — audiences 별 수신 (쉼표 구분)
    model_schedule_share_dqa_recipients: str = (
        "rokyung.kim@lge.com,seunghwa.kim@lge.com,haengmo.jin@lge.com"
    )
    model_schedule_share_dev_recipients: str = (
        "seokmin.koh@lge.com,hyunja.kim@lge.com,sungyeon.cho@lge.com,hongsoon.lee@lge.com,"
        "yoonkyu.park@lge.com,jejun.oh@lge.com,sh12.park@lge.com,taeksu.la@lge.com,"
        "yongseung.cho@lge.com,maeul.lee@lge.com,pilkyu.yoon@lge.com,jaecheol.lee@lge.com"
    )
    # legacy fallback
    model_schedule_share_recipients: str = "seokmin.koh@lge.com"

    # Daily report
    report_enabled: bool = True
    report_recipients: str = "seokmin.koh@lge.com"
    report_subject_prefix: str = "[Jira Dashboard]"
    report_dashboard_url: str = ""
    report_api_key: str = ""

    # SMTP — LGE 내부 relay 기본 (lgesmtp.lge.com:25, STARTTLS, 무인증)
    smtp_host: str = "lgesmtp.lge.com"
    smtp_port: int = 25
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "DL-webOS_PMO-AudioSWPO@lge.com"
    smtp_use_tls: bool = True
    smtp_verify_ssl: bool = False  # 사내 relay — 인증서 검증 생략

    # Polarion ALM — H7/M7/W7 MR 품질 이슈 연동
    polarion_base_url: str = "https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1"
    polarion_project_key: str = "AVSWRelProjMgmt"
    polarion_pat: str = ""
    polarion_verify_ssl: bool = False
    # projects/{key}/ 뒤 목록 경로 — Polarion 링크가 .../testDefect?query= 이면 testDefect
    polarion_list_path: str = "workitems"

    # LLM — 주간 스프린트 요약 (사내 dej_sdk 사용: from dej_sdk import llm)
    #  ※ URL/API-key 불필요. SDK가 내부에서 dej 플랫폼 연결을 처리.
    llm_enabled: bool = False
    llm_model: str = "dej/gpt-5-nano"   # llm.initialize(model_name=...)
    # 백그라운드 호출(로그인 request 없음)용 user_id. 비우면 LLM 비활성 → 규칙기반 폴백.
    llm_user_id: str = ""

    model_config = SettingsConfigDict(
        env_file=_env_file_paths(),
        env_file_encoding="utf-8",
        # OpenShift에 JIRA_API_TOKEN="" 로 잡혀 있으면 .env 값을 쓰도록
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()


def effective_smtp_host() -> str:
    """`.env`에 SMTP_HOST= 빈 값이 있어도 LGE relay 기본 사용."""
    host = (settings.smtp_host or "").strip()
    return host or "lgesmtp.lge.com"


def smtp_is_configured() -> bool:
    return bool(effective_smtp_host())


# prod .env CORS_ORIGINS 에 axstudio 가 빠져도 FE(react-audio.apps.axstudio) 허용
_REQUIRED_CORS_ORIGINS = (
    "https://react-audio.apps.axstudio.lge.com",
    "https://react-audio.apps.hedej.lge.com",
    "https://workspace.hedej.lge.com",
    "https://workspace.axstudio.lge.com",
)


def effective_cors_origins() -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for origin in [o.strip() for o in settings.cors_origins.split(",") if o.strip()]:
        if origin not in seen:
            seen.add(origin)
            ordered.append(origin)
    for origin in _REQUIRED_CORS_ORIGINS:
        if origin not in seen:
            seen.add(origin)
            ordered.append(origin)
    return ordered
