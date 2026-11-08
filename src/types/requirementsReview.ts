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

export type RequirementsReviewSortKey = 'updated' | 'id' | 'title' | 'status'
