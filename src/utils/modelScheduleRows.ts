/** 모델 현황 row 정렬 · legacy DB 보정 */

export type TestCategory = '일반성능' | '호환성' | '안정성' | '시너지'
export type StatusType = '완료' | '검증제외' | '예정' | '진행중' | 'NG' | '지연'

export type BarType = 'planned' | 'inprogress' | 'event_ng' | 'event_ok' | 'event_done_est' | 'su_fota'

export interface ScheduleBar {
  start: string
  end: string
  type: BarType
  label?: string
}

export interface ModelRow {
  id: string
  category: string
  model: string
  event: string
  variant: string
  manufacturer: string
  soc: string
  staff: string
  testType: TestCategory
  changes: string
  status: StatusType
  bars: ScheduleBar[]
}

export const TEST_TYPES: TestCategory[] = ['일반성능', '호환성', '안정성', '시너지']
export const STATUS_LIST: StatusType[] = ['예정', '진행중', '지연', 'NG', '완료', '검증제외']

const CATEGORY_ORDER = [
  '사운드바(Wi-Fi)',
  '사운드바',
  '무선스피커(Bluetooth)',
  '파티스피커(Bluetooth)',
  '이어버드',
]

const BAR_TYPES: BarType[] = ['planned', 'inprogress', 'event_ng', 'event_ok', 'event_done_est', 'su_fota']
const TYPE_BY_LABEL: Record<string, BarType> = {
  '진행 예정': 'planned',
  '진행중': 'inprogress',
  'Event NG': 'event_ng',
  'Event OK': 'event_ok',
  'Event 완료 예상': 'event_done_est',
  'SU/FOTA 배포': 'su_fota',
}

function normDate(s: string): string {
  return String(s || '').slice(0, 10)
}

function normBarType(type: unknown): BarType | null {
  if (typeof type !== 'string') return null
  if (BAR_TYPES.includes(type as BarType)) return type as BarType
  return TYPE_BY_LABEL[type] ?? null
}

function normBar(raw: unknown): ScheduleBar | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const type = normBarType(b.type)
  const start = normDate(String(b.start ?? ''))
  if (!type || !start) return null
  const end = normDate(String(b.end ?? start)) || start
  return { start, end, type, label: typeof b.label === 'string' ? b.label : '' }
}

export function normRow(raw: unknown, index: number): ModelRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const testType = TEST_TYPES.includes(r.testType as TestCategory) ? (r.testType as TestCategory) : '일반성능'
  const status = STATUS_LIST.includes(r.status as StatusType) ? (r.status as StatusType) : '예정'
  return {
    id: String(r.id ?? r.row_id ?? `row-${index}-${Date.now()}`),
    category: String(r.category ?? ''),
    model: String(r.model ?? ''),
    event: String(r.event ?? ''),
    variant: String(r.variant ?? ''),
    manufacturer: String(r.manufacturer ?? ''),
    soc: String(r.soc ?? ''),
    staff: String(r.staff ?? ''),
    testType,
    changes: String(r.changes ?? ''),
    status,
    bars: (Array.isArray(r.bars) ? r.bars : []).map(normBar).filter((b): b is ScheduleBar => b !== null),
  }
}

export function normRows(rows: unknown[]): ModelRow[] {
  return rows.map((r, i) => normRow(r, i)).filter((r): r is ModelRow => r !== null)
}

/** 카테고리 표기 흔들림(Wi-FI 등) 정규화 — 정렬용 */
export function normalizeCategoryForSort(category: string): string {
  const compact = category.trim().replace(/\s+/g, '')
  if (/^사운드바\(wi.?fi\)$/i.test(compact)) return '사운드바(Wi-Fi)'
  if (/^무선스피커/i.test(compact) && /bluetooth/i.test(compact)) return '무선스피커(Bluetooth)'
  if (/^파티스피커/i.test(compact) && /bluetooth/i.test(compact)) return '파티스피커(Bluetooth)'
  return category.trim()
}

export function groupKey(r: ModelRow): string {
  return `${normalizeCategoryForSort(r.category)}|${r.model}|${r.event}`
}

/** DB에 H7×2가 같은 MR8차로 저장된 legacy 데이터 → Rollback 분리 */
export function repairLegacyRows(rows: ModelRow[]): ModelRow[] {
  const out = rows.map((r) => ({ ...r, bars: [...(r.bars ?? [])] }))
  const legacy = out.filter(
    (r) =>
      normalizeCategoryForSort(r.category) === '사운드바(Wi-Fi)' &&
      r.model === 'H7' &&
      (r.event === 'MR8차' || r.event === 'MR8'),
  )
  if (legacy.length !== 8) return out

  const byType = new Map<TestCategory, ModelRow[]>()
  for (const r of legacy) {
    const list = byType.get(r.testType) ?? []
    list.push(r)
    byType.set(r.testType, list)
  }
  if (!TEST_TYPES.every((tt) => (byType.get(tt)?.length ?? 0) === 2)) return out

  for (const tt of TEST_TYPES) {
    const pair = byType.get(tt)!
    const rollback =
      pair.find((r) => r.status === '예정' || r.status === '검증제외') ??
      pair.find((r) => !/MCC/.test(r.changes)) ??
      pair[1]
    const idx = out.findIndex((r) => r.id === rollback.id)
    if (idx >= 0) {
      out[idx] = { ...out[idx], event: 'MR8_Rollback', changes: '4. DTS:X 지원' }
    }
  }
  return out
}

export function sortModelRows(rows: ModelRow[]): ModelRow[] {
  const catIdx = (c: string) => {
    const n = normalizeCategoryForSort(c)
    const i = CATEGORY_ORDER.indexOf(n)
    return i >= 0 ? i : CATEGORY_ORDER.length
  }
  const ttIdx = (t: TestCategory) => TEST_TYPES.indexOf(t)
  return [...rows].sort((a, b) => {
    const byCat = catIdx(a.category) - catIdx(b.category)
    if (byCat !== 0) return byCat
    const byModel = a.model.localeCompare(b.model, 'ko')
    if (byModel !== 0) return byModel
    const byEvent = a.event.localeCompare(b.event, 'ko')
    if (byEvent !== 0) return byEvent
    return ttIdx(a.testType) - ttIdx(b.testType)
  })
}

export function prepareModelScheduleRows(raw: unknown[]): ModelRow[] {
  return sortModelRows(repairLegacyRows(normRows(raw)))
}

export function rowsNeedRepair(raw: unknown[]): boolean {
  const before = normRows(raw)
  const after = repairLegacyRows(before)
  return JSON.stringify(before.map((r) => ({ id: r.id, event: r.event, changes: r.changes }))) !==
    JSON.stringify(after.map((r) => ({ id: r.id, event: r.event, changes: r.changes })))
}
