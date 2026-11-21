/**
 * webOS TV Sprint 달력 (2주 단위, 월요일 시작 · 금요일 종료).
 * 예: 2026_IR2SP08(4/13-4/24), 2026_IR5SP26(12/21-1/1)
 * BE 연동 시 Jira board 40337 sprint 목록으로 대체.
 */

export interface Sprint {
  name: string
  year: number
  number: number
  /** YYYY-MM-DD (월) */
  start: string
  /** YYYY-MM-DD (금, start + 11일) */
  end: string
}

const SPRINTS_PER_YEAR = 26

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIso(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

function firstMonday(year: number): Date {
  const d = new Date(year, 0, 1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  return d
}

function irOf(sprintNumber: number): number {
  return Math.min(5, Math.ceil(sprintNumber / 5))
}

function md(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function sprintsForYear(year: number): Sprint[] {
  const base = firstMonday(year)
  return Array.from({ length: SPRINTS_PER_YEAR }, (_, i) => {
    const start = addDays(base, i * 14)
    const end = addDays(start, 11)
    const n = i + 1
    return {
      name: `${year}_IR${irOf(n)}SP${String(n).padStart(2, '0')}(${md(start)}-${md(end)})`,
      year,
      number: n,
      start: toIso(start),
      end: toIso(end),
    }
  })
}

export function sprintCalendar(years: number[]): Sprint[] {
  return years.flatMap(sprintsForYear)
}

export function sprintForDate(sprints: Sprint[], iso: string): Sprint | undefined {
  if (!iso) return undefined
  const day = iso.slice(0, 10)
  return sprints.find((s) => s.start <= day && day <= addDaysIso(s.end, 2))
}

function addDaysIso(iso: string, n: number): string {
  return toIso(addDays(parseIso(iso), n))
}

export function sprintByName(sprints: Sprint[], name: string): Sprint | undefined {
  return sprints.find((s) => s.name === name)
}

/** 변경 가능 마감: Release Sprint 직전 Sprint 시작 전 (Due Date 기준 4주 전) */
export function sprintChangeDeadline(sprints: Sprint[], sprint: Sprint): string {
  const idx = sprints.findIndex((s) => s.name === sprint.name)
  if (idx > 0) return addDaysIso(sprints[idx - 1].start, -1)
  return addDaysIso(sprint.start, -15)
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  const ms = parseIso(toIsoDate).getTime() - parseIso(fromIso).getTime()
  return Math.round(ms / 86_400_000)
}

export function todayIso(): string {
  return toIso(new Date())
}
