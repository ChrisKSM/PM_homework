import type {
  DeliveryAppliedFilters,
  DeliveryDetailRow,
  DeliveryPortalPayload,
  DeliverySchedule,
} from '../types/deliveryPortal'

export const TEST_GROUP_COLORS: [string, string][] = [
  ['FIT', '#0ea5e9'],
  ['SIT', '#6366f1'],
  ['Dev', '#64748b'],
  ['FC', '#3b82f6'],
  ['INT', '#10b981'],
  ['QP', '#22c55e'],
  ['HW', '#8b5cf6'],
  ['SU', '#d946ef'],
]

export function testBarColor(name: string): string {
  const n = (name || '').toUpperCase()
  for (const [prefix, color] of TEST_GROUP_COLORS) {
    if (n.startsWith(prefix.toUpperCase())) return color
  }
  return '#6b7280'
}

export function filterDeliveryDetails(
  data: DeliveryPortalPayload | null,
  filters: DeliveryAppliedFilters,
): DeliveryDetailRow[] {
  if (!data?.platform_data?.length || !filters.platform) return []
  const { department, platform, soc, program, status } = filters
  const items: DeliveryDetailRow[] = []
  for (const pd of data.platform_data) {
    if (platform && pd.platform !== platform) continue
    for (const pi of pd.program_info ?? []) {
      if (program && pi.program !== program) continue
      for (const detail of pi.details ?? []) {
        if (department && detail.department !== department) continue
        if (soc && detail.soc !== soc) continue
        if (status && detail.status !== status) continue
        if (detail.show === 'N') continue
        items.push({
          ...detail,
          _program: pi.program,
          _programDetail: pi.program_detail,
        })
      }
    }
  }
  return items
}

export function collectFilterOptions(data: DeliveryPortalPayload | null) {
  const departments = new Set<string>()
  const platforms = new Set<string>()
  if (!data?.platform_data) {
    return { departments: [] as string[], platforms: [] as string[] }
  }
  for (const pd of data.platform_data) {
    if (pd.platform) platforms.add(pd.platform)
    for (const pi of pd.program_info ?? []) {
      for (const d of pi.details ?? []) {
        if (d.department) departments.add(d.department)
      }
    }
  }
  return {
    departments: [...departments].sort(),
    platforms: [...platforms].sort(),
  }
}

export function socOptionsForPlatform(
  data: DeliveryPortalPayload | null,
  department: string,
  platform: string,
): string[] {
  if (!data?.platform_data || !platform) return []
  const set = new Set<string>()
  const pd = data.platform_data.find((p) => p.platform === platform)
  if (!pd) return []
  for (const pi of pd.program_info ?? []) {
    for (const d of pi.details ?? []) {
      if (department && d.department !== department) continue
      if (d.soc) set.add(d.soc)
    }
  }
  return [...set].sort()
}

export function programOptionsFor(
  data: DeliveryPortalPayload | null,
  department: string,
  platform: string,
  soc: string,
): string[] {
  if (!data?.platform_data || !platform) return []
  const set = new Set<string>()
  const pd = data.platform_data.find((p) => p.platform === platform)
  if (!pd) return []
  for (const pi of pd.program_info ?? []) {
    let ok = false
    for (const d of pi.details ?? []) {
      if (department && d.department !== department) continue
      if (soc && d.soc !== soc) continue
      ok = true
      break
    }
    if (ok && pi.program) set.add(pi.program)
  }
  return [...set].sort()
}

export function dayToPercent(dateStr: string | undefined, min: Date, max: Date): number {
  if (!dateStr) return 0
  const total = (max.getTime() - min.getTime()) / 86400000
  if (total <= 0) return 0
  const off = (new Date(dateStr.slice(0, 10)).getTime() - min.getTime()) / 86400000
  return (off / total) * 100
}

export function scheduleDateRange(details: DeliveryDetailRow[]): { min: Date; max: Date } | null {
  let min: Date | null = null
  let max: Date | null = null
  for (const d of details) {
    for (const s of d.schedules ?? []) {
      for (const key of ['plan_start_date', 'plan_end_date', 'actual_start_date', 'actual_end_date'] as const) {
        const raw = s[key]
        if (!raw) continue
        const v = new Date(raw.slice(0, 10))
        if (!min || v < min) min = v
        if (!max || v > max) max = v
      }
    }
  }
  if (!min || !max) return null
  const padMin = new Date(min)
  padMin.setDate(padMin.getDate() - 14)
  const padMax = new Date(max)
  padMax.setDate(padMax.getDate() + 14)
  return { min: padMin, max: padMax }
}

export function isScheduleDelayed(s: DeliverySchedule): boolean {
  return !!(
    s.actual_end_date &&
    s.plan_end_date &&
    new Date(s.actual_end_date) > new Date(s.plan_end_date)
  )
}
