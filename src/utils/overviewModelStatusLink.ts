import { MODEL_STATUS_PRODUCT_GROUPS } from '../data/modelStatusCatalog'
import { canonicalModelName } from './modelScheduleRows'
import { normalizeOverviewCategory } from './modelScheduleOverviewRows'

/** overview 모델명 → 모델현황 URL (query: group, model) */
export function buildModelStatusUrl(model: string, category?: string): string {
  const display = String(model ?? '').trim()
  if (!display) return '/model-schedule/status'

  const canon = canonicalModelName(display)
  const normCat = category ? normalizeOverviewCategory(category) : ''

  let groupId: string | undefined
  for (const g of MODEL_STATUS_PRODUCT_GROUPS) {
    if (g.models.some((m) => canonicalModelName(m) === canon)) {
      groupId = g.id
      break
    }
  }
  if (!groupId && normCat) {
    const g = MODEL_STATUS_PRODUCT_GROUPS.find((x) => x.overviewCategory === normCat)
    if (g) groupId = g.id
  }

  const code = display.includes('/') || display.includes('(')
    ? display.replace(/\s+/g, '_')
    : canon.replace(/\s+/g, '_')

  const params = new URLSearchParams()
  params.set('model', code)
  if (groupId) params.set('group', groupId)
  return `/model-schedule/status?${params.toString()}`
}
