"""전 모델 일정 Snapshot — HTML 이메일 (주요 SW 이벤트 + Page 1/2)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

SW_BAR_COLORS: dict[str, str] = {
    "sit": "#FACC15",
    "dev_test": "#FDE68A",
    "fc": "#0EA5E9",
    "preqp": "#C4B5FD",
    "qp": "#A78BFA",
    "su": "#EF4444",
    "default": "#94A3B8",
}

HW_BAR_COLORS: dict[str, str] = {
    "prepv": "#9CA3AF",
    "pv": "#6B7280",
    "mp": "#4B5563",
    "ats": "#D1D5DB",
    "default": "#9CA3AF",
}


def build_overview_subject(today: date | None = None) -> str:
    d = today or date.today()
    return f"[{d.isoformat()}] 전 모델 개발 일정"


def _escape(text: str) -> str:
    return (
        str(text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("\n", "<br/>")
    )


def _norm_date(s: str) -> str:
    return str(s or "")[:10]


def _fmt_range(start: str, end: str) -> str:
    s, e = _norm_date(start), _norm_date(end) or _norm_date(start)
    if not s:
        return "-"
    if s == e:
        return s
    return f"{s} ~ {e}"


def _split_model_pages(models: list[dict[str, Any]], max_per_page: int = 8) -> list[list[dict[str, Any]]]:
    if len(models) <= max_per_page:
        return [models]
    mid = (len(models) + 1) // 2
    return [models[:mid], models[mid:]]


def _sw_events_for_model(model: dict[str, Any]) -> list[dict[str, Any]]:
    events = model.get("events") if isinstance(model.get("events"), list) else []
    sw_events: list[dict[str, Any]] = []
    for e in events:
        if not isinstance(e, dict):
            continue
        name = str(e.get("name", "")).strip()
        if not name or name == "-":
            continue
        kind = str(e.get("kind", "")).lower()
        n = name.lower().replace(" ", "")
        is_hw = kind == "hw" or n in ("prepv", "mp", "ats") or n.startswith("pv")
        if kind == "sw" or not is_hw:
            sw_events.append(e)
    return sw_events


def _sw_events_summary(models: list[dict[str, Any]]) -> str:
    rows: list[str] = []
    for m in models:
        cat = _escape(str(m.get("category", "")))
        model = _escape(str(m.get("model", "")))
        for e in _sw_events_for_model(m):
            ev_name = str(e.get("name", "")).strip()
            rows.append(
                "<tr>"
                f'<td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">{cat}</td>'
                f'<td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;font-weight:bold;">{model}</td>'
                f'<td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">{_escape(ev_name)}</td>'
                f'<td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">'
                f'{_escape(_fmt_range(str(e.get("start", "")), str(e.get("end", ""))))}</td>'
                "</tr>"
            )
    if not rows:
        return "<p style='font-size:12px;color:#666;'>SW 이벤트 없음</p>"
    return f"""
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:960px;margin-bottom:20px;">
      <thead>
        <tr style="background:#eff6ff;">
          <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;text-align:left;">제품군</th>
          <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;text-align:left;">모델</th>
          <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;text-align:left;">SW Event</th>
          <th style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;text-align:left;">기간</th>
        </tr>
      </thead>
      <tbody>{"".join(rows)}</tbody>
    </table>"""


def build_overview_plain_text(
    *,
    period_label: str,
    models: list[dict[str, Any]],
    page_total: int,
    has_attachments: bool,
) -> str:
    lines = [
        "전 모델 개발 일정 Snapshot",
        f"기간: {period_label}",
        "",
        "■ 모델별 SW 이벤트 일정",
        "",
    ]
    any_event = False
    for m in models:
        cat = str(m.get("category", "")).strip()
        model = str(m.get("model", "")).strip()
        sw_events = _sw_events_for_model(m)
        if not sw_events:
            continue
        any_event = True
        header = f"[{cat}] {model}" if cat else model
        lines.append(header)
        for e in sw_events:
            name = str(e.get("name", "")).strip()
            period = _fmt_range(str(e.get("start", "")), str(e.get("end", "")))
            lines.append(f"  · {name} : {period}")
        lines.append("")

    if not any_event:
        lines.append("(SW 이벤트 없음)")
        lines.append("")

    lines.append("■ 타임라인 Snapshot")
    if has_attachments:
        for i in range(1, page_total + 1):
            lines.append(f"  · Page {i}/{page_total} — 첨부 이미지 참고")
    else:
        lines.append("  · (스냅샷 이미지 없음 — FE 최신 빌드에서 재발송)")
    lines.append("")
    lines.append("— Jira Dashboard 자동 발송")
    return "\n".join(lines)


def _bar_color(kind: str, bar_type: str) -> str:
    m = HW_BAR_COLORS if kind == "hw" else SW_BAR_COLORS
    return m.get(str(bar_type or "default"), m["default"])


def _render_overview_page(
    display_rows: list[dict[str, Any]],
    dates: list[str],
) -> str:
    if not display_rows:
        return "<p>데이터 없음</p>"

    def cat_key(r: dict) -> str:
        return str(r.get("category", ""))

    def model_key(r: dict) -> str:
        return f"{r.get('category', '')}|{r.get('model', '')}"

    cat_merge = _calc_merge(display_rows, cat_key)
    model_merge = _calc_merge(display_rows, model_key)

    date_heads = "".join(
        f'<th style="padding:2px;font-size:8px;border:1px solid #ccc;min-width:22px;">{_fmt_day_header(d)}</th>'
        for d in dates
    )
    header = f"""
    <tr style="background:#f3f4f6;">
      <th style="padding:4px;border:1px solid #ccc;font-size:9px;">제품군</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:9px;">모델</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:9px;">등급</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:9px;">SW</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:9px;">행</th>
      {date_heads}
    </tr>"""

    body: list[str] = []
    for ri, row in enumerate(display_rows):
        cm, mm = cat_merge[ri], model_merge[ri]
        kind = str(row.get("timelineKind", "sw"))
        bars = row.get("bars") if isinstance(row.get("bars"), list) else []
        cells: list[str] = []

        if not cm["hidden"]:
            cells.append(
                f'<td rowspan="{cm["rowSpan"]}" style="padding:3px;border:1px solid #ddd;font-size:9px;vertical-align:middle;">'
                f'{_escape(str(row.get("category", "")))}</td>'
            )
        if not mm["hidden"]:
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:3px;border:1px solid #ddd;font-size:10px;font-weight:bold;vertical-align:middle;text-align:center;">'
                f'{_escape(str(row.get("model", "")))}</td>'
            )
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:3px;border:1px solid #ddd;font-size:9px;vertical-align:middle;">'
                f'{_escape(str(row.get("variant", "")))}</td>'
            )
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:3px;border:1px solid #ddd;font-size:9px;vertical-align:middle;">'
                f'{_escape(str(row.get("swPm", "")))}</td>'
            )

        cells.append(
            f'<td style="padding:3px;border:1px solid #ddd;font-size:9px;font-weight:bold;background:{"#f8fafc" if kind == "hw" else "#fffbeb"};">'
            f'{"HW" if kind == "hw" else "SW"}</td>'
        )

        di = 0
        while di < len(dates):
            day = dates[di]
            bar = next((b for b in bars if isinstance(b, dict) and _bar_on_day(b, day)), None)
            if bar and _is_bar_start(bar, day):
                bt = str(bar.get("barType", "default"))
                color = _bar_color(kind, bt)
                label = _escape(str(bar.get("label") or ""))
                span = _bar_span_days(bar, dates, di)
                cells.append(
                    f'<td colspan="{span}" style="padding:1px;border:1px solid #ddd;background:{color};'
                    f'font-size:7px;font-weight:bold;text-align:center;vertical-align:middle;">{label}</td>'
                )
                di += span
            elif bar:
                di += 1
            else:
                cells.append('<td style="padding:0;border:1px solid #eee;min-width:22px;height:18px;"></td>')
                di += 1

        body.append(f'<tr>{"".join(cells)}</tr>')

    return f"""
    <div style="overflow-x:auto;">
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:960px;font-family:Malgun Gothic,sans-serif;">
      <thead>{header}</thead>
      <tbody>{"".join(body)}</tbody>
    </table>
    </div>"""


def _calc_merge(rows: list[dict[str, Any]], key_fn) -> list[dict[str, int | bool]]:
    res = [{"rowSpan": 1, "hidden": False} for _ in rows]
    i = 0
    while i < len(rows):
        k = key_fn(rows[i])
        j = i + 1
        while j < len(rows) and key_fn(rows[j]) == k and k:
            j += 1
        res[i]["rowSpan"] = j - i
        for x in range(i + 1, j):
            res[x]["hidden"] = True
        i = j
    return res


def _bar_on_day(bar: dict[str, Any], day: str) -> bool:
    start = _norm_date(str(bar.get("start", "")))
    end = _norm_date(str(bar.get("end", ""))) or start
    return bool(start) and start <= day <= end


def _is_bar_start(bar: dict[str, Any], day: str) -> bool:
    return _norm_date(str(bar.get("start", ""))) == day


def _bar_span_days(bar: dict[str, Any], dates: list[str], start_idx: int) -> int:
    start = _norm_date(str(bar.get("start", "")))
    end = _norm_date(str(bar.get("end", ""))) or start
    span = 0
    for i in range(start_idx, len(dates)):
        d = dates[i]
        if start <= d <= end:
            span += 1
        elif d > end:
            break
    return max(span, 1)


def _fmt_day_header(day: str) -> str:
    try:
        d = datetime.strptime(day[:10], "%Y-%m-%d")
        return f"{d.month}/{d.day}"
    except ValueError:
        return day


def build_overview_snapshot_html(
    *,
    period_label: str,
    dates: list[str],
    models: list[dict[str, Any]],
    display_rows: list[dict[str, Any]],
    audiences: list[str],
    page_images: list[dict[str, Any]] | None = None,
) -> str:
    pages = _split_model_pages(models)
    page_total = len(pages)
    image_by_page = {
        int(img.get("page", 0)): str(img.get("data", "")).strip()
        for img in (page_images or [])
        if img.get("data")
    }

    # display rows per page — match model split (fallback when no PNG)
    model_ids_by_page: list[set[str]] = []
    for page_models in pages:
        ids = {str(m.get("id", m.get("model", ""))) for m in page_models}
        model_ids_by_page.append(ids)

    snapshot_html = ""
    for idx in range(1, page_total + 1):
        b64 = image_by_page.get(idx, "")
        if b64:
            snapshot_html += f"""
        <div style="margin-top:{'28px' if idx > 1 else '0'};">
          <p style="font-size:12px;font-weight:bold;margin:0 0 6px;color:#334155;">
            Page {idx} / {page_total}
          </p>
          <img src="cid:overview-page-{idx}" alt="Page {idx} Snapshot"
               style="max-width:100%;border:1px solid #e2e8f0;display:block;"/>
        </div>"""
        else:
            page_models = pages[idx - 1]
            ids = model_ids_by_page[idx - 1]
            page_rows = [r for r in display_rows if str(r.get("modelId", "")) in ids]
            margin = "28px" if idx > 1 else "0"
            border = "border-top:2px solid #cbd5e1;padding-top:16px;" if idx > 1 else ""
            snapshot_html += f"""
        <div style="margin-top:{margin};{border}">
          <h3 style="font-size:14px;margin:0 0 8px;color:#334155;">
            Page {idx} / {page_total} · 모델 {len(page_models)}개
          </h3>
          {_render_overview_page(page_rows, dates)}
        </div>"""

    sw_summary = _sw_events_summary(models)
    audience_text = ", ".join(audiences) if audiences else "-"

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif;color:#111;padding:16px;">
  <h2 style="font-size:16px;margin:0 0 8px;">전 모델 개발 일정</h2>
  <p style="font-size:12px;color:#555;margin:0 0 12px;">
    기간: {_escape(period_label)} · 수신: {_escape(audience_text)} · {len(models)}모델 · {page_total}페이지
  </p>
  <h3 style="font-size:13px;margin:16px 0 8px;color:#1e40af;">모델별 SW 이벤트 일정</h3>
  {sw_summary}
  <h3 style="font-size:13px;margin:16px 0 8px;color:#334155;">타임라인 Snapshot</h3>
  {snapshot_html}
  <p style="font-size:10px;color:#999;margin-top:24px;">Jira Dashboard — 자동 발송</p>
</body></html>"""
