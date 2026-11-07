import { MODEL_STATUS_PRODUCT_GROUPS } from '../data/modelStatusCatalog'
import type { ModelStatusPrdItem } from '../types/modelStatusPrd'
import type {
  OsType,
  ProductCategory,
  RequirementsReviewMongoOverlay,
  RequirementsReviewRow,
} from '../types/requirementsReview'
import { DEFAULT_MONGO_OVERLAY } from '../data/requirementsReviewMock'

const SOUND_SUITE = new Set(['H7_VI', 'H5', 'M7_VI', 'M5_VI', 'W5'])
const WIFI_SB = new Set(['S90C'])
const BT_SB = new Set(['S80C', 'CB-SH'])

function inferProductCategory(modelCode: string, applyModel: string): ProductCategory {
  const key = (applyModel || modelCode || '').trim().toUpperCase()
  if (WIFI_SB.has(key) || key.includes('S90')) return 'soundbar'
  if (BT_SB.has(key) || key.includes('S80')) return 'soundbar'
  if (SOUND_SUITE.has(key) || key.includes('H7') || key.includes('M7')) return 'soundbar'
  if (key.includes('TONE') || key.includes('HEADSET')) return 'wireless-headset'
  if (key.includes('XBOOM') || key.includes('PARTY')) return 'wireless-speaker'
  if (key.includes('M5') || key.includes('W5')) return 'new-home-audio'
  return 'soundbar'
}

function inferOsType(item: ModelStatusPrdItem): OsType {
  const blob = [...(item.almLabels || []), item.title, item.applyModel].join(' ').toLowerCase()
  if (blob.includes('webos')) return 'webOS'
  return 'non-webOS'
}

function splitReviewLabels(reviewLabel: string | undefined): string[] {
  return (reviewLabel || '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function listRequirementsReviewModelCodes(): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const g of MODEL_STATUS_PRODUCT_GROUPS) {
    for (const m of g.models) {
      if (!seen.has(m)) {
        seen.add(m)
        out.push(m)
      }
    }
  }
  return out
}

export function mapPrdItemToReviewRow(
  item: ModelStatusPrdItem,
  modelCode: string,
  overlay: Partial<RequirementsReviewMongoOverlay> | undefined,
  almQueryFragment: string
): RequirementsReviewRow {
  const applied = (item.applyModel || modelCode || '').trim() || modelCode
  const base: RequirementsReviewMongoOverlay = {
    ...DEFAULT_MONGO_OVERLAY,
    customLabels: splitReviewLabels(item.reviewLabel),
    ...overlay,
    customLabels:
      overlay?.customLabels && overlay.customLabels.length > 0
        ? overlay.customLabels
        : splitReviewLabels(item.reviewLabel),
  }
  return {
    id: item.id,
    title: item.title,
    osType: inferOsType(item),
    productCategory: inferProductCategory(modelCode, applied),
    appliedModel: applied,
    almStatus: item.status || item.workflowStageLabel || '—',
    almQueryFragment,
    polarionUrl: item.polarionUrl,
    ...base,
  }
}
