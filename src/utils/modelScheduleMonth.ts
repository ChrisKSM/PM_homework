/** 모델 검증 일정 — 달력 월 단위 타임라인 */

export type ViewMonth = { year: number; month: number }

export function monthStart(vm: ViewMonth): Date {
  return new Date(vm.year, vm.month, 1, 0, 0, 0, 0)
}

export function monthEnd(vm: ViewMonth): Date {
  return new Date(vm.year, vm.month + 1, 0, 0, 0, 0, 0)
}

export function daysInMonth(vm: ViewMonth): Date[] {
  const end = monthEnd(vm).getDate()
  return Array.from({ length: end }, (_, i) => new Date(vm.year, vm.month, i + 1, 0, 0, 0, 0))
}

export function shiftViewMonth(vm: ViewMonth, delta: number): ViewMonth {
  const d = new Date(vm.year, vm.month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function viewMonthLabel(vm: ViewMonth): string {
  return `${vm.year % 100}/${vm.month + 1}월`
}

export function periodLabelForMonth(vm: ViewMonth): string {
  const s = monthStart(vm)
  const e = monthEnd(vm)
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`
}

export function todayOffsetInMonth(today: Date, vm: ViewMonth): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const s = monthStart(vm)
  const e = monthEnd(vm)
  if (t < s || t > e) return -1
  return t.getDate() - 1
}

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
