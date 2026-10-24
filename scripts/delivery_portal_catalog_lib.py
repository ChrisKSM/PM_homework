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

# PO 확정 — Portal program_detail / model 표기 → Mongo overview
_OVERVIEW_ID_BY_MODEL_KEY: dict[str, str] = {
    "H7_VI": "ov-h7-vi",
    "H5": "ov-h5",
    "M7_VI": "ov-m7-vi",
    "S90C": "ov-s90c",
    "H7MR10(11월)": "ov-h7-mr10-11",
    "H7MR10(11月)": "ov-h7-mr10-11",
    "W5": "ov-w5",
    "S80C": "ov-s80c",
    "CB-SH": "ov-cb-sh",
    "CBSH": "ov-cb-sh",
    "POWER9000": "ov-power9000",
    "STAGE501": "ov-stage501",
    "STAGE301": "ov-stage301",
    "XT7S": "ov-xt7s",
    "BOUNCE": "ov-bounce",
    "BLAST": "ov-blast",
    "ROCK": "ov-rock",
    "윈도우PC앱": "ov-pc",
}


def clean_portal_text(text: str) -> str:
    s = re.sub(r"<br\s*/?>", " ", str(text or ""), flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def normalize_portal_display_model(raw: str) -> str:
    s = clean_portal_text(raw)
    if s.lower().startswith("sound suite "):
        return s[12:].strip()
    return s


def _overview_id_for_model(model_name: str) -> str | None:
    key = _norm_key(model_name.replace("-", "_"))
    if key in _OVERVIEW_ID_BY_MODEL_KEY:
        return _OVERVIEW_ID_BY_MODEL_KEY[key]
    compact = _norm_key(model_name)
    return _OVERVIEW_ID_BY_MODEL_KEY.get(compact)


def resolve_overview_identity(row: dict[str, Any]) -> dict[str, Any]:
    """
    Portal program row → Mongo { model, overview_id? }.
    PO 별칭(S80C/CB-SH/W5/윈도우PC 앱/Power9000 등) 우선.
    """
    portal_model = normalize_portal_display_model(str(row.get("portal_model") or row.get("model") or ""))
    program_detail = clean_portal_text(str(row.get("program_detail") or ""))
    blob = f"{portal_model} {program_detail}".lower()
    blob_compact = re.sub(r"\s+", "", blob)

    model = portal_model
    overview_id: str | None = None

    if "realtime" in blob and ("dolby atmos" in blob or "mlc3" in blob):
        model, overview_id = "S80C", "ov-s80c"
    elif "hdmi connect box" in blob:
        model, overview_id = "CB-SH", "ov-cb-sh"
    elif "xboom buds" in blob or "윈도우pc" in blob_compact:
        model, overview_id = "윈도우PC 앱", "ov-pc"
    elif "bouffalo" in blob or "subwoofer w5" in blob or portal_model.upper().replace(" ", "") in (
        "SOUNDSUITEW5",
        "SOUNDSUITESUBWOOFERW5",
    ):
        model, overview_id = "W5", "ov-w5"
    elif re.search(r"power\s*9000|power9000", blob):
        model, overview_id = "Power9000", "ov-power9000"
    elif re.search(r"h7\s*_?\s*mr\s*10|h7_mr10", program_detail, re.I):
        model, overview_id = "H7 MR10(11월)", "ov-h7-mr10-11"
    elif re.search(r"m7\s*/\s*m5\s*mr10|w7\s*mr7", program_detail, re.I):
        model = "M7/M5 MR10, W7 MR7 (11월)"
        overview_id = slug_overview_id(model, program_detail)
    elif re.search(r"m7/w7\s*mr9", program_detail, re.I):
        model = "M7/W7 MR9(11월)"
        overview_id = "ov-m7-w7-mr9-11"
    else:
        if portal_model.upper().startswith("S90C") or program_detail.upper().startswith("S90C"):
            model, overview_id = "S90C", "ov-s90c"
        elif "M7_VI" in portal_model.upper().replace(" ", "") or "M7_VI" in program_detail.upper():
            model, overview_id = "M7_VI", "ov-m7-vi"
        elif portal_model.upper().replace(" ", "") in ("H7_VI", "H7VI") or "H7_VI" in program_detail:
            model, overview_id = "H7_VI", "ov-h7-vi"
        elif portal_model.upper().replace(" ", "") in ("H5", "SOUNDSUITEH5") or program_detail.upper().startswith("H5"):
            model, overview_id = "H5", "ov-h5"
        elif portal_model.upper().startswith("XT7S") or program_detail.upper().startswith("XT7S"):
            model, overview_id = "XT7S", "ov-xt7s"
        elif portal_model.upper().startswith("BOUNCE") or "BOUNCE/GRAB" in program_detail.upper():
            model, overview_id = "Bounce", "ov-bounce"
        elif portal_model.upper().startswith("STAGE501") or program_detail.upper().startswith("STAGE501"):
            model, overview_id = "Stage501", "ov-stage501"
        elif portal_model.upper().startswith("STAGE301") or program_detail.upper().startswith("STAGE301"):
            model, overview_id = "Stage301", slug_overview_id("Stage301", program_detail)
        elif portal_model.upper().startswith("POWER9000"):
            model, overview_id = "Power9000", "ov-power9000"
        else:
            model = portal_model or infer_model_from_program_detail(program_detail) or program_detail
            overview_id = _overview_id_for_model(model)

    if not overview_id:
        overview_id = _overview_id_for_model(model) or slug_overview_id(model, program_detail)

    return {"model": model, "overview_id": overview_id, "portal_model": portal_model}


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
        return normalize_portal_display_model(direct)
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
        if _norm_key(model_name) == _norm_key("윈도우PC 앱"):
            return "이어버드"
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

            portal_model = infer_model_name(pi, chosen)
            base_row = {
                "platform": platform,
                "program": program,
                "program_detail": program_detail,
                "program_id": program_id,
                "product_category": product_category,
                "product": product_sub,
                "portal_model": portal_model,
                "soc": str(chosen.get("soc") or ""),
                "site": str(chosen.get("site") or ""),
                "pl": str(chosen.get("pl") or ""),
                "schedules": chosen.get("schedules") or [],
                "detail": chosen,
                "program_info": pi,
            }
            resolved = resolve_overview_identity(base_row)
            yield {
                **base_row,
                "model": resolved["model"],
                "overview_id": resolved.get("overview_id"),
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
