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


def catalog_all_deliveries(data: dict) -> None:
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
        catalog_all_deliveries(all_data)
    if report_data is not None:
        catalog_program_report(report_data)


if __name__ == "__main__":
    main()
