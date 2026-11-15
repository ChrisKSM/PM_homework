/** BE `model_status_prd_status.PRD_WORKFLOW_COLUMNS` 와 동일 순서 */
export const PRD_WORKFLOW_COLUMNS = [
  { id: 'draft', label: '작성 중', order: 1 },
  { id: 'review_request', label: '검토요청', order: 2 },
  { id: 'review_approved', label: '검토 승인', order: 3 },
  { id: 'dev_review', label: '개발 검토', order: 4 },
  { id: 'planning_review', label: '기획검토', order: 5 },
  { id: 'dev_approved', label: '개발 승인', order: 6 },
  { id: 'rejected', label: '반려', order: 7 },
] as const

export type PrdWorkflowStageId = (typeof PRD_WORKFLOW_COLUMNS)[number]['id'] | 'other' | 'total'

export const PRD_LABEL_UNASSIGNED = '미지정'

export function reviewLabelSortKey(label: string): string {
  const t = (label || '').trim()
  return t ? t : `\uFFFF${PRD_LABEL_UNASSIGNED}`
}
