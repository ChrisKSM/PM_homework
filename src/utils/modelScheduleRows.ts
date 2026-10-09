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

/** 검증 상세 Excel — 사운드스위트(Wi-Fi) 블록 (사운드바 H7 MR8 등과 별도 그룹) */
export const SOUND_SUITE_WIFI_CATEGORY = '사운드스위트(Wi-Fi)'

const SOUND_SUITE_DETAIL_GROUPS: Array<{
  model: string
  event: string
  copyFrom?: { model: string; event: string }
  defaults?: Partial<Pick<ModelRow, 'variant' | 'manufacturer' | 'soc' | 'staff' | 'changes'>>
}> = [
  { model: 'H7', event: 'MR9차', copyFrom: { model: 'H7', event: 'MR8차' } },
  { model: 'W7', event: 'MR6차', copyFrom: { model: 'W7', event: 'MR5차' } },
  { model: 'M7/M5', event: 'MR9차', copyFrom: { model: 'M7/M5', event: 'MR8차' } },
  {
    model: 'H7_VI',
    event: '개발모델',
    defaults: {
      variant: 'JDM B_HW',
      manufacturer: 'Tymphany',
      soc: 'ax26sb',
      staff: '조성연',
      changes: '500W, 5.1.3 (9.1.6 Spatial) Dolby Atmos, DAFC',
    },
  },
]

const CATEGORY_ORDER = [
  '사운드스위트(Wi-Fi)',
  '사운드바(Wi-Fi)',
  '사운드바',
  '파티스피커(Bluetooth)',
  '파티스피커',
  '무선스피커(Bluetooth)',
  '무선스피커',
  '이어버드',
]

/** UI — 카테고리별 「모델 추가」 (mockup: 스위트 / Wi-Fi 사운드바 / 사운드바 분리) */
export const VERIFICATION_ADD_GROUPS = [
  '사운드스위트(Wi-Fi)',
  '사운드바(Wi-Fi)',
  '사운드바',
  '파티스피커',
  '무선스피커',
  '이어버드',
] as const

export type VerificationAddGroup = (typeof VERIFICATION_ADD_GROUPS)[number]

const ADD_GROUP_DEFAULT_CATEGORY: Record<VerificationAddGroup, string> = {
  '사운드스위트(Wi-Fi)': '사운드스위트(Wi-Fi)',
  '사운드바(Wi-Fi)': '사운드바(Wi-Fi)',
  '사운드바': '사운드바',
  '파티스피커': '파티스피커(Bluetooth)',
  '무선스피커': '무선스피커(Bluetooth)',
  '이어버드': '이어버드',
}

export function categoryAddGroup(category: string): VerificationAddGroup | string {
  const n = normalizeCategoryForSort(category)
  if (n === '사운드스위트(Wi-Fi)' || /사운드스위트/i.test(n)) return '사운드스위트(Wi-Fi)'
  if (n === '사운드바(Wi-Fi)') return '사운드바(Wi-Fi)'
  if (n === '사운드바') return '사운드바'
  if (/^사운드바/i.test(n)) return '사운드바(Wi-Fi)'
  if (/파티/i.test(n)) return '파티스피커'
  if (/무선/i.test(n)) return '무선스피커'
  if (/이어버드/i.test(n)) return '이어버드'
  return canonicalCategory(category)
}

export function defaultCategoryForAddGroup(group: VerificationAddGroup): string {
  return ADD_GROUP_DEFAULT_CATEGORY[group]
}

export function insertIndexForAddGroup(rows: ModelRow[], group: VerificationAddGroup): number {
  const g = (c: string) => categoryAddGroup(c)
  let lastIdx = -1
  for (let i = 0; i < rows.length; i++) {
    if (g(rows[i].category) === group) lastIdx = i
  }
  if (lastIdx >= 0) return lastIdx + 1

  const order = [...VERIFICATION_ADD_GROUPS]
  const want = order.indexOf(group)
  for (let i = 0; i < rows.length; i++) {
    const og = order.indexOf(g(rows[i].category) as VerificationAddGroup)
    if (og >= 0 && og > want) return i
  }
  return rows.length
}

const BAR_TYPES: BarType[] = ['planned', 'inprogress', 'event_ng', 'event_ok', 'event_done_est', 'su_fota']
const TYPE_BY_LABEL: Record<string, BarType> = {
  '진행 예정': 'planned',
  '진행중': 'inprogress',
  'Event NG': 'event_ng',
  'Event OK': 'event_ok',
  'Event 완료 예상': 'event_done_est',
  'SU/FOTA 배포': 'su_fota',
}

/** Excel/DB 표기 (H7 VI, H7VI) → H7_VI */
export function canonicalModelName(model: string): string {
  let m = String(model ?? '').trim()
  if (!m) return m
  if (/^H7[\s_]*VI$/i.test(m.replace(/\s+/g, ' '))) return 'H7_VI'
  if (/S9STR/i.test(m)) return 'LG Soundbar 앱 S95TR'
  return m
}

function modelsMatch(a: string, b: string): boolean {
  return canonicalModelName(a) === canonicalModelName(b)
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
    model: canonicalModelName(String(r.model ?? '')),
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
export function canonicalCategory(category: string): string {
  const raw = String(category ?? '').trim()
  const compact = raw.replace(/\s+/g, '')

  if (/사운드스위트|soundsuite/i.test(compact)) return '사운드스위트(Wi-Fi)'
  if (/^사운드바\(wi.?fi\)$/i.test(compact)) return '사운드바(Wi-Fi)'
  if (/^사운드바$/i.test(compact) || (raw.includes('사운드바') && !/wi.?fi/i.test(compact))) return '사운드바'
  if (/파티스피커/i.test(raw)) return '파티스피커(Bluetooth)'
  if (/무선스피커/i.test(raw)) return '무선스피커(Bluetooth)'
  if (/이어버드/i.test(raw)) return '이어버드'

  return raw
}

export function normalizeCategoryForSort(category: string): string {
  return canonicalCategory(category)
}

/** 동일 카테고리 표기(이어버드 등) 통일 */
export function unifyCategoryLabels(rows: ModelRow[]): ModelRow[] {
  return rows.map((r) => ({ ...r, category: canonicalCategory(r.category) }))
}

/** 4구분 모두 완료 또는 검증제외만 */
export function isModelGroupSettled(data: ModelRow[], model: string, cat: string, event: string): boolean {
  const group = data.filter(
    (r) => r.model === model && normalizeCategoryForSort(r.category) === normalizeCategoryForSort(cat) && r.event === event,
  )
  if (group.length < 4) return false
  return group.every((r) => r.status === '완료' || r.status === '검증제외')
}

export function groupKey(r: ModelRow): string {
  return `${normalizeCategoryForSort(r.category)}|${r.model}|${r.event}`
}

/** DB에 H7×2가 같은 MR8차로 저장된 legacy 데이터 → Rollback 분리 */

/** UI 표시 — H7_VI → H7 VI */
export function displayModelName(model: string): string {
  const m = canonicalModelName(model)
  if (m === 'H7_VI') return 'H7 VI'
  return m
}

/** SW검증현황 — 사운드스위트 4모델(H7 MR9, W7 MR6, M7/M5 MR9, H7_VI 개발모델) 보장 */
export function ensureSoundSuiteDetailRows(rows: ModelRow[]): ModelRow[] {
  const out = rows.map((r) => ({
    ...r,
    model: canonicalModelName(r.model),
    bars: [...(r.bars ?? [])],
  }))
  const cat = SOUND_SUITE_WIFI_CATEGORY

  for (const spec of SOUND_SUITE_DETAIL_GROUPS) {
    const existing = out.filter(
      (r) =>
        modelsMatch(r.model, spec.model) &&
        r.event === spec.event &&
        normalizeCategoryForSort(r.category) === cat,
    )
    if (existing.length >= 4) continue

    for (const r of out) {
      if (modelsMatch(r.model, spec.model) && r.event === spec.event) {
        r.model = canonicalModelName(spec.model)
        r.category = cat
      }
    }

    const again = out.filter(
      (r) =>
        modelsMatch(r.model, spec.model) &&
        r.event === spec.event &&
        normalizeCategoryForSort(r.category) === cat,
    )
    if (again.length >= 4) continue

    let template: ModelRow | undefined
    if (spec.copyFrom) {
      template = out.find(
        (r) => modelsMatch(r.model, spec.copyFrom!.model) && r.event === spec.copyFrom!.event,
      )
    }
    const base = template ?? out.find((r) => modelsMatch(r.model, spec.model))
    const d = spec.defaults ?? {}
    const ts = Date.now()
    for (let i = 0; i < TEST_TYPES.length; i++) {
      const tt = TEST_TYPES[i]
      const id = `ms-${spec.model}-${spec.event}-${tt}`.replace(/[^a-zA-Z0-9가-힣-]+/g, '-').toLowerCase()
      if (out.some((r) => r.id === id)) continue
      out.push({
        id,
        category: cat,
        model: spec.model,
        event: spec.event,
        variant: d.variant ?? base?.variant ?? '',
        manufacturer: d.manufacturer ?? base?.manufacturer ?? '',
        soc: d.soc ?? base?.soc ?? '',
        staff: d.staff ?? base?.staff ?? '',
        testType: tt,
        changes: tt === '일반성능' ? (d.changes ?? base?.changes ?? '') : '',
        status: '예정',
        bars: tt === '일반성능' && template?.bars?.length ? [...template.bars] : [],
      })
    }
  }

  return out
}

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

/** 첨부 mockup — 사운드스위트(Wi-Fi) 모델 순서 */
const SOUND_SUITE_MODEL_ORDER = ['H7', 'W7', 'M7/M5', 'H7_VI']

/** 첨부 mockup — 사운드바(plain) 모델 순서 */
const SOUNDBAR_PLAIN_MODEL_ORDER = ['S80C', 'Connect Box', 'LG Soundbar 앱 S95TR']

function modelOrderIndex(category: string, model: string): number | null {
  const cat = normalizeCategoryForSort(category)
  const m = canonicalModelName(model)
  if (cat === SOUND_SUITE_WIFI_CATEGORY) {
    const i = SOUND_SUITE_MODEL_ORDER.indexOf(m)
    return i >= 0 ? i : SOUND_SUITE_MODEL_ORDER.length
  }
  if (cat === '사운드바') {
    const i = SOUNDBAR_PLAIN_MODEL_ORDER.indexOf(m)
    return i >= 0 ? i : SOUNDBAR_PLAIN_MODEL_ORDER.length
  }
  return null
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
    const oa = modelOrderIndex(a.category, a.model)
    const ob = modelOrderIndex(b.category, b.model)
    if (oa !== null && ob !== null && oa !== ob) return oa - ob
    const byModel = a.model.localeCompare(b.model, 'ko')
    if (byModel !== 0) return byModel
    const byEvent = a.event.localeCompare(b.event, 'ko')
    if (byEvent !== 0) return byEvent
    return ttIdx(a.testType) - ttIdx(b.testType)
  })
}

export function prepareModelScheduleRows(raw: unknown[]): ModelRow[] {
  return sortModelRows(
    unifyCategoryLabels(ensureSoundSuiteDetailRows(repairLegacyRows(normRows(raw)))),
  )
}

export function rowsNeedRepair(raw: unknown[]): boolean {
  const before = sortModelRows(unifyCategoryLabels(repairLegacyRows(normRows(raw))))
  const after = prepareModelScheduleRows(raw)
  const sig = (list: ModelRow[]) =>
    JSON.stringify(
      list.map((r) => ({
        id: r.id,
        category: r.category,
        model: r.model,
        event: r.event,
        changes: r.changes,
      })),
    )
  return sig(before) !== sig(after)
}
