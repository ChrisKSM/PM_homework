"""모델 일정 Snapshot — SW 담당(개발) 이름 → 수신자 메일."""
from __future__ import annotations

import re

SW_PM_NAME_TO_EMAIL: dict[str, str] = {
    "고석민": "seokmin.koh@lge.com",
    "김현자": "hyunja.kim@lge.com",
    "조성연": "sungyeon.cho@lge.com",
    "이홍순": "hongsoon.lee@lge.com",
    "박윤규": "yoonkyu.park@lge.com",
    "오제준": "jejun.oh@lge.com",
    "박시형": "sh12.park@lge.com",
    "나택수": "taeksu.la@lge.com",
    "조용승": "yongseung.cho@lge.com",
    "이마을": "maeul.lee@lge.com",
    "윤필규": "pilkyu.yoon@lge.com",
    "이재철": "jaecheol.lee@lge.com",
}


def _split_staff_names(raw: str) -> list[str]:
    return [p.strip() for p in re.split(r"[/,·|\s]+", raw or "") if p.strip()]


def dev_emails_from_models(models: list[dict] | None) -> list[str]:
    """overview models[].swPm → 개발 수신자 (중복 제거, 입력 순서 유지)."""
    seen: set[str] = set()
    ordered: list[str] = []
    for m in models or []:
        for name in _split_staff_names(str(m.get("swPm") or "")):
            email = SW_PM_NAME_TO_EMAIL.get(name)
            if email and email not in seen:
                seen.add(email)
                ordered.append(email)
    return ordered
