import type { OsType, ProductCategory } from '../types/requirementsReview'
import { PRODUCT_CATEGORY_OPTIONS } from '../data/requirementsReviewCatalog'
import { PRODUCT_CATEGORY_LABELS } from '../types/requirementsReview'

export type RequirementsReviewQueryInput = {
  productCategory: ProductCategory | 'all'
  appliedModelId: string
  osType: OsType | 'all'
  winningQuery?: string | null
}

export function buildRequirementsReviewQueryPreview(input: RequirementsReviewQueryInput): string {
  if (input.winningQuery) {
    const parts = [input.winningQuery]
    if (input.productCategory !== 'all') {
      parts.push(`/* UI: productCategory=${PRODUCT_CATEGORY_LABELS[input.productCategory]} */`)
    }
    if (input.appliedModelId !== 'all') {
      parts.push(`/* UI: components≈${input.appliedModelId} */`)
    }
    if (input.osType !== 'all') {
      parts.push(`/* UI: labels≈${input.osType} */`)
    }
    return parts.join(' ')
  }
  const chunks = ['type:PRD']
  if (input.productCategory !== 'all') {
    const ko = PRODUCT_CATEGORY_OPTIONS.find((c) => c.id === input.productCategory)?.label
    if (ko) chunks.push(`productCategory.KEY:${ko}`)
  }
  if (input.appliedModelId !== 'all') {
    chunks.push(`components:(${input.appliedModelId})`)
  }
  if (input.osType !== 'all') {
    chunks.push(`labels:(${input.osType})`)
  }
  return chunks.join(' AND ')
}
