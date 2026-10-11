/** 모델현황 — 제품군 · 하위 모델 (overview / 검증 일정과 매칭) */

export type ModelStatusProductGroupId =
  | 'sound-suite'
  | 'wifi-soundbar'
  | 'bt-soundbar'
  | 'party-speaker'
  | 'wireless-speaker'

export interface ModelStatusProductGroup {
  id: ModelStatusProductGroupId
  label: string
  /** overview category (normalizeOverviewCategory) */
  overviewCategory?: string
  models: string[]
}

export const MODEL_STATUS_PRODUCT_GROUPS: ModelStatusProductGroup[] = [
  {
    id: 'sound-suite',
    label: 'Sound Suite',
    overviewCategory: 'Sound Suite',
    models: ['H7_VI', 'H5', 'M7_VI', 'M5_VI', 'W5'],
  },
  {
    id: 'wifi-soundbar',
    label: 'WIFI Soundbar',
    overviewCategory: '사운드바(Wi-Fi)',
    models: ['S90C'],
  },
  {
    id: 'bt-soundbar',
    label: 'BT Soundbar',
    overviewCategory: '사운드바(BT)',
    models: ['S80C', 'SB_CH'],
  },
  {
    id: 'party-speaker',
    label: '파티 스피커',
    overviewCategory: '파티스피커',
    models: [],
  },
  {
    id: 'wireless-speaker',
    label: '무선 스피커',
    overviewCategory: '무선스피커',
    models: [],
  },
]

export type ModelStatusTabId = 'summary' | 'release' | 'initiative' | 'prd' | 'issues'

export const MODEL_STATUS_TABS: { id: ModelStatusTabId; label: string }[] = [
  { id: 'summary', label: '요약' },
  { id: 'initiative', label: 'Initiative' },
  { id: 'release', label: '릴리즈 · Epic' },
  { id: 'prd', label: 'PRD' },
  { id: 'issues', label: '이슈/리스크' },
]
