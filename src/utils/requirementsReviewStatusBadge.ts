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

export function prdWorkflowBadgeClass(stageId?: string | null): string {
  if (stageId && BADGE[stageId]) return BADGE[stageId]
  return BADGE.other
}

export function prdWorkflowBadgeClassFromId(stageId: PrdWorkflowStageId | 'other' | undefined): string {
  return prdWorkflowBadgeClass(stageId)
}
