#!/usr/bin/env python3
"""
Delivery Portal all_deliveries_data / program-report → 매칭용 카탈로그 출력.

사용 (BE pod, direct API 후):
  sh scripts/verify-delivery-portal-api.sh direct
  python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json /tmp/dp_program_report.json

또는 API에서 직접:
  python3 scripts/export-delivery-portal-catalog.py --fetch

출력:
  - stdout: 플랫폼 20개 요약, program/soc/department 집계
  - artifacts/delivery-portal-catalog.tsv (cwd 또는 /tmp)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))
from delivery_portal_catalog_lib import (  # noqa: E402
    AUDIO_PRODUCT_CATEGORIES,
    iter_portal_program_rows,
    scan_detail_keys,
    scan_product_categories,
)


def _load(path: Path | None) -> object | None:
    if not path or not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _fetch(url: str, token: str) -> object:
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def export_department_details(
    data: dict,
    department: str,
    *,
    platform_filter: str | None = None,
    include_schedules: bool = False,
) -> None:
    """department=Audio 등 필터 — 매칭용 상세 목록."""
    dept = department.strip()
    pd_list = data.get("platform_data") or []
    out_dir = Path(os.environ.get("DELIVERY_CATALOG_OUT", "/tmp"))
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = dept.lower().replace(" ", "_")
    tsv_path = out_dir / f"delivery-portal-{slug}.tsv"
    sched_path = out_dir / f"delivery-portal-{slug}-schedules.tsv"

    header = (
        "platform\tprogram\tprogram_detail\tprogram_id\tsoc\tsite\tregion\tstatus\tpl\tshow\t"
        "schedule_count\ttest_names_sample"
    )
    sched_header = "platform\tprogram\tprogram_detail\tsoc\ttest_name\tplan_start\tplan_end\tactual_start\tactual_end"
    rows: list[str] = []
    sched_rows: list[str] = []
    total = 0
    by_platform: Counter[str] = Counter()

    print(f"\n=== department={dept!r} details ===")
    if platform_filter:
        print(f"    platform filter: {platform_filter!r}")

    for pd in pd_list:
        platform = str(pd.get("platform") or "")
        if platform_filter and platform != platform_filter:
            continue
        platform_hits = 0
        for pi in pd.get("program_info") or []:
            program = str(pi.get("program") or "")
            program_detail = str(pi.get("program_detail") or "")
            program_id = str(pi.get("id") or "")
            for d in pi.get("details") or []:
                if str(d.get("department") or "") != dept:
                    continue
                if d.get("show") == "N":
                    continue
                schedules = d.get("schedules") or []
                test_names = [str(s.get("test_name") or "").strip() for s in schedules if s.get("test_name")]
                sample = ", ".join(test_names[:12])
                if len(test_names) > 12:
                    sample += f" (+{len(test_names) - 12})"
                row = [
                    platform,
                    program,
                    program_detail,
                    program_id,
                    str(d.get("soc") or ""),
                    str(d.get("site") or ""),
                    str(d.get("region") or ""),
                    str(d.get("status") or ""),
                    str(d.get("pl") or ""),
                    str(d.get("show") or "Y"),
                    str(len(schedules)),
                    sample,
                ]
                rows.append("\t".join(row))
                total += 1
                platform_hits += 1
                by_platform[platform] += 1
                if include_schedules:
                    for s in schedules:
                        sched_rows.append(
                            "\t".join(
                                [
                                    platform,
                                    program,
                                    program_detail.replace("\t", " "),
                                    str(d.get("soc") or ""),
                                    str(s.get("test_name") or ""),
                                    str(s.get("plan_start_date") or ""),
                                    str(s.get("plan_end_date") or ""),
                                    str(s.get("actual_start_date") or ""),
                                    str(s.get("actual_end_date") or ""),
                                ]
                            )
                        )
        if platform_hits and not platform_filter:
            print(f"  {platform}: {platform_hits} Audio detail row(s)")

    print(f"\n  Total {dept} rows (show≠N): {total}")
    print("  By platform:")
    for p, c in by_platform.most_common():
        print(f"    {c:4d}  {p}")

    tsv_path.write_text(header + "\n" + "\n".join(rows) + "\n", encoding="utf-8")
    print(f"\n=== Wrote {tsv_path} ===")

    if include_schedules and sched_rows:
        sched_path.write_text(sched_header + "\n" + "\n".join(sched_rows) + "\n", encoding="utf-8")
        print(f"=== Wrote {sched_path} ({len(sched_rows)} schedule lines) ===")

    print(f"\n--- Preview (first 25 rows, col: program_detail | soc | site | #sched) ---")
    for line in rows[:25]:
        parts = line.split("\t")
        if len(parts) >= 11:
            print(f"  [{parts[0]}] {parts[2][:70]}{'…' if len(parts[2]) > 70 else ''}")
            print(f"       soc={parts[4]!r} site={parts[5]!r} schedules={parts[10]}  tests: {parts[11][:60]}")

    if len(rows) > 25:
        print(f"  … +{len(rows) - 25} rows in TSV")


def catalog_all_deliveries(data: dict, *, skip_full_summary: bool = False) -> None:
    if skip_full_summary:
        return
    gd = data.get("global_data") or {}
    print("=== global_data ===")
    print(f"  global_min_from: {gd.get('global_min_from')}")
    print(f"  global_max_to:   {gd.get('global_max_to')}")
    pd_list = data.get("platform_data") or []
    print(f"\n=== platform_data: {len(pd_list)} blocks ===\n")

    rows: list[str] = []
    all_test_names: Counter[str] = Counter()

    for i, pd in enumerate(pd_list, 1):
        platform = pd.get("platform") or "(no platform)"
        programs = pd.get("program_info") or []
        dept_set: set[str] = set()
        soc_set: set[str] = set()
        detail_count = 0
        program_names: list[str] = []

        for pi in programs:
            pname = pi.get("program") or ""
            pdetail = pi.get("program_detail") or ""
            pid = pi.get("id") or ""
            program_names.append(f"{pname}|{pdetail}")
            for d in pi.get("details") or []:
                detail_count += 1
                if d.get("department"):
                    dept_set.add(str(d["department"]))
                if d.get("soc"):
                    soc_set.add(str(d["soc"]))
                if d.get("show") == "N":
                    continue
                for s in d.get("schedules") or []:
                    tn = (s.get("test_name") or "").strip()
                    if tn:
                        all_test_names[tn] += 1

        print(f"[{i:2d}] platform={platform!r}")
        print(f"     programs={len(programs)}  details(rows)={detail_count}")
        print(f"     departments={sorted(dept_set)[:12]}{'…' if len(dept_set) > 12 else ''}")
        print(f"     socs({len(soc_set)})={sorted(soc_set)[:15]}{'…' if len(soc_set) > 15 else ''}")
        for j, label in enumerate(program_names[:8]):
            print(f"     program[{j}] {label}")
        if len(program_names) > 8:
            print(f"     … +{len(program_names) - 8} programs")
        print()

        for pi in programs:
            for d in pi.get("details") or []:
                if d.get("show") == "N":
                    continue
                rows.append(
                    "\t".join(
                        [
                            platform,
                            str(pi.get("program") or ""),
                            str(pi.get("program_detail") or ""),
                            str(pi.get("id") or ""),
                            str(d.get("department") or ""),
                            str(d.get("soc") or ""),
                            str(d.get("site") or ""),
                            str(d.get("region") or ""),
                            str(d.get("status") or ""),
                            str(d.get("pl") or ""),
                            str(len(d.get("schedules") or [])),
                        ]
                    )
                )

    out_dir = Path(os.environ.get("DELIVERY_CATALOG_OUT", "/tmp"))
    out_dir.mkdir(parents=True, exist_ok=True)
    tsv = out_dir / "delivery-portal-catalog.tsv"
    header = "platform\tprogram\tprogram_detail\tprogram_id\tdepartment\tsoc\tsite\tregion\tstatus\tpl\tschedule_count"
    tsv.write_text(header + "\n" + "\n".join(rows) + "\n", encoding="utf-8")
    print(f"=== Wrote {tsv} ({len(rows)} detail rows) ===")

    print("\n=== schedule test_name (top 40, show=Y details) ===")
    for name, cnt in all_test_names.most_common(40):
        print(f"  {cnt:5d}  {name}")


def export_audio_product_categories(
    data: dict,
    *,
    categories: tuple[str, ...] = AUDIO_PRODUCT_CATEGORIES,
    platform_filter: str | None = None,
    include_schedules: bool = False,
    list_models_only: bool = False,
) -> None:
    """Product category Audio_Earbud / Audio_Others / Audio_Soundbar / Audio_Speaker."""
    cat_set = set(categories)
    out_dir = Path(os.environ.get("DELIVERY_CATALOG_OUT", "/tmp"))
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = "audio-products"
    tsv_path = out_dir / f"delivery-portal-{slug}.tsv"
    models_path = out_dir / f"delivery-portal-{slug}-models.tsv"
    sched_path = out_dir / f"delivery-portal-{slug}-schedules.tsv"

    header = (
        "platform\tproduct_category\tproduct\tmodel\tprogram\tprogram_detail\tprogram_id\t"
        "soc\tsite\tregion\tstatus\tpl\tshow\tschedule_count\ttest_names_sample"
    )
    models_header = (
        "platform\tproduct_category\tproduct\tmodel\tprogram_detail\tprogram_id\tsoc\tschedule_count"
    )
    sched_header = (
        "platform\tproduct_category\tmodel\tprogram_detail\tprogram_id\tsoc\t"
        "test_name\tplan_start\tplan_end\tactual_start\tactual_end"
    )

    rows: list[str] = []
    model_rows: list[str] = []
    sched_rows: list[str] = []
    by_cat: Counter[str] = Counter()
    seen_program: set[str] = set()

    print(f"\n=== product categories {list(categories)} ===")
    if platform_filter:
        print(f"    platform filter: {platform_filter!r}")

    for row in iter_portal_program_rows(
        data,
        product_categories=cat_set,
        department="Audio",
    ):
        platform = row["platform"]
        if platform_filter and platform != platform_filter:
            continue
        d = row["detail"]
        schedules = row.get("schedules") or []
        test_names = [str(s.get("test_name") or "").strip() for s in schedules if s.get("test_name")]
        sample = ", ".join(test_names[:12])
        if len(test_names) > 12:
            sample += f" (+{len(test_names) - 12})"

        line = [
            platform,
            str(row.get("product_category") or ""),
            str(row.get("product") or ""),
            str(row.get("model") or ""),
            str(row.get("program") or ""),
            str(row.get("program_detail") or ""),
            str(row.get("program_id") or ""),
            str(row.get("soc") or ""),
            str(row.get("site") or ""),
            str(d.get("region") or ""),
            str(d.get("status") or ""),
            str(row.get("pl") or ""),
            str(d.get("show") or "Y"),
            str(len(schedules)),
            sample,
        ]
        rows.append("\t".join(line))
        by_cat[str(row.get("product_category") or "?")] += 1

        pid = str(row.get("program_id") or "")
        if pid and pid not in seen_program:
            seen_program.add(pid)
            model_rows.append(
                "\t".join(
                    [
                        platform,
                        str(row.get("product_category") or ""),
                        str(row.get("product") or ""),
                        str(row.get("model") or ""),
                        str(row.get("program_detail") or ""),
                        pid,
                        str(row.get("soc") or ""),
                        str(len(schedules)),
                    ]
                )
            )

        if include_schedules:
            for s in schedules:
                sched_rows.append(
                    "\t".join(
                        [
                            platform,
                            str(row.get("product_category") or ""),
                            str(row.get("model") or ""),
                            str(row.get("program_detail") or "").replace("\t", " "),
                            pid,
                            str(row.get("soc") or ""),
                            str(s.get("test_name") or ""),
                            str(s.get("plan_start_date") or ""),
                            str(s.get("plan_end_date") or ""),
                            str(s.get("actual_start_date") or ""),
                            str(s.get("actual_end_date") or ""),
                        ]
                    )
                )

    print(f"\n  Total detail rows (show≠N): {len(rows)}")
    print(f"  Unique programs (models): {len(model_rows)}")
    print("  By product_category:")
    for c, n in by_cat.most_common():
        print(f"    {n:4d}  {c}")

    models_path.write_text(models_header + "\n" + "\n".join(model_rows) + "\n", encoding="utf-8")
    print(f"\n=== Wrote {models_path} ({len(model_rows)} programs) ===")

    if not list_models_only:
        tsv_path.write_text(header + "\n" + "\n".join(rows) + "\n", encoding="utf-8")
        print(f"=== Wrote {tsv_path} ===")

    if include_schedules and sched_rows:
        sched_path.write_text(sched_header + "\n" + "\n".join(sched_rows) + "\n", encoding="utf-8")
        print(f"=== Wrote {sched_path} ({len(sched_rows)} schedule lines) ===")

    print("\n--- Programs preview (first 30) ---")
    for line in model_rows[:30]:
        parts = line.split("\t")
        if len(parts) >= 7:
            print(
                f"  [{parts[0]}] {parts[1]} | {parts[3]!r} — {parts[4][:55]}"
                f"{'…' if len(parts[4]) > 55 else ''}  (#sched={parts[7]})"
            )
    if len(model_rows) > 30:
        print(f"  … +{len(model_rows) - 30} programs in models TSV")


def list_product_categories(data: dict) -> None:
    counts = scan_product_categories(data)
    print("\n=== product_category values in JSON (detail / program) ===")
    if not counts:
        print("  (none found — run with --scan-detail-keys or check program-report join)")
    else:
        for name, cnt in counts.most_common():
            mark = " *" if name in AUDIO_PRODUCT_CATEGORIES else ""
            print(f"  {cnt:5d}  {name}{mark}")
    print(f"\n  Audio export preset: {', '.join(AUDIO_PRODUCT_CATEGORIES)}")


def print_detail_key_scan(data: dict) -> None:
    keys = scan_detail_keys(data)
    print("\n=== detail / program_info keys (frequency) ===")
    for name, cnt in keys.most_common():
        print(f"  {cnt:5d}  {name}")


def catalog_program_report(data: list | dict) -> None:
    items = data if isinstance(data, list) else data.get("results") or data.get("data") or []
    if not isinstance(items, list):
        print("\n=== program-report: unexpected shape ===")
        print(json.dumps(data, ensure_ascii=False)[:400])
        return
    print(f"\n=== program-report: {len(items)} items ===")
    keys: set[str] = set()
    for it in items[:3]:
        if isinstance(it, dict):
            keys.update(it.keys())
    print(f"  sample keys: {sorted(keys)[:25]}{'…' if len(keys) > 25 else ''}")

    by_platform: Counter[str] = Counter()
    for it in items:
        if isinstance(it, dict):
            by_platform[str(it.get("platform") or "?")] += 1
    print("  count by platform:")
    for p, c in by_platform.most_common(25):
        print(f"    {c:3d}  {p}")

    tsv = Path(os.environ.get("DELIVERY_CATALOG_OUT", "/tmp")) / "delivery-portal-program-report.tsv"
    if items and isinstance(items[0], dict):
        cols = sorted(items[0].keys())
        lines = ["\t".join(cols)]
        for it in items:
            if isinstance(it, dict):
                lines.append("\t".join(str(it.get(c) or "") for c in cols))
        tsv.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"  Wrote {tsv}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Delivery Portal catalog for Mongo overview matching")
    ap.add_argument("all_deliveries_json", nargs="?", help="Path to all_deliveries JSON")
    ap.add_argument("program_report_json", nargs="?", help="Path to program-report JSON")
    ap.add_argument("--fetch", action="store_true", help="Fetch from DELIVERY_PORTAL_* env")
    ap.add_argument(
        "--department",
        metavar="NAME",
        help="Print/write only this department (e.g. Audio). Skips 20-platform summary.",
    )
    ap.add_argument(
        "--platform",
        metavar="NAME",
        help="With --department, filter to one platform (e.g. webOS26)",
    )
    ap.add_argument(
        "--schedules",
        action="store_true",
        help="With --department / --audio-products, also write *-schedules.tsv",
    )
    ap.add_argument(
        "--audio-products",
        action="store_true",
        help="Filter 4 Audio product categories (Earbud/Others/Soundbar/Speaker). Writes *-models.tsv.",
    )
    ap.add_argument(
        "--product-category",
        action="append",
        metavar="NAME",
        help="Filter product category (repeatable). Implies --audio-products style export.",
    )
    ap.add_argument(
        "--list-product-categories",
        action="store_true",
        help="Print distinct product_category values and exit.",
    )
    ap.add_argument(
        "--scan-detail-keys",
        action="store_true",
        help="Print detail/program_info JSON keys (field name discovery).",
    )
    ap.add_argument(
        "--models-only",
        action="store_true",
        help="With --audio-products, write only *-models.tsv (skip full detail TSV).",
    )
    args = ap.parse_args()

    all_data = None
    report_data = None

    if args.fetch:
        base = os.environ.get("DELIVERY_PORTAL_BASE_URL", "").rstrip("/")
        token = os.environ.get("DELIVERY_PORTAL_API_TOKEN", "").strip()
        if not base or not token:
            print("Set DELIVERY_PORTAL_BASE_URL and DELIVERY_PORTAL_API_TOKEN", file=sys.stderr)
            sys.exit(1)
        all_data = _fetch(f"{base}/api/v1/all_deliveries_data/", token)
        report_data = _fetch(f"{base}/api/v1/program-report/", token)
    else:
        all_path = Path(args.all_deliveries_json) if args.all_deliveries_json else Path("/tmp/dp_all_deliveries_data.json")
        rep_path = Path(args.program_report_json) if args.program_report_json else Path("/tmp/dp_program_report.json")
        all_data = _load(all_path)
        report_data = _load(rep_path)
        if all_data is None:
            print(f"Missing {all_path} — run verify-delivery-portal-api.sh direct first", file=sys.stderr)
            sys.exit(1)

    if isinstance(all_data, dict):
        if args.scan_detail_keys:
            print_detail_key_scan(all_data)
            return
        if args.list_product_categories:
            list_product_categories(all_data)
            return
        if args.audio_products or args.product_category:
            cats = tuple(args.product_category) if args.product_category else AUDIO_PRODUCT_CATEGORIES
            export_audio_product_categories(
                all_data,
                categories=cats,
                platform_filter=args.platform or None,
                include_schedules=args.schedules,
                list_models_only=args.models_only,
            )
        elif args.department:
            export_department_details(
                all_data,
                args.department,
                platform_filter=args.platform or None,
                include_schedules=args.schedules,
            )
        else:
            catalog_all_deliveries(all_data)
    if report_data is not None and not args.department and not args.audio_products and not args.product_category:
        catalog_program_report(report_data)


if __name__ == "__main__":
    main()
