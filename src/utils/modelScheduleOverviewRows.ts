import type {
  OverviewBarType,
  OverviewDisplayRow,
  OverviewEvent,
  OverviewModel,
  OverviewScheduleBar,
} from '../types/modelScheduleOverview'

/** 전 모델 일정 카테고리 정렬 — 검증 일정 상세와 동일 순서 (파티 → 무선) */
const OVERVIEW_CATEGORY_ORDER = [
  '사운드바(Wi-Fi)',
  '사운드바',
  '파티스피커(Bluetooth)',
  '파티스피커',
  '무선스피커(Bluetooth)',
  '무선스피커',
  '이어버드',
]

export function normalizeOverviewCategory(category: string): string {
  const compact = category.trim().replace(/\s+/g, '')
  if (/^사운드바\(wi.?fi\)$/i.test(compact)) return '사운드바(Wi-Fi)'
  if (/^사운드바$/i.test(compact)) return '사운드바'
  if (/^파티스피커/i.test(compact)) return '파티스피커'
  if (/^무선스피커/i.test(compact)) return '무선스피커'
  return category.trim()
}

export function sortOverviewModels(models: OverviewModel[]): OverviewModel[] {
  const catIdx = (c: string) => {
    const n = normalizeOverviewCategory(c)
    const i = OVERVIEW_CATEGORY_ORDER.indexOf(n)
    return i >= 0 ? i : OVERVIEW_CATEGORY_ORDER.length
  }
  return [...models].sort((a, b) => {
    const byCat = catIdx(a.category) - catIdx(b.category)
    if (byCat !== 0) return byCat
    return a.model.localeCompare(b.model, 'ko')
  })
}

export function prepareOverviewModels(models: OverviewModel[]): OverviewModel[] {
  return sortOverviewModels(
    models.map((m) => ({
      ...m,
      events: (m.events ?? []).map((e) => ({
        ...e,
        start: String(e.start ?? '').slice(0, 10),
        end: String(e.end ?? e.start ?? '').slice(0, 10),
      })),
    })),
  )
}

export function isMrMinorVariant(variant: string): boolean {
  const v = variant.replace(/\s+/g, '_').toLowerCase()
  return v.includes('mr_minor') || v.includes('mrminor')
}

export function inferBarType(eventName: string): OverviewBarType {
  const n = eventName.toLowerCase().replace(/\s+/g, '')
  if (n.includes('sit')) return 'sit'
  if (n.includes('devtest') || n.includes('dev')) return 'dev_test'
  if (n.startsWith('fc')) return 'fc'
  if (n.includes('prepv')) return 'prepv'
  if (n.startsWith('pv')) return 'pv'
  if (n === 'mp' || n.includes('mpapproval')) return 'mp'
  if (n.includes('preqp')) return 'preqp'
  if (n.startsWith('qp')) return 'qp'
  if (n.includes('su')) return 'su'
  return 'default'
}

export function eventsToBars(events: OverviewEvent[] | null | undefined): OverviewScheduleBar[] {
  return (events ?? []).map((e) => ({
    start: e.start.slice(0, 10),
    end: (e.end || e.start).slice(0, 10),
    label: e.name,
    barType: e.barType ?? inferBarType(e.name),
  }))
}

export function overviewGroupKey(row: Pick<OverviewDisplayRow, 'category' | 'model'>): string {
  return `${row.category}|${row.model}`
}

/** 모델 → 표시 행 (MR_Minor 1행 / 그 외 2행, 바는 showTimeline=true 행) */
export function expandOverviewToDisplayRows(models: OverviewModel[]): OverviewDisplayRow[] {
  const out: OverviewDisplayRow[] = []

  for (const m of models) {
    const bars = eventsToBars(m.events)
    const mrMinor = isMrMinorVariant(m.variant)
    const base = {
      modelId: m.id,
      category: m.category,
      model: m.model,
      variant: m.variant,
      manufacturer: m.manufacturer,
      soc: m.soc,
      hwPm: m.hwPm,
      swPo: m.swPo,
      swPm: m.swPm,
      spec: m.spec,
      pv: m.pv,
      mp: m.mp,
      ats: m.ats,
      isMrMinor: mrMinor,
    }

    if (mrMinor) {
      out.push({
        ...base,
        id: `${m.id}-L0`,
        lineIndex: 0,
        bars,
        showTimeline: true,
      })
    } else {
      out.push({
        ...base,
        id: `${m.id}-L0`,
        lineIndex: 0,
        bars: [],
        showTimeline: false,
      })
      out.push({
        ...base,
        id: `${m.id}-L1`,
        lineIndex: 1,
        bars,
        showTimeline: true,
      })
    }
  }

  return out
}

export interface MergeCell {
  rowSpan: number
  hidden: boolean
}

export function calcOverviewMerge(
  rows: OverviewDisplayRow[],
  keyFn: (r: OverviewDisplayRow) => string,
): MergeCell[] {
  const res: MergeCell[] = rows.map(() => ({ rowSpan: 1, hidden: false }))
  let i = 0
  while (i < rows.length) {
    const k = keyFn(rows[i])
    let j = i + 1
    while (j < rows.length && keyFn(rows[j]) === k && k) j++
    res[i].rowSpan = j - i
    for (let x = i + 1; x < j; x++) res[x].hidden = true
    i = j
  }
  return res
}
