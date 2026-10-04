"""모델 검증 일정 Snapshot — HTML 이메일 본문 (Page 1 + Page 2 세로 연결)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

BAR_COLORS: dict[str, str] = {
    "planned": "#94A3B8",
    "inprogress": "#FACC15",
    "event_ng": "#EF4444",
    "event_ok": "#22C55E",
    "event_done_est": "#A78BFA",
    "su_fota": "#F97316",
}

BAR_LABELS: dict[str, str] = {
    "planned": "진행 예정",
    "inprogress": "진행중",
    "event_ng": "Event NG",
    "event_ok": "Event OK",
    "event_done_est": "Event 완료 예상",
    "su_fota": "SU/FOTA 배포",
}


def build_snapshot_subject(today: date | None = None) -> str:
    d = today or date.today()
    return f"[{d.isoformat()}] 현재 달 QA 모델별 검증 일정"


def _group_key(row: dict[str, Any]) -> str:
    return f"{row.get('category', '')}|{row.get('model', '')}|{row.get('event', '')}"


def _split_pages(rows: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """UI Snapshot 과 동일 — 모델 그룹 중간 절단 없이 2페이지."""
    if not rows:
        return [[]]
    groups: list[list[dict[str, Any]]] = []
    i = 0
    while i < len(rows):
        k = _group_key(rows[i])
        g = [rows[i]]
        i += 1
        while i < len(rows) and _group_key(rows[i]) == k:
            g.append(rows[i])
            i += 1
        groups.append(g)
    if len(groups) <= 1:
        return [rows]
    mid = (len(groups) + 1) // 2
    return [sum(groups[:mid], []), sum(groups[mid:], [])]


def _count_model_groups(rows: list[dict[str, Any]]) -> int:
    n = 0
    i = 0
    while i < len(rows):
        k = _group_key(rows[i])
        n += 1
        while i < len(rows) and _group_key(rows[i]) == k:
            i += 1
    return n


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


def _norm_date(s: str) -> str:
    return str(s or "")[:10]


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


def _fmt_day(day: str) -> str:
    try:
        d = datetime.strptime(day[:10], "%Y-%m-%d")
        return f"{d.month}/{d.day}"
    except ValueError:
        return day


def _fmt_day_header(day: str) -> str:
    try:
        d = datetime.strptime(day[:10], "%Y-%m-%d")
        wd = ["일", "월", "화", "수", "목", "금", "토"][d.weekday()]
        return f"{d.month}/{d.day}<br/><span style='font-size:8px;color:#888'>{wd}</span>"
    except ValueError:
        return day


def _escape(text: str) -> str:
    return (
        str(text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("\n", "<br/>")
    )


def _render_table(rows: list[dict[str, Any]], dates: list[str]) -> str:
    if not rows:
        return "<p>데이터 없음</p>"

    cat_merge = _calc_merge(rows, lambda r: str(r.get("category", "")))
    model_merge = _calc_merge(rows, _group_key)

    date_heads = "".join(
        f'<th style="padding:2px;font-size:9px;border:1px solid #ccc;min-width:24px;">{_fmt_day_header(d)}</th>'
        for d in dates
    )
    header = f"""
    <tr style="background:#f3f4f6;">
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">카테고리</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">모델명</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">이벤트</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">개발등급</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">생산업체</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">SoC</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">담당</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">구분</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;min-width:120px;">주요 변경점</th>
      <th style="padding:4px;border:1px solid #ccc;font-size:10px;">Status</th>
      {date_heads}
    </tr>"""

    body_rows: list[str] = []
    for ri, row in enumerate(rows):
        cm, mm = cat_merge[ri], model_merge[ri]
        bars = row.get("bars") if isinstance(row.get("bars"), list) else []
        cells: list[str] = []

        if not cm["hidden"]:
            cells.append(
                f'<td rowspan="{cm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:10px;vertical-align:middle;">{_escape(str(row.get("category", "")))}</td>'
            )
        if not mm["hidden"]:
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:11px;font-weight:bold;vertical-align:middle;text-align:center;">{_escape(str(row.get("model", "")))}</td>'
            )
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:10px;vertical-align:middle;">{_escape(str(row.get("event", "")))}</td>'
            )
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:10px;vertical-align:middle;">{_escape(str(row.get("variant", "")))}</td>'
            )
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:10px;vertical-align:middle;">{_escape(str(row.get("manufacturer", "")))}</td>'
            )
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:10px;vertical-align:middle;">{_escape(str(row.get("soc", "")))}</td>'
            )
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:10px;vertical-align:middle;">{_escape(str(row.get("staff", "")))}</td>'
            )

        cells.append(
            f'<td style="padding:4px 6px;border:1px solid #ddd;font-size:10px;'
            f'white-space:nowrap;word-break:keep-all;min-width:52px;">'
            f'{_escape(str(row.get("testType", "")))}</td>'
        )

        if not mm["hidden"]:
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:10px;vertical-align:middle;">{_escape(str(row.get("changes", "")))}</td>'
            )

        cells.append(
            f'<td style="padding:4px;border:1px solid #ddd;font-size:10px;">{_escape(str(row.get("status", "")))}</td>'
        )

        di = 0
        while di < len(dates):
            day = dates[di]
            bar = next((b for b in bars if isinstance(b, dict) and _bar_on_day(b, day)), None)
            if bar and _is_bar_start(bar, day):
                color = BAR_COLORS.get(str(bar.get("type", "")), "#94A3B8")
                label = _escape(str(bar.get("label") or ""))
                span = _bar_span_days(bar, dates, di)
                cells.append(
                    f'<td colspan="{span}" style="padding:2px;border:1px solid #ddd;background:{color};'
                    f'font-size:8px;font-weight:bold;text-align:center;vertical-align:middle;color:#111;">{label}</td>'
                )
                di += span
            elif bar:
                di += 1
            else:
                cells.append('<td style="padding:0;border:1px solid #eee;min-width:24px;height:22px;"></td>')
                di += 1

        body_rows.append(f'<tr>{"".join(cells)}</tr>')

    return f"""
    <div style="overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch;">
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:960px;font-family:Malgun Gothic,sans-serif;table-layout:auto;">
      <thead>{header}</thead>
      <tbody>{"".join(body_rows)}</tbody>
    </table>
    </div>"""


def build_snapshot_html(
    *,
    period_label: str,
    dates: list[str],
    rows: list[dict[str, Any]],
    audiences: list[str],
) -> str:
    pages = _split_pages(rows)
    page_total = len(pages)
    legend = " · ".join(
        f'<span style="display:inline-block;width:12px;height:8px;background:{c};"></span> {BAR_LABELS[k]}'
        for k, c in BAR_COLORS.items()
    )
    audience_text = ", ".join(audiences) if audiences else "-"

    page_html = ""
    for idx, page_rows in enumerate(pages, start=1):
        groups = _count_model_groups(page_rows)
        if page_total > 1:
            margin = "32px" if idx > 1 else "0"
            page_html += f"""
            <div style="margin-top:{margin};padding-top:{"16px" if idx > 1 else "0"};{"border-top:2px solid #cbd5e1;" if idx > 1 else ""}">
              <h3 style="font-size:14px;margin:0 0 8px;color:#334155;">
                Page {idx} / {page_total} · 모델 {groups}개 · {len(page_rows)}행
              </h3>
            """
        page_html += _render_table(page_rows, dates)
        if page_total > 1:
            page_html += "</div>"

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif;color:#111;padding:16px;">
  <h2 style="font-size:16px;margin:0 0 8px;">모델별 검증 일정 Snapshot</h2>
  <p style="font-size:12px;color:#555;margin:0 0 12px;">
    기간: {_escape(period_label)} · 수신 대상: {_escape(audience_text)} · 전체 {len(rows)}행 · {page_total}페이지
  </p>
  <p style="font-size:11px;color:#666;margin:0 0 16px;">{legend}</p>
  {page_html}
  <p style="font-size:10px;color:#999;margin-top:24px;">Jira Dashboard — 자동 발송</p>
</body></html>"""
