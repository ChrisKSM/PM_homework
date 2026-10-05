import type {
  OverviewBarType,
  OverviewDisplayRow,
  OverviewEvent,
  OverviewEventKind,
  OverviewModel,
  OverviewScheduleBar,
} from '../types/modelScheduleOverview'

/** 제품군 정렬 — 첨부 스프레드시트 순서 */
const OVERVIEW_CATEGORY_ORDER = [
  'Sound Suite',
  '사운드바(Wi-Fi)',
  '사운드바(BT)',
  '사운드바',
  'Accessory',
  '파티스피커(Bluetooth)',
  '파티스피커',
  '무선스피커(Bluetooth)',
  '무선스피커',
  '이어버드',
]

/** Sound Suite 7모델 — H7_VI부터 첨부 스프레드시트 순서 */
const SOUND_SUITE_MODEL_ORDER = [
  'H7_VI',
  'H5',
  'M7_VI',
  'M5_VI',
  'W5',
  'H7 MR10(11월)',
  'M7/W7 MR9(11월)',
]

export function normalizeOverviewCategory(category: string): string {
  const c = (category || '').replace(/\n/g, ' ').trim()
  const compact = c.replace(/\s+/g, '')
  if (/사운드스위트|soundsuite/i.test(compact)) return 'Sound Suite'
  if (/^사운드바\(wi.?fi\)$/i.test(compact)) return '사운드바(Wi-Fi)'
  if (/^사운드바\(bt\)$/i.test(compact)) return '사운드바(BT)'
  if (/^사운드바$/i.test(compact)) return '사운드바'
  if (/^accessory$/i.test(compact)) return 'Accessory'
  if (/^파티스피커/i.test(compact)) return '파티스피커'
  if (/^무선스피커/i.test(compact)) return '무선스피커'
  return c
}

export function sortOverviewModels(models: OverviewModel[]): OverviewModel[] {
  const catIdx = (c: string) => {
    const n = normalizeOverviewCategory(c)
    const i = OVERVIEW_CATEGORY_ORDER.indexOf(n)
    return i >= 0 ? i : OVERVIEW_CATEGORY_ORDER.length
  }
  const soundSuiteIdx = (model: string) => {
    const i = SOUND_SUITE_MODEL_ORDER.indexOf(model.trim())
    return i >= 0 ? i : SOUND_SUITE_MODEL_ORDER.length
  }
  return [...models].sort((a, b) => {
    const byCat = catIdx(a.category) - catIdx(b.category)
    if (byCat !== 0) return byCat
    if (normalizeOverviewCategory(a.category) === 'Sound Suite') {
      return soundSuiteIdx(a.model) - soundSuiteIdx(b.model)
    }
    const byVariant = a.variant.localeCompare(b.variant, 'ko')
    if (byVariant !== 0) return byVariant
    return a.model.localeCompare(b.model, 'ko')
  })
}

export function isBlankEventValue(v: string | undefined | null): boolean {
  const s = String(v ?? '').trim()
  return !s || s === '-' || s === 'NA' || s === 'N/A'
}

export function isValidOverviewEvent(e: OverviewEvent | null | undefined): boolean {
  if (!e || isBlankEventValue(e.name)) return false
  return !isBlankEventValue(e.start)
}

export function isHwEventName(name: string): boolean {
  const n = name.toLowerCase().replace(/\s+/g, '')
  if (n.includes('prepv')) return true
  if (/^pv\d?$/.test(n) || n.startsWith('pv')) return true
  if (n === 'mp' || n.includes('mpapproval')) return true
  if (n === 'ats') return true
  return false
}

export function classifyEventKind(name: string, explicit?: OverviewEventKind): OverviewEventKind {
  if (explicit === 'hw' || explicit === 'sw') return explicit
  return isHwEventName(name) ? 'hw' : 'sw'
}

export function inferBarType(eventName: string): OverviewBarType {
  const n = eventName.toLowerCase().replace(/\s+/g, '')
  if (n.includes('sit')) return 'sit'
  if (n.includes('devtest') || (n.includes('dev') && n.includes('test'))) return 'dev_test'
  if (n.startsWith('fc')) return 'fc'
  if (n.includes('prepv')) return 'prepv'
  if (n.startsWith('pv')) return 'pv'
  if (n === 'mp' || n.includes('mpapproval')) return 'mp'
  if (n.includes('preqp') || n.includes('preqp')) return 'preqp'
  if (n.startsWith('qp')) return 'qp'
  if (n.includes('su')) return 'su'
  if (n === 'ats') return 'ats'
  return 'default'
}

export function eventsToBars(
  events: OverviewEvent[] | null | undefined,
  kindFilter?: OverviewEventKind,
): OverviewScheduleBar[] {
  return (events ?? [])
    .filter(isValidOverviewEvent)
    .map((e) => {
      const kind = classifyEventKind(e.name, e.kind)
      return {
        start: e.start.slice(0, 10),
        end: (e.end || e.start).slice(0, 10),
        label: e.name.trim(),
        barType: e.barType ?? inferBarType(e.name),
        kind,
      }
    })
    .filter((b) => !kindFilter || b.kind === kindFilter)
}

export function prepareOverviewModels(models: OverviewModel[]): OverviewModel[] {
  return sortOverviewModels(
    models.map((m) => ({
      ...m,
      category: normalizeOverviewCategory(m.category),
      events: (m.events ?? [])
        .filter(isValidOverviewEvent)
        .map((e) => ({
          ...e,
          name: e.name.trim(),
          start: String(e.start ?? '').slice(0, 10),
          end: String(e.end ?? e.start ?? '').slice(0, 10),
          kind: classifyEventKind(e.name, e.kind),
        })),
    })),
  )
}

export function isMrMinorVariant(variant: string): boolean {
  const v = variant.replace(/\s+/g, '_').toLowerCase()
  return v.includes('mr_minor') || v.includes('mrminor')
}

export function overviewGroupKey(row: Pick<OverviewDisplayRow, 'category' | 'model'>): string {
  return `${normalizeOverviewCategory(row.category)}|${row.model}`
}

export function overviewCategoryKey(row: Pick<OverviewDisplayRow, 'category'>): string {
  return normalizeOverviewCategory(row.category)
}

/** 모델 → 표시 행: 1행=HW 타임라인, 2행=SW 타임라인 (MR_Minor는 SW 1행) */
export function expandOverviewToDisplayRows(models: OverviewModel[]): OverviewDisplayRow[] {
  const out: OverviewDisplayRow[] = []

  for (const m of models) {
    const hwBars = eventsToBars(m.events, 'hw')
    const swBars = eventsToBars(m.events, 'sw')
    const mrMinor = isMrMinorVariant(m.variant)
    const base = {
      modelId: m.id,
      category: normalizeOverviewCategory(m.category),
      model: m.model.trim(),
      variant: m.variant,
      soc: m.soc,
      swPm: m.swPm || m.swPo || m.hwPm || '',
      spec: m.spec,
      pv: isBlankEventValue(m.pv) ? '' : m.pv,
      mp: isBlankEventValue(m.mp) ? '' : m.mp,
      isMrMinor: mrMinor,
    }

    if (mrMinor) {
      out.push({
        ...base,
        id: `${m.id}-sw`,
        lineIndex: 0,
        bars: swBars,
        timelineKind: 'sw',
      })
    } else {
      out.push({
        ...base,
        id: `${m.id}-hw`,
        lineIndex: 0,
        bars: hwBars,
        timelineKind: 'hw',
      })
      out.push({
        ...base,
        id: `${m.id}-sw`,
        lineIndex: 1,
        bars: swBars,
        timelineKind: 'sw',
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

/** A~H 메타 8열 */
export const OVERVIEW_META_COLUMNS = [
  { key: 'category' as const, label: '제품군', minW: 96 },
  { key: 'model' as const, label: '모델명', minW: 72 },
  { key: 'variant' as const, label: '개발등급', minW: 88 },
  { key: 'soc' as const, label: 'SoC', minW: 72 },
  { key: 'swPm' as const, label: 'SW', minW: 88 },
  { key: 'spec' as const, label: '스펙', minW: 160 },
  { key: 'pv' as const, label: 'PV', minW: 72 },
  { key: 'mp' as const, label: 'MP', minW: 72 },
]

export type OverviewMetaKey = (typeof OVERVIEW_META_COLUMNS)[number]['key']
