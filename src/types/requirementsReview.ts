export type OsType = 'webOS' | 'non-webOS'

export type ProductCategory =
  | 'soundbar'
  | 'new-home-audio'
  | 'wireless-headset'
  | 'wireless-speaker'

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  soundbar: '사운드바',
  'new-home-audio': '뉴홈오디오',
  'wireless-headset': '무선헤드셋',
  'wireless-speaker': '무선스피커',
}

export const OS_TYPE_LABELS: Record<OsType, string> = {
  webOS: 'webOS',
  'non-webOS': 'non-webOS',
}

/** ALM(Polarion)에서 읽어올 기본 행 — mock */
export interface RequirementsReviewPrdDetail {
  requestedReviewItems?: string
  requestReason?: string
  userValue?: string
  userFunctionDetail?: string
  operationDetail?: string
  comments?: string
}

export interface RequirementsReviewAlmRow {
  id: string
  title: string
  osType: OsType
  productCategory: ProductCategory
  appliedModel: string
  almStatus: string
  almQueryFragment: string
  polarionUrl?: string
  workflowStageId?: string
  workflowStageLabel?: string
  workflowOrder?: number
  updated?: string
  initiative?: string
  initiativeUrl?: string
  initiativeLinks?: { key: string; url: string; role?: string }[]
  deliveryDate?: string
  actionItem?: string
  detail?: RequirementsReviewPrdDetail
}

/** MongoDB overlay — 편집 가능 필드 (ALM 쓰기 권한 없음) */
export interface RequirementsReviewMongoOverlay {
  customLabels: string[]
  appliedAt: string
  devPeriod: string
  devOwner: string
  updatedAt: string
  updatedBy: string
}

export type RequirementsReviewRow = RequirementsReviewAlmRow & RequirementsReviewMongoOverlay

export type ApplyScope = 'product' | 'app' | 'tv'

export const APPLY_SCOPE_OPTIONS: { id: ApplyScope; label: string }[] = [
  { id: 'product', label: '제품' },
  { id: 'app', label: '앱' },
  { id: 'tv', label: 'TV' },
]

/** 요구사항별 적용 계획 — BE /model-status/prd/plans (Milvus requirements_review_plans) */
export interface RequirementsReviewPlan {
  prdId: string
  /** 적용 MR 월 YYYY-MM — 2027-01 → "27년 1월 MR" */
  applyMonth: string
  applyScopes: ApplyScope[]
  devTeam: string
  actionItem: string
  /** YYYY-MM-DD */
  dueDate: string
  updatedAt?: string
  updatedBy?: string
}

export type RequirementsReviewPlanInput = Omit<RequirementsReviewPlan, 'updatedAt'>

export interface RequirementsReviewPlansResponse {
  items: RequirementsReviewPlan[]
  meta: { collection: string; total: number }
}

export type RequirementsReviewSortKey = 'updated' | 'id' | 'title' | 'status'
