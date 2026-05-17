"""단순 메모리 TTL 캐시 — Redis 없이 5분 캐싱 지원."""
import time
import asyncio
from typing import Any
from functools import wraps

_store: dict[str, tuple[Any, float]] = {}
_lock = asyncio.Lock()


def cached(ttl: int = 300):
    """
    async 함수에 TTL 캐시 데코레이터 적용.
    캐시 키 = 함수명 + 인자 조합.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{func.__module__}.{func.__name__}|{args}|{sorted(kwargs.items())}"
            now = time.monotonic()

            async with _lock:
                if key in _store:
                    value, expires_at = _store[key]
                    if now < expires_at:
                        return value

            result = await func(*args, **kwargs)

            async with _lock:
                _store[key] = (result, now + ttl)

            return result
        return wrapper
    return decorator


async def clear_cache():
    """캐시 전체 초기화 (새로고침 버튼 등에서 호출)."""
    async with _lock:
        _store.clear()
