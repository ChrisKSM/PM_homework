import type { OsType, ProductCategory } from '../types/requirementsReview'

export const POLARION_PRD_UI =
  'https://alm-lge-hlm.singlex.com/polarion/#/project/AVSWReqMgmt/workitems/PRD'

export const POLARION_AUDIO_DIVISION_QUERY = 'type:PRD AND division.KEY:6'

export const POLARION_QUERIES = {
  audioDivision: `${POLARION_PRD_UI}?query=${encodeURIComponent(POLARION_AUDIO_DIVISION_QUERY)}`,
  productCategory: `${POLARION_PRD_UI}?query=HAS_VALUE%3AproductCategory.KEY`,
  labels: `${POLARION_PRD_UI}?query=HAS_VALUE%3Alabels`,
  updatedToday: `${POLARION_PRD_UI}?query=HAS_VALUE%3Astatus%20AND%20updated%3A%24today%24`,
} as const

export const PRODUCT_CATEGORY_OPTIONS: { id: ProductCategory; label: string }[] = [
  { id: 'new-home-audio', label: '뉴홈오디오' },
  { id: 'soundbar', label: '사운드바' },
  { id: 'wireless-speaker', label: '무선스피커' },
  { id: 'wireless-headset', label: '무선헤드셋' },
]

/** 뉴홈오디오 — components `:` 뒤 검색 토큰 (BE 매핑과 동일) */
export const NEW_HOME_AUDIO_MODELS: { id: string; label: string; apiModel: string }[] = [
  { id: 'H7', label: 'H7', apiModel: 'H7' },
  { id: 'H5', label: 'H5', apiModel: 'H5' },
  { id: 'H7_VI', label: 'H7_VI', apiModel: 'H7_VI' },
  { id: 'W7', label: 'W7', apiModel: 'W7' },
  { id: 'W5', label: 'W5', apiModel: 'W5' },
  { id: 'S90C', label: 'S90C', apiModel: 'S90C' },
  { id: 'M7', label: 'M7', apiModel: 'M7' },
  { id: 'M5', label: 'M5', apiModel: 'M5' },
  { id: 'M7_VI', label: 'M7_VI', apiModel: 'M7_VI' },
  { id: 'M5_VI', label: 'M5_VI', apiModel: 'M5_VI' },
]

export const WIRELESS_SPEAKER_MODELS: { id: string; label: string; apiModel: string }[] = [
  { id: 'Grab', label: 'Grab', apiModel: 'Grab' },
  { id: 'Blast', label: 'Blast', apiModel: 'Blast' },
  { id: 'Stage301', label: 'Stage301', apiModel: 'Stage301' },
  { id: 'Stage501', label: 'Stage501', apiModel: 'Stage501' },
  { id: 'Bounce', label: 'Bounce', apiModel: 'Bounce' },
  { id: 'Power9000', label: 'Power9000', apiModel: 'Power9000' },
  { id: 'Power7000', label: 'Power7000', apiModel: 'Power7000' },
  { id: 'Power5000', label: 'Power5000', apiModel: 'Power5000' },
]

export const OS_LABEL_OPTIONS: { id: OsType; label: string }[] = [
  { id: 'webOS', label: 'webOS' },
  { id: 'non-webOS', label: 'non-webOS' },
]

export type CategoryScope = ProductCategory | 'all'

export function subModelOptionsForCategory(cat: CategoryScope) {
  if (cat === 'new-home-audio') return NEW_HOME_AUDIO_MODELS
  if (cat === 'wireless-speaker') return WIRELESS_SPEAKER_MODELS
  return []
}

export function categoryHasSubModels(cat: CategoryScope): boolean {
  return subModelOptionsForCategory(cat).length > 0
}

/** BE `/model-status/prd?model=` 파라미터 */
export function resolveRequirementsReviewApiModel(
  category: CategoryScope,
  subModelId: string
): string {
  if (category === 'all') return 'REQ_AUDIO'
  if (category === 'soundbar') return 'S80C'
  if (category === 'wireless-headset') return 'REQ_WIRELESS_HEADSET'
  if (category === 'new-home-audio') {
    if (subModelId === 'all') return 'REQ_NEW_HOME_AUDIO'
    const hit = NEW_HOME_AUDIO_MODELS.find((m) => m.id === subModelId)
    return hit?.apiModel ?? subModelId
  }
  if (category === 'wireless-speaker') {
    if (subModelId === 'all') return 'REQ_WIRELESS_SPEAKER'
    const hit = WIRELESS_SPEAKER_MODELS.find((m) => m.id === subModelId)
    return hit?.apiModel ?? subModelId
  }
  return 'REQ_AUDIO'
}
