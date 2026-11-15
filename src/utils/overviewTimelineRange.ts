/** 전 모델 일정 타임라인 — 오늘 기준 2주 전 ~ 3개월 후 */

export const OVERVIEW_TIMELINE_PAST_DAYS = 14
export const OVERVIEW_TIMELINE_FUTURE_MONTHS = 3

export function dayStart(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return dayStart(r)
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return dayStart(r)
}

export function toISO(d: Date): string {
  const x = dayStart(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function fmtShort(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** inclusive day list */
export function buildOverviewTimelineDates(anchor = new Date()): Date[] {
  const today = dayStart(anchor)
  const start = addDays(today, -OVERVIEW_TIMELINE_PAST_DAYS)
  const end = addMonths(today, OVERVIEW_TIMELINE_FUTURE_MONTHS)
  const out: Date[] = []
  for (let cur = start; cur.getTime() <= end.getTime(); cur = addDays(cur, 1)) {
    out.push(new Date(cur))
  }
  return out
}

export function overviewTimelinePeriodLabel(dates: Date[]): string {
  if (!dates.length) return ''
  return `${fmtShort(dates[0])} ~ ${fmtShort(dates[dates.length - 1])}`
}
