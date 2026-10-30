"""모델 검증 일정 Snapshot — HTML 이메일 본문 생성."""
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

TEST_TYPES = ("일반성능", "호환성", "안정성", "시너지")


def build_snapshot_subject(today: date | None = None) -> str:
    d = today or date.today()
    return f"[{d.isoformat()}] 현재 달 QA 모델별 검증 일정"


def _group_key(row: dict[str, Any]) -> str:
    return f"{row.get('category', '')}|{row.get('model', '')}|{row.get('event', '')}"


def _split_pages(rows: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
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


def _fmt_day(day: str) -> str:
    try:
        d = datetime.strptime(day[:10], "%Y-%m-%d")
        return f"{d.month}/{d.day}"
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

    head_cols = "".join(f'<th style="padding:4px;font-size:10px;border:1px solid #ccc;">{_fmt_day(d)}</th>' for d in dates)
    header = f"""
    <tr style="background:#f3f4f6;">
      <th style="padding:4px;border:1px solid #ccc;">카테고리</th>
      <th style="padding:4px;border:1px solid #ccc;">모델</th>
      <th style="padding:4px;border:1px solid #ccc;">이벤트</th>
      <th style="padding:4px;border:1px solid #ccc;">구분</th>
      <th style="padding:4px;border:1px solid #ccc;">Status</th>
      <th style="padding:4px;border:1px solid #ccc;min-width:120px;">주요 변경점</th>
      {head_cols}
    </tr>"""

    body_rows: list[str] = []
    for ri, row in enumerate(rows):
        cm, mm = cat_merge[ri], model_merge[ri]
        bars = row.get("bars") if isinstance(row.get("bars"), list) else []
        cells: list[str] = []

        if not cm["hidden"]:
            cells.append(
                f'<td rowspan="{cm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:11px;vertical-align:middle;">{_escape(str(row.get("category", "")))}</td>'
            )
        if not mm["hidden"]:
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:11px;font-weight:bold;vertical-align:middle;">{_escape(str(row.get("model", "")))}</td>'
            )
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:11px;vertical-align:middle;">{_escape(str(row.get("event", "")))}</td>'
            )

        cells.append(
            f'<td style="padding:4px;border:1px solid #ddd;font-size:10px;">{_escape(str(row.get("testType", "")))}</td>'
        )
        cells.append(
            f'<td style="padding:4px;border:1px solid #ddd;font-size:10px;">{_escape(str(row.get("status", "")))}</td>'
        )

        if not mm["hidden"]:
            cells.append(
                f'<td rowspan="{mm["rowSpan"]}" style="padding:4px;border:1px solid #ddd;font-size:10px;vertical-align:middle;">{_escape(str(row.get("changes", "")))}</td>'
            )

        for day in dates:
            bar = next((b for b in bars if isinstance(b, dict) and _bar_on_day(b, day)), None)
            if bar:
                color = BAR_COLORS.get(str(bar.get("type", "")), "#94A3B8")
                label = _escape(str(bar.get("label") or ""))
                cells.append(
                    f'<td style="padding:0;border:1px solid #ddd;background:{color};font-size:9px;text-align:center;min-width:22px;height:22px;">{label}</td>'
                )
            else:
                cells.append('<td style="padding:0;border:1px solid #eee;min-width:22px;height:22px;"></td>')

        body_rows.append(f'<tr>{"".join(cells)}</tr>')

    return f"""
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-bottom:16px;font-family:Malgun Gothic,sans-serif;">
      <thead>{header}</thead>
      <tbody>{"".join(body_rows)}</tbody>
    </table>"""


def build_snapshot_html(
    *,
    period_label: str,
    dates: list[str],
    rows: list[dict[str, Any]],
    audiences: list[str],
) -> str:
    pages = _split_pages(rows)
    legend = " · ".join(f'<span style="display:inline-block;width:12px;height:8px;background:{c};"></span> {BAR_LABELS[k]}' for k, c in BAR_COLORS.items())
    audience_text = ", ".join(audiences)

    page_html = ""
    for idx, page_rows in enumerate(pages, start=1):
        if len(pages) > 1:
            page_html += f'<h3 style="font-size:14px;margin:16px 0 8px;">Page {idx}</h3>'
        page_html += _render_table(page_rows, dates)

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif;color:#111;padding:16px;">
  <h2 style="font-size:16px;margin:0 0 8px;">모델별 검증 일정 Snapshot</h2>
  <p style="font-size:12px;color:#555;margin:0 0 12px;">
    기간: {_escape(period_label)} · 수신 대상: {_escape(audience_text)} · {len(rows)}행
  </p>
  <p style="font-size:11px;color:#666;margin:0 0 16px;">{legend}</p>
  {page_html}
  <p style="font-size:10px;color:#999;margin-top:24px;">Jira Dashboard — 자동 발송</p>
</body></html>"""
