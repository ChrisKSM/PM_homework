import type { ModelRow, ScheduleBar } from './modelScheduleRows'
import { groupKey } from './modelScheduleRows'
import { isoDate, monthEnd, monthStart, type ViewMonth } from './modelScheduleMonth'

export type ScheduleChangeLine = {
  model: string
  testType: string
  before: string
  after: string
}

function fmtMd(iso: string): string {
  const d = iso.slice(0, 10)
  const m = parseInt(d.slice(5, 7), 10)
  const day = parseInt(d.slice(8, 10), 10)
  if (!m || !day) return d
  return `${m}/${day}`
}

function fmtBars(bars: ScheduleBar[]): string {
  if (!bars.length) return '(없음)'
  return bars
    .map((b) => {
      const end = b.end || b.start
      const label = b.label ? ` ${b.label}` : ''
      return `${fmtMd(b.start)} ~ ${fmtMd(end)}${label}`
    })
    .join(', ')
}

function normBars(bars: ScheduleBar[]): ScheduleBar[] {
  return [...(bars ?? [])]
    .map((b) => ({
      start: String(b.start).slice(0, 10),
      end: String(b.end || b.start).slice(0, 10),
      type: b.type,
      label: b.label ?? '',
    }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
}

function barsOverlapMonth(bars: ScheduleBar[], vm: ViewMonth): ScheduleBar[] {
  const ms = isoDate(monthStart(vm))
  const me = isoDate(monthEnd(vm))
  return normBars(bars).filter((b) => b.start <= me && b.end >= ms)
}

function rowMap(rows: ModelRow[]): Map<string, ModelRow> {
  const m = new Map<string, ModelRow>()
  for (const r of rows) m.set(r.id, r)
  return m
}

/** 편집 시작(before) vs 현재(after) — 일반성능 bars 변경 (해당 월과 겹치는 경우) */
export function computeScheduleChanges(
  beforeRows: ModelRow[],
  afterRows: ModelRow[],
  vm: ViewMonth,
): ScheduleChangeLine[] {
  const before = rowMap(beforeRows)
  const out: ScheduleChangeLine[] = []

  for (const after of afterRows) {
    if (after.testType !== '일반성능') continue
    const prev = before.get(after.id)
    if (!prev) continue

    const b0 = barsOverlapMonth(prev.bars ?? [], vm)
    const b1 = barsOverlapMonth(after.bars ?? [], vm)
    const sig0 = JSON.stringify(b0)
    const sig1 = JSON.stringify(b1)
    if (sig0 === sig1) continue

    out.push({
      model: after.model,
      testType: after.testType,
      before: fmtBars(b0),
      after: fmtBars(b1),
    })
  }

  return out.sort((a, b) => a.model.localeCompare(b.model, 'ko'))
}

/** 이번 달 표용 — 모델별 일반성능 일정 한 줄 */
export function monthScheduleSummary(afterRows: ModelRow[], vm: ViewMonth): Array<{ model: string; schedule: string }> {
  const seen = new Set<string>()
  const lines: Array<{ model: string; schedule: string }> = []
  for (const r of afterRows) {
    if (r.testType !== '일반성능') continue
    const k = groupKey(r)
    if (seen.has(k)) continue
    seen.add(k)
    const bars = barsOverlapMonth(r.bars ?? [], vm)
    if (!bars.length) continue
    lines.push({ model: r.model, schedule: fmtBars(bars) })
  }
  return lines
}
