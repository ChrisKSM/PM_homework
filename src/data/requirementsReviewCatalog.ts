import type { OsType, ProductCategory } from '../types/requirementsReview'

export const POLARION_PRD_UI =
  'https://alm-lge-hlm.singlex.com/polarion/#/project/AVSWReqMgmt/workitems/PRD'

export const POLARION_QUERIES = {
  productCategory: `${POLARION_PRD_UI}?query=HAS_VALUE%3AproductCategory.KEY`,
  components: `${POLARION_PRD_UI}?query=HAS_VALUE%3Acomponents`,
  labels: `${POLARION_PRD_UI}?query=HAS_VALUE%3Alabels`,
  status: `${POLARION_PRD_UI}?query=HAS_VALUE%3Astatus`,
  owner: `${POLARION_PRD_UI}?query=HAS_VALUE%3Adev.KEY`,
  updatedToday: `${POLARION_PRD_UI}?query=HAS_VALUE%3Astatus%20AND%20updated%3A%24today%24`,
} as const

export const PRODUCT_CATEGORY_OPTIONS: { id: ProductCategory; label: string }[] = [
  { id: 'new-home-audio', label: '뉴홈오디오' },
  { id: 'soundbar', label: '사운드바' },
  { id: 'wireless-speaker', label: '무선스피커' },
  { id: 'wireless-headset', label: '무선헤드셋' },
]

/** 적용모델 — Polarion components 별칭 (주석) + PRD API `model` 파라미터 */
export const APPLIED_MODEL_OPTIONS: {
  id: string
  label: string
  apiModel: string
  categories: ProductCategory[]
  componentHint: string
}[] = [
  { id: 'H7', label: 'H7', apiModel: 'H7', categories: ['soundbar'], componentHint: 'SoundSuite_H7 · H7' },
  { id: 'H5', label: 'H5', apiModel: 'H5', categories: ['soundbar'], componentHint: 'SoundSuite_H5 · H5' },
  { id: 'H7_VI', label: 'H7_VI', apiModel: 'H7_VI', categories: ['soundbar'], componentHint: 'SoundSuite_H7(VI) · H7_VI' },
  { id: 'W7', label: 'W7', apiModel: 'W7', categories: ['soundbar'], componentHint: 'Sound Suite W7' },
  { id: 'W5', label: 'W5', apiModel: 'W5', categories: ['soundbar'], componentHint: 'Sound Suite W5' },
  { id: 'S90C', label: 'S90C', apiModel: 'S90C', categories: ['soundbar'], componentHint: 'S90C · S96CR · S94CR · S92CR' },
  { id: 'M7', label: 'M7', apiModel: 'M7', categories: ['soundbar'], componentHint: 'SoundSuite_M7' },
  { id: 'M5', label: 'M5', apiModel: 'M5', categories: ['soundbar'], componentHint: 'SoundSuite_M5' },
  { id: 'M7_VI', label: 'M7_VI', apiModel: 'M7_VI', categories: ['soundbar'], componentHint: 'SoundSuite_M7(VI) · M7 VI' },
  { id: 'M5_VI', label: 'M5_VI', apiModel: 'M5_VI', categories: ['soundbar'], componentHint: 'SoundSuite_M5(VI) · M5 VI' },
  { id: 'TV', label: 'TV', apiModel: 'TV', categories: ['new-home-audio'], componentHint: 'webOS_TV' },
]

export const OS_LABEL_OPTIONS: { id: OsType; label: string }[] = [
  { id: 'webOS', label: 'webOS' },
  { id: 'non-webOS', label: 'non-webOS' },
]

/** 자체 Labels — 적용 시점 (추후 Milvus) */
export const APPLIED_AT_OPTIONS = [
  'H7 MR9(10월)',
  'H7 MR10(11월)',
  'H7 MR11(27년 1월)',
  'H7_VI(Initial)',
] as const

export function appliedModelsForCategory(cat: ProductCategory | 'all') {
  if (cat === 'all') return APPLIED_MODEL_OPTIONS
  return APPLIED_MODEL_OPTIONS.filter((m) => m.categories.includes(cat))
}

export function resolveApiModel(appliedModelId: string): string {
  const hit = APPLIED_MODEL_OPTIONS.find((m) => m.id === appliedModelId)
  return hit?.apiModel ?? appliedModelId
}
