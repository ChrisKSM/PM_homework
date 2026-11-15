import type { OsType } from '../types/requirementsReview'
import {
  CategoryScope,
  POLARION_AUDIO_DIVISION_QUERY,
  PRODUCT_CATEGORY_OPTIONS,
  NEW_HOME_AUDIO_MODELS,
  WIRELESS_SPEAKER_MODELS,
} from '../data/requirementsReviewCatalog'
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from '../types/requirementsReview'

export type RequirementsReviewQueryInput = {
  category: CategoryScope
  subModelId: string
  osType: OsType | 'all'
  winningQuery?: string | null
}

function productCategoryLucene(cat: ProductCategory): string {
  const ko = PRODUCT_CATEGORY_OPTIONS.find((c) => c.id === cat)?.label ?? PRODUCT_CATEGORY_LABELS[cat]
  return `productCategory.KEY:${ko}`
}

export function buildRequirementsReviewQueryPreview(input: RequirementsReviewQueryInput): string {
  if (input.winningQuery) {
    const tail: string[] = []
    if (input.osType !== 'all') tail.push(`labels:(${input.osType})`)
    return [input.winningQuery, ...tail].filter(Boolean).join(' AND ')
  }

  if (input.category === 'all') {
    const q = POLARION_AUDIO_DIVISION_QUERY // type:PRD AND division.KEY:6
    return input.osType === 'all' ? q : `${q} AND labels:(${input.osType})`
  }

  if (input.category === 'soundbar') {
    const q = 'components:(S80C)'
    return input.osType === 'all' ? q : `${q} AND labels:(${input.osType})`
  }

  if (input.category === 'wireless-headset') {
    const q = productCategoryLucene('wireless-headset')
    return input.osType === 'all' ? q : `${q} AND labels:(${input.osType})`
  }

  if (input.category === 'new-home-audio') {
    if (input.subModelId === 'all') {
      const q = productCategoryLucene('new-home-audio')
      return input.osType === 'all' ? q : `${q} AND labels:(${input.osType})`
    }
    const m = NEW_HOME_AUDIO_MODELS.find((x) => x.id === input.subModelId)
    const q = `components:(${m?.id ?? input.subModelId})`
    return input.osType === 'all' ? q : `${q} AND labels:(${input.osType})`
  }

  if (input.category === 'wireless-speaker') {
    if (input.subModelId === 'all') {
      const tokens = WIRELESS_SPEAKER_MODELS.map((m) => m.id).join(' ')
      const q = `components:(${tokens})`
      return input.osType === 'all' ? q : `${q} AND labels:(${input.osType})`
    }
    const q = `components:(${input.subModelId})`
    return input.osType === 'all' ? q : `${q} AND labels:(${input.osType})`
  }

  return 'type:PRD'
}
