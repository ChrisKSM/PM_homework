import type { RequirementsReviewAlmRow } from '../types/requirementsReview'

const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

export const MOCK_CUSTOM_LABEL_POOL = [
  '검토필요',
  'PM확인',
  '아키텍처',
  'SW',
  'HW',
  'QA',
  '릴리즈블로커',
  '완료',
] as const

export const DEFAULT_MONGO_OVERLAY = {
  customLabels: [] as string[],
  appliedAt: '',
  devPeriod: '',
  devOwner: '',
  updatedAt: now(),
  updatedBy: 'mock-sync',
}

/** 초기 mock — Mongo overlay는 페이지 state/localStorage에서 merge */
export const REQUIREMENTS_REVIEW_ALM_MOCK: RequirementsReviewAlmRow[] = [
  {
    id: 'AVSW-PRD-10482',
    title: 'Sound Suite 7 — Multi-room audio sync',
    osType: 'webOS',
    productCategory: 'soundbar',
    appliedModel: 'H7_VI',
    almStatus: 'In Review',
    almQueryFragment: 'components:(SoundSuite_H7(VI) H7_VI)',
    polarionUrl: 'https://alm-lge-hlm.singlex.com/polarion/#/project/AVSWReqMgmt/workitems/PRD?query=components%3A(SoundSuite_H7%5C(VI%5C)%20H7_VI)',
  },
  {
    id: 'AVSW-PRD-10491',
    title: 'HDMI eARC latency budget',
    osType: 'non-webOS',
    productCategory: 'soundbar',
    appliedModel: 'S80C',
    almStatus: 'Approved',
    almQueryFragment: 'components:(S80C)',
  },
  {
    id: 'AVSW-PRD-10502',
    title: 'Voice assistant wake-word coexistence',
    osType: 'webOS',
    productCategory: 'new-home-audio',
    appliedModel: 'M7',
    almStatus: 'Draft',
    almQueryFragment: 'components:(M7)',
  },
  {
    id: 'AVSW-PRD-10518',
    title: 'Bluetooth multipoint switching UX',
    osType: 'non-webOS',
    productCategory: 'wireless-headset',
    appliedModel: 'ToneFree Pro',
    almStatus: 'In Review',
    almQueryFragment: 'type:PRD AND components:(ToneFree)',
  },
  {
    id: 'AVSW-PRD-10533',
    title: 'Party mode stereo pairing',
    osType: 'non-webOS',
    productCategory: 'wireless-speaker',
    appliedModel: 'XBOOM Go',
    almStatus: 'In Review',
    almQueryFragment: 'components:(XBOOM)',
  },
  {
    id: 'AVSW-PRD-10540',
    title: 'webOS Media player codec policy',
    osType: 'webOS',
    productCategory: 'soundbar',
    appliedModel: 'W7',
    almStatus: 'Approved',
    almQueryFragment: 'components:(W7)',
  },
  {
    id: 'AVSW-PRD-10555',
    title: 'Factory reset persistence rules',
    osType: 'non-webOS',
    productCategory: 'new-home-audio',
    appliedModel: 'StanbyME 2',
    almStatus: 'Draft',
    almQueryFragment: 'components:(StanbyME)',
  },
  {
    id: 'AVSW-PRD-10561',
    title: 'Low-latency gaming mode',
    osType: 'webOS',
    productCategory: 'wireless-headset',
    appliedModel: 'H7_VI',
    almStatus: 'In Review',
    almQueryFragment: 'components:(H7_VI)',
  },
  {
    id: 'AVSW-PRD-10572',
    title: 'Power management deep sleep',
    osType: 'non-webOS',
    productCategory: 'wireless-speaker',
    appliedModel: 'S80C',
    almStatus: 'Approved',
    almQueryFragment: 'components:(S80C)',
  },
  {
    id: 'AVSW-PRD-10588',
    title: 'OTA rollback guardrails',
    osType: 'webOS',
    productCategory: 'soundbar',
    appliedModel: 'H7_VI',
    almStatus: 'In Review',
    almQueryFragment: 'type:PRD AND status:inReview',
  },
]

/** Seed overlay for demo (일부 행만 라벨/메타 채움) */
export const MOCK_MONGO_SEED: Record<
  string,
  Partial<import('../types/requirementsReview').RequirementsReviewMongoOverlay>
> = {
  'AVSW-PRD-10482': {
    customLabels: ['검토필요', 'SW'],
    appliedAt: '2026-Q2',
    devPeriod: '8주',
    devOwner: 'Audio Platform',
    updatedBy: 'mock-seed',
  },
  'AVSW-PRD-10491': {
    customLabels: ['완료', 'PM확인'],
    appliedAt: '2025-Q4',
    devPeriod: '4주',
    devOwner: 'Soundbar SW',
  },
  'AVSW-PRD-10518': {
    customLabels: ['HW', '검토필요'],
    appliedAt: '2026-Q1',
    devPeriod: '6주',
    devOwner: 'Connectivity',
  },
}

export function buildAlmQueryPreview(parts: {
  osType: string
  productCategory: string
  appliedModel: string
  label: string
}): string {
  const clauses: string[] = ['type:PRD']
  if (parts.appliedModel && parts.appliedModel !== 'all') {
    clauses.push(`components:(${parts.appliedModel})`)
  }
  if (parts.osType && parts.osType !== 'all') {
    clauses.push(`labels:(${parts.osType === 'webOS' ? 'webOS' : 'non-webOS'})`)
  }
  if (parts.productCategory && parts.productCategory !== 'all') {
    clauses.push(`category:${parts.productCategory}`)
  }
  if (parts.label && parts.label !== 'all') {
    clauses.push(`/* Mongo label filter (local): "${parts.label}" */`)
  }
  return clauses.join(' AND ')
}
