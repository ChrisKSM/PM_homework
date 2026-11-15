/**
 * 요구사항 검토 편집 권한 — mock.
 * 추후 BE: auth.valid(request, required_roles=['req-review-editor']) 와 동일 역할명 사용 예정.
 */
export const REQ_REVIEW_EDITOR_ROLE = 'req-review-editor'
export const REQ_REVIEW_VIEWER_ROLE = 'req-review-viewer'

export type RequirementsReviewMockRole = 'viewer' | 'editor'

const STORAGE_KEY = 'req-review-mock-role'

export function getMockRequirementsReviewRole(): RequirementsReviewMockRole {
  if (typeof window === 'undefined') return 'viewer'
  const q = new URLSearchParams(window.location.search).get('role')
  if (q === 'editor' || q === 'viewer') return q
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'editor' || stored === 'viewer') return stored
  return 'viewer'
}

export function setMockRequirementsReviewRole(role: RequirementsReviewMockRole): void {
  window.localStorage.setItem(STORAGE_KEY, role)
}

export function canEditRequirementsReview(role: RequirementsReviewMockRole): boolean {
  return role === 'editor'
}
