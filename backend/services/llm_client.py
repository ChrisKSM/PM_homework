"""
사내 LLM 호출 클라이언트 — dej 플랫폼 SDK(dej_sdk) 사용.

  from dej_sdk import llm
  llm.initialize(system_prompt=..., model_name=...)
  llm.ask(history, q, user_id, None, stream)

URL/API-key 없이 SDK가 내부에서 dej 연결을 처리한다.
백그라운드(로그인 request 없음) 호출이므로 user_id는 settings.llm_user_id로 지정한다.

dej_sdk 미설치(로컬 개발 등)·미설정 시 is_enabled()=False → 호출부에서 규칙기반 폴백.
"""
from __future__ import annotations

import asyncio

from config import settings

try:  # 배포 환경(dej)에만 존재
    from dej_sdk import llm as _dej_llm  # type: ignore
except Exception:  # pragma: no cover - 로컬엔 미설치
    _dej_llm = None


class LLMNotConfigured(RuntimeError):
    """LLM 비활성 / dej_sdk 미설치 / user_id 미설정."""


def is_enabled() -> bool:
    return bool(settings.llm_enabled and _dej_llm is not None and settings.llm_user_id)


def _ask_sync(system: str, user: str) -> str:
    """dej_sdk 동기 호출. stream=False로 전체 응답을 받아 문자열로 합친다."""
    _dej_llm.initialize(system_prompt=system, model_name=settings.llm_model)
    # signature: ask(history, q, user_id, ?, stream)
    result = _dej_llm.ask([], user, settings.llm_user_id, None, False)
    if isinstance(result, str):
        return result.strip()
    # stream=False여도 제너레이터/이터러블을 반환하는 경우 대비
    try:
        return "".join(str(chunk) for chunk in result).strip()
    except TypeError:
        return str(result).strip()


async def chat(
    system: str,
    user: str,
    *,
    temperature: float | None = None,  # dej_sdk 미지원 — 시그니처 호환용
    max_tokens: int = 900,             # dej_sdk 미지원 — 시그니처 호환용
) -> str:
    """system/user 메시지로 LLM 호출 후 본문 텍스트 반환 (동기 SDK를 스레드로 오프로드)."""
    if not is_enabled():
        raise LLMNotConfigured("LLM 비활성/dej_sdk 미설치/llm_user_id 미설정")
    return await asyncio.to_thread(_ask_sync, system, user)
