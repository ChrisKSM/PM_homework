"""
Delivery Portal all_deliveries_data — product category / program row helpers.

Pod export 전용: backend 없이 scripts/ 만으로 import 가능.
"""
from __future__ import annotations

import re
from collections import Counter
from typing import Any, Iterator

AUDIO_PRODUCT_CATEGORIES: tuple[str, ...] = (
    "Audio_Earbud",
    "Audio_Others",
    "Audio_Soundbar",
    "Audio_Speaker",
)

_PRODUCT_CAT_KEYS = (
    "product_category",
    "productCategory",
    "Product Category",
    "product_cat",
)
_PRODUCT_SUB_KEYS = ("product", "product_type", "productType", "Product")
_MODEL_KEYS = ("model", "model_name", "modelName", "Model")

_SOUND_SUITE_MODELS = frozenset({"H7_VI", "H5", "M7_VI", "W5"})


def _norm_key(s: str) -> str:
    return re.sub(r"\s+", "", (s or "").upper())


def _get_first(obj: dict[str, Any] | None, keys: tuple[str, ...]) -> str:
    if not obj:
        return ""
    for k in keys:
        v = obj.get(k)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


def extract_product_category(program_info: dict[str, Any], detail: dict[str, Any]) -> str:
    """Portal UI Product category (Audio_Soundbar, …)."""
    for obj in (detail, program_info):
        v = _get_first(obj, _PRODUCT_CAT_KEYS)
        if v:
            return v
    prog = str(program_info.get("program") or "").strip()
    if prog in AUDIO_PRODUCT_CATEGORIES:
        return prog
    return ""


def extract_product_sub(program_info: dict[str, Any], detail: dict[str, Any]) -> str:
    return _get_first(detail, _PRODUCT_SUB_KEYS) or _get_first(program_info, _PRODUCT_SUB_KEYS)


def infer_model_from_program_detail(program_detail: str) -> str:
    d = (program_detail or "").strip()
    if not d:
        return ""
    m = re.match(r"Initial\s+(.+?)(?:\s*\(|$)", d, re.I)
    if m:
        return m.group(1).strip()
    return d.split("(")[0].strip()


def infer_model_name(program_info: dict[str, Any], detail: dict[str, Any]) -> str:
    direct = _get_first(detail, _MODEL_KEYS) or _get_first(program_info, _MODEL_KEYS)
    if direct:
        return direct.strip()
    pd = str(program_info.get("program_detail") or "")
    from_pd = infer_model_from_program_detail(pd)
    if from_pd:
        return from_pd
    soc = str(detail.get("soc") or "").strip()
    if soc and soc.lower() not in ("others", "common", "hq"):
        return soc
    return pd or str(program_info.get("program") or "")


def overview_category_from_portal(product_category: str, product_sub: str, model_name: str) -> str:
    model_key = _norm_key(model_name.replace("-", "_"))
    if model_key in {_norm_key(x) for x in _SOUND_SUITE_MODELS}:
        return "Sound Suite"
    ps = (product_sub or "").lower()
    if product_category == "Audio_Soundbar":
        if "bt" in ps:
            return "사운드바(BT)"
        if "wifi" in ps or "wi-fi" in ps or "wi_fi" in ps:
            return "사운드바(Wi-Fi)"
        return "사운드바"
    if product_category == "Audio_Speaker":
        if "party" in ps:
            return "파티스피커"
        return "무선스피커"
    if product_category == "Audio_Earbud":
        return "Accessory"
    if product_category == "Audio_Others":
        return "Accessory"
    return product_category or ""


def slug_overview_id(model_name: str, program_detail: str = "") -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (model_name or "model").lower()).strip("-")
    if not base:
        base = "model"
    extra = re.sub(r"[^a-z0-9]+", "-", (program_detail or "").lower()).strip("-")
    if extra and extra != base:
        if "mr10" in extra or "mr-10" in extra:
            return f"ov-{base}-mr10-11" if "h7" in base else f"ov-{extra[:40]}"
    return f"ov-{base}"


def should_skip_portal_program(program: str, program_detail: str) -> bool:
    """PO rules: no M5 Initial overview; H7 MR rows except MR10."""
    blob = f"{program} {program_detail}".upper().replace("_", " ")
    if re.search(r"\bM5\b", blob) and "INITIAL" in blob:
        return True
    if "M5 VI" in blob or "M5_VI" in f"{program} {program_detail}".upper():
        if "INITIAL" in blob:
            return True
    if re.search(r"H7\s*_?\s*MR", blob.replace(" ", "")) or re.search(r"H7_MR", blob):
        if "MR10" not in blob:
            return True
    return False


def iter_portal_program_rows(
    portal: dict[str, Any],
    *,
    product_categories: set[str] | None = None,
    department: str | None = "Audio",
    require_schedules: bool = False,
) -> Iterator[dict[str, Any]]:
    """One yield per program_info (Gantt program), using first matching Audio detail."""
    cats = product_categories
    dept = department.strip() if department else None

    for pd in portal.get("platform_data") or []:
        platform = str(pd.get("platform") or "")
        for pi in pd.get("program_info") or []:
            program = str(pi.get("program") or "")
            program_detail = str(pi.get("program_detail") or "")
            program_id = str(pi.get("id") or "")
            if should_skip_portal_program(program, program_detail):
                continue

            chosen: dict[str, Any] | None = None
            product_category = ""
            product_sub = ""

            for d in pi.get("details") or []:
                if dept and str(d.get("department") or "") != dept:
                    continue
                if d.get("show") == "N":
                    continue
                pc = extract_product_category(pi, d)
                if cats and pc not in cats:
                    continue
                if require_schedules and not (d.get("schedules") or []):
                    continue
                chosen = d
                product_category = pc
                product_sub = extract_product_sub(pi, d)
                break

            if not chosen:
                continue
            if cats and not product_category:
                pc = extract_product_category(pi, {})
                if pc not in cats:
                    continue
                product_category = pc
                product_sub = extract_product_sub(pi, {})

            model_name = infer_model_name(pi, chosen)
            yield {
                "platform": platform,
                "program": program,
                "program_detail": program_detail,
                "program_id": program_id,
                "product_category": product_category,
                "product": product_sub,
                "model": model_name,
                "soc": str(chosen.get("soc") or ""),
                "site": str(chosen.get("site") or ""),
                "pl": str(chosen.get("pl") or ""),
                "schedules": chosen.get("schedules") or [],
                "detail": chosen,
                "program_info": pi,
            }


def scan_product_categories(portal: dict[str, Any]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for pd in portal.get("platform_data") or []:
        for pi in pd.get("program_info") or []:
            for d in pi.get("details") or []:
                if d.get("show") == "N":
                    continue
                pc = extract_product_category(pi, d)
                if pc:
                    counts[pc] += 1
            pc_pi = extract_product_category(pi, {})
            if pc_pi:
                counts[pc_pi] += 1
    return counts


def scan_detail_keys(portal: dict[str, Any], *, limit: int = 40) -> Counter[str]:
    """API 필드명 확인용 — detail / program_info 키 빈도."""
    keys: Counter[str] = Counter()
    for pd in portal.get("platform_data") or []:
        for pi in pd.get("program_info") or []:
            for k in pi.keys():
                keys[f"program_info.{k}"] += 1
            for d in pi.get("details") or []:
                for k in d.keys():
                    keys[f"details.{k}"] += 1
    return Counter(dict(keys.most_common(limit)))
