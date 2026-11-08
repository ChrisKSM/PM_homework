import type { PrdWorkflowStageId } from './modelStatusPrdWorkflow'

const BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  review_request: 'bg-amber-50 text-amber-800',
  review_approved: 'bg-blue-50 text-blue-800',
  dev_review: 'bg-indigo-50 text-indigo-800',
  planning_review: 'bg-violet-50 text-violet-800',
  dev_approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-50 text-red-800',
  other: 'bg-gray-100 text-gray-700',
}

function labelToStageId(label?: string | null): string | undefined {
  const n = (label || '').replace(/\s+/g, '')
  if (!n) return undefined
  if (n.includes('개발승인')) return 'dev_approved'
  if (n.includes('개발검토')) return 'dev_review'
  if (n.includes('검토요청')) return 'review_request'
  if (n.includes('검토승인')) return 'review_approved'
  if (n.includes('기획검토') || n === 'reviewing') return 'planning_review'
  if (n === '반려' || n.includes('반려')) return 'rejected'
  if (n.includes('작성중')) return 'draft'
  return undefined
}

export function prdWorkflowBadgeClass(stageId?: string | null, label?: string | null): string {
  if (stageId && BADGE[stageId]) return BADGE[stageId]
  const fromLabel = labelToStageId(label)
  if (fromLabel && BADGE[fromLabel]) return BADGE[fromLabel]
  return BADGE.other
}

export function prdWorkflowBadgeClassFromId(stageId: PrdWorkflowStageId | 'other' | undefined): string {
  return prdWorkflowBadgeClass(stageId)
}
