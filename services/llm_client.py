"""
사내 LLM 호출 클라이언트 — dej 플랫폼 SDK(dej_sdk) 사용.

dej_sdk 미설치·미설정·호출 실패 시 sprint_report_service 가 규칙기반으로 폴백.
diagnostics() / GET /api/llm/diagnostics 로 원인 확인.
"""
from __future__ import annotations

import asyncio
import os
import traceback
from typing import Any

from config import settings

_DEJ_IMPORT_ERROR: str | None = None
_dej_llm = None

try:
    from dej_sdk import llm as _dej_llm  # type: ignore
except Exception as exc:  # pragma: no cover
    _DEJ_IMPORT_ERROR = f"{type(exc).__name__}: {exc}"


class LLMNotConfigured(RuntimeError):
    """LLM 비활성 / dej_sdk 미설치 / user_id 미설정."""


def _setting(name: str, default: Any = "") -> Any:
    """config 필드 또는 환경변수 — pod config.py 구버전에서도 안전."""
    val = getattr(settings, name, None)
    if val is not None and val != "":
        return val
    env_key = name.upper()
    env_val = os.getenv(env_key, "")
    if env_val.strip():
        return env_val.strip()
    return default


def _llm_enabled() -> bool:
    raw = _setting("llm_enabled", False)
    if isinstance(raw, bool):
        return raw
    return str(raw).lower() in ("1", "true", "yes", "on")


def _user_id() -> str:
    return str(_setting("llm_user_id", "") or "").strip()


def _llm_model() -> str:
    return str(_setting("llm_model", "dej/gpt-5-nano") or "dej/gpt-5-nano")


def is_enabled() -> bool:
    return bool(_llm_enabled() and _dej_llm is not None and _user_id())


def diagnostics() -> dict[str, Any]:
    """LLM 연결 상태 진단 — BE pod에서 curl /api/llm/diagnostics 로 확인."""
    checks: list[dict[str, Any]] = []

    has_field = hasattr(settings, "llm_enabled")
    checks.append({
        "id": "config_fields",
        "ok": has_field,
        "detail": "config.py에 llm_enabled 필드 있음" if has_field else "config.py에 LLM 필드 없음 (env만 사용 중)",
    })

    enabled = _llm_enabled()
    checks.append({
        "id": "llm_enabled",
        "ok": enabled,
        "detail": f"LLM_ENABLED={enabled}",
    })

    uid = _user_id()
    checks.append({
        "id": "llm_user_id",
        "ok": bool(uid),
        "detail": f"LLM_USER_ID={uid or '(empty)'}",
    })

    sdk_ok = _dej_llm is not None
    checks.append({
        "id": "dej_sdk",
        "ok": sdk_ok,
        "detail": "dej_sdk import OK" if sdk_ok else (_DEJ_IMPORT_ERROR or "import failed"),
    })

    model = _llm_model()
    checks.append({
        "id": "llm_model",
        "ok": bool(model),
        "detail": f"LLM_MODEL={model}",
    })

    return {
        "enabled": is_enabled(),
        "checks": checks,
        "hint": (
            "enabled=false → ✗ 항목 수정 후 uvicorn 재시작. "
            "dej_sdk ✗ → dej workspace Python에 dej_sdk 필요. "
            "config_fields ✗ → sh scripts/add-sprint-report-be-only.sh"
        ),
    }


def _ask_sync(system: str, user: str) -> str:
    """dej_sdk 동기 호출. stream=False 우선, 실패 시 stream=True 로 재시도."""
    uid = _user_id()
    model = _llm_model()
    _dej_llm.initialize(system_prompt=system, model_name=model)

    for stream in (False, True):
        try:
            result = _dej_llm.ask([], user, uid, None, stream)
            if isinstance(result, str):
                text = result.strip()
                if text:
                    return text
            try:
                text = "".join(str(chunk) for chunk in result).strip()
                if text:
                    return text
            except TypeError:
                text = str(result).strip()
                if text:
                    return text
        except Exception:
            if stream:
                raise
            continue

    raise RuntimeError("llm.ask returned empty response (stream=False/True both tried)")


async def chat(
    system: str,
    user: str,
    *,
    temperature: float | None = None,
    max_tokens: int = 900,
) -> str:
    if not is_enabled():
        diag = diagnostics()
        failed = [c for c in diag["checks"] if not c["ok"]]
        reasons = ", ".join(f"{c['id']}: {c['detail']}" for c in failed) or "unknown"
        raise LLMNotConfigured(f"LLM not ready — {reasons}")
    try:
        return await asyncio.to_thread(_ask_sync, system, user)
    except Exception as exc:
        raise RuntimeError(f"llm.ask failed: {type(exc).__name__}: {exc}") from exc


def format_trace(exc: BaseException) -> str:
    return "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-800:]
