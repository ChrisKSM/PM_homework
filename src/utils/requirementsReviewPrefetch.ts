import type { RequirementsReviewRow } from '../types/requirementsReview'

/** Polarion 목록이 id-only(stub)일 때 — 상세 API로 title/status 채움 */
export function requirementsReviewRowNeedsPrefetch(row: RequirementsReviewRow): boolean {
  const id = row.id.trim()
  if (!id) return false
  const title = row.title.trim()
  if (!title || title === id) return true
  if (title === `AVSWReqMgmt/${id}`) return true
  const status = (row.almStatus || row.workflowStageLabel || '').trim()
  if (status === '기타' && !row.updated?.trim()) return true
  return false
}
