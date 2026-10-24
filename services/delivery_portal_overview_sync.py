"""
Delivery Portal all_deliveries_data → Mongo model_schedule_overview events 동기화.

매칭: overview_id ↔ program_info.id (Audio detail schedules).
"""
from __future__ import annotations

import re
from typing import Any

from services.delivery_portal_catalog import (
    AUDIO_PRODUCT_CATEGORIES,
    iter_portal_program_rows,
    overview_category_from_portal,
    slug_overview_id,
)

# PO 확정 매칭 (webOS26 Audio — program UUID)
OVERVIEW_PROGRAM_LINKS: list[dict[str, str]] = [
    {
        "overview_id": "ov-h7-vi",
        "program_id": "e8463fbd-8c96-4344-8343-f6e696876cc5",
        "label": "Initial H7_VI(ax26sb)",
    },
    {
        "overview_id": "ov-m7-vi",
        "program_id": "44e5829c-baf6-49d1-b06f-6a37a75ed4ed",
        "label": "Initial M7_VI (AMLogic)",
    },
    {
        "overview_id": "ov-s90c",
        "program_id": "b39d2ab0-e63c-44ad-8945-54f7ec1561b7",
        "label": "Initial S90C (AMLogic)",
    },
    {
        "overview_id": "ov-h7-mr10-11",
        "program_id": "eedfcd5c-a434-40d3-b9db-75ea8532bda5",
        "label": "H7_MR10(11월)",
    },
    {
        "overview_id": "ov-h5",
        "program_id": "61fb6f57-8fb3-4468-8607-7a9fdf5a9482",
        "label": "Initial H5(ax26sb)",
    },
]

OVERVIEW_IDS_TO_REMOVE: set[str] = {"ov-m5-vi"}

_SW_PREFIXES = ("SIT", "FC", "DEV", "QP", "PREQP", "PRE QP", "SU", "INT", "BUG", "ATS_SW")
_HW_PREFIXES = ("PV", "PREPV", "PRE PV", "MP", "HW", "ATS", "EVT", "BRINGUP")


def _norm_date(raw: Any) -> str:
    if not raw:
        return ""
    s = str(raw).strip()[:10]
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    m = re.match(r"^(\d{4})[./](\d{1,2})[./](\d{1,2})$", s)
    if m:
        y, mo, d = m.groups()
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    return s


def _event_name(test_name: str) -> str:
    t = (test_name or "").strip()
    if not t:
        return "Event"
    # SIT1 → SIT 1 style (overview mock)
    t = re.sub(r"^SIT\s*_?\s*(\d+)", r"SIT \1", t, flags=re.I)
    t = re.sub(r"^FC\s*_?\s*(\d+)", r"FC \1", t, flags=re.I)
    return t


def _infer_kind(test_name: str) -> str:
    u = (test_name or "").upper().replace("_", " ")
    for p in _HW_PREFIXES:
        if u.startswith(p.replace("_", " ")) or u.startswith(p):
            if p == "ATS" and "SW" in u:
                break
            return "hw"
    return "sw"


def _infer_bar_type(test_name: str) -> str | None:
    u = (test_name or "").upper()
    if u.startswith("SIT"):
        return "sit"
    if u.startswith("FC"):
        return "fc"
    if u.startswith("DEV"):
        return "dev_test"
    if "PREQP" in u or "PRE QP" in u:
        return "preqp"
    if u.startswith("QP"):
        return "qp"
    if u.startswith("PREPV") or u.startswith("PRE PV"):
        return "prepv"
    if u.startswith("PV"):
        return "pv"
    if u.startswith("MP"):
        return "mp"
    if u.startswith("SU"):
        return "su"
    if u.startswith("ATS"):
        return "ats"
    return None


def merge_overview_events(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Same overview_id에 Portal program이 여러 개일 때 events 합침."""
    by_key: dict[tuple, dict[str, Any]] = {}
    for ev in existing or []:
        key = (
            ev.get("kind"),
            str(ev.get("name") or "").lower().replace(" ", ""),
            ev.get("start"),
            ev.get("end"),
        )
        by_key[key] = ev
    for ev in incoming or []:
        key = (
            ev.get("kind"),
            str(ev.get("name") or "").lower().replace(" ", ""),
            ev.get("start"),
            ev.get("end"),
        )
        by_key[key] = ev
    merged = list(by_key.values())
    merged.sort(key=lambda e: (e.get("start") or "", e.get("name") or ""))
    return merged


def schedules_to_events(schedules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    seen: set[tuple] = set()
    for s in schedules or []:
        name = _event_name(str(s.get("test_name") or ""))
        start = _norm_date(s.get("plan_start_date") or s.get("actual_start_date"))
        end = _norm_date(s.get("plan_end_date") or s.get("actual_end_date") or start)
        if not start:
            continue
        if not end:
            end = start
        kind = _infer_kind(name)
        key = (kind, name.lower().replace(" ", ""), start, end)
        if key in seen:
            continue
        seen.add(key)
        ev: dict[str, Any] = {"name": name, "start": start, "end": end, "kind": kind}
        bt = _infer_bar_type(name)
        if bt:
            ev["barType"] = bt
        events.append(ev)
    events.sort(key=lambda e: (e["start"], e["name"]))
    return events


def find_audio_detail_by_program_id(
    portal: dict[str, Any],
    program_id: str,
) -> tuple[str, dict[str, Any], dict[str, Any], dict[str, Any]] | None:
    pid = program_id.strip().lower()
    for pd in portal.get("platform_data") or []:
        platform = str(pd.get("platform") or "")
        for pi in pd.get("program_info") or []:
            if str(pi.get("id") or "").lower() != pid:
                continue
            for d in pi.get("details") or []:
                if str(d.get("department") or "") != "Audio":
                    continue
                if d.get("show") == "N":
                    continue
                return platform, pi, d, pd
    return None


def apply_delivery_portal_to_models(
    models: list[dict[str, Any]],
    portal: dict[str, Any],
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Mongo overview models in-place update; returns summary."""
    by_id = {m.get("id"): m for m in models if m.get("id")}
    removed: list[str] = []
    updated: list[dict[str, Any]] = []
    missing_overview: list[str] = []
    missing_portal: list[str] = []

    for rid in OVERVIEW_IDS_TO_REMOVE:
        if rid in by_id:
            removed.append(rid)
            if not dry_run:
                models[:] = [m for m in models if m.get("id") != rid]
                by_id.pop(rid, None)

    for link in OVERVIEW_PROGRAM_LINKS:
        oid = link["overview_id"]
        prog_id = link["program_id"]
        model = by_id.get(oid)
        if not model:
            missing_overview.append(oid)
            continue
        found = find_audio_detail_by_program_id(portal, prog_id)
        if not found:
            missing_portal.append(f"{oid}:{prog_id}")
            continue
        platform, pi, detail, _pd = found
        events = schedules_to_events(detail.get("schedules") or [])
        prev_n = len(model.get("events") or [])
        summary = {
            "overview_id": oid,
            "program_id": prog_id,
            "label": link.get("label"),
            "platform": platform,
            "program": pi.get("program"),
            "program_detail": pi.get("program_detail"),
            "portal_soc": detail.get("soc"),
            "events_before": prev_n,
            "events_after": len(events),
        }
        updated.append(summary)
        if not dry_run:
            model["events"] = events
            # soc: Portal "Others" 는 Mongo 기존 soc 유지
            psoc = str(detail.get("soc") or "").strip()
            if psoc and psoc.lower() not in ("others", "common"):
                model["soc"] = psoc

    return {
        "dry_run": dry_run,
        "scope": "linked",
        "removed_ids": removed,
        "updated": updated,
        "missing_overview_ids": missing_overview,
        "missing_portal_programs": missing_portal,
        "model_count": len(models),
    }


def _norm_model_key(name: str) -> str:
    return re.sub(r"\s+", "", (name or "")).upper().replace("-", "_")


def _program_id_to_overview_id() -> dict[str, str]:
    return {link["program_id"].lower(): link["overview_id"] for link in OVERVIEW_PROGRAM_LINKS}


def _blank_overview_model(
    oid: str,
    *,
    category: str,
    model_name: str,
    soc: str,
    sw_pm: str,
    events: list[dict[str, Any]],
) -> dict[str, Any]:
    psoc = soc.strip()
    if psoc.lower() in ("others", "common"):
        psoc = ""
    return {
        "id": oid,
        "category": category,
        "model": model_name,
        "variant": "",
        "manufacturer": "",
        "soc": psoc,
        "hwPm": "",
        "swPo": "",
        "swPm": sw_pm,
        "spec": "",
        "pv": "",
        "mp": "",
        "ats": "",
        "events": events,
    }


def apply_delivery_portal_audio_products(
    models: list[dict[str, Any]],
    portal: dict[str, Any],
    *,
    dry_run: bool = False,
    product_categories: tuple[str, ...] = AUDIO_PRODUCT_CATEGORIES,
) -> dict[str, Any]:
    """
    Product category (Audio_Soundbar 등) 전체 program → overview upsert.
    PO linked ids 우선; 없으면 model명으로 기존 row 매칭; 없으면 신규 추가.
    """
    by_id = {m.get("id"): m for m in models if m.get("id")}
    by_model_key: dict[str, str] = {}
    for m in models:
        mid = m.get("id")
        mk = _norm_model_key(str(m.get("model") or ""))
        if mid and mk and mk not in by_model_key:
            by_model_key[mk] = str(mid)

    pid_to_oid = _program_id_to_overview_id()
    removed: list[str] = []
    updated: list[dict[str, Any]] = []
    created: list[dict[str, Any]] = []
    skipped: list[str] = []

    for rid in OVERVIEW_IDS_TO_REMOVE:
        if rid in by_id:
            removed.append(rid)
            if not dry_run:
                models[:] = [m for m in models if m.get("id") != rid]
                by_id.pop(rid, None)

    cat_set = set(product_categories)
    for row in iter_portal_program_rows(
        portal,
        product_categories=cat_set,
        department="Audio",
        require_schedules=True,
    ):
        prog_id = str(row["program_id"] or "").lower()
        if not prog_id:
            skipped.append("missing_program_id")
            continue

        events = schedules_to_events(row.get("schedules") or [])
        if not events:
            skipped.append(prog_id)
            continue

        mongo_model = str(row.get("model") or "")
        oid = pid_to_oid.get(prog_id) or str(row.get("overview_id") or "")
        if not oid:
            mk = _norm_model_key(mongo_model)
            oid = by_model_key.get(mk) or slug_overview_id(
                mongo_model,
                str(row.get("program_detail") or ""),
            )

        model = by_id.get(oid)
        is_new = model is None
        if model and model.get("events"):
            events = merge_overview_events(model.get("events") or [], events)

        category = overview_category_from_portal(
            str(row.get("product_category") or ""),
            str(row.get("product") or ""),
            mongo_model,
        )
        summary = {
            "overview_id": oid,
            "program_id": row["program_id"],
            "platform": row["platform"],
            "product_category": row.get("product_category"),
            "product": row.get("product"),
            "portal_model": row.get("portal_model"),
            "model": mongo_model,
            "program_detail": row.get("program_detail"),
            "events_after": len(events),
            "created": is_new,
        }

        if is_new:
            created.append(summary)
            if not dry_run:
                model = _blank_overview_model(
                    oid,
                    category=category,
                    model_name=mongo_model,
                    soc=str(row.get("soc") or ""),
                    sw_pm=str(row.get("pl") or ""),
                    events=events,
                )
                models.append(model)
                by_id[oid] = model
                mk = _norm_model_key(mongo_model)
                if mk:
                    by_model_key.setdefault(mk, oid)
        else:
            updated.append(summary)
            if not dry_run:
                model["events"] = events
                model["model"] = mongo_model
                if category and not model.get("category"):
                    model["category"] = category
                psoc = str(row.get("soc") or "").strip()
                if psoc and psoc.lower() not in ("others", "common"):
                    model["soc"] = psoc
                pl = str(row.get("pl") or "").strip()
                if pl:
                    model["swPm"] = pl

    return {
        "dry_run": dry_run,
        "scope": "audio_products",
        "product_categories": list(product_categories),
        "removed_ids": removed,
        "updated": updated,
        "created": created,
        "skipped_no_events": skipped[:20],
        "portal_program_count": len(updated) + len(created),
        "model_count": len(models),
    }
