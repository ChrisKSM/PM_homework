import dayjs from 'dayjs'
import type {
  ApplyScope,
  RequirementsReviewPlan,
  RequirementsReviewPlanInput,
  RequirementsReviewRow,
} from '../types/requirementsReview'
import { APPLY_SCOPE_OPTIONS } from '../types/requirementsReview'

export const PLAN_FILTER_UNSET = '__unset'

/** 2027-01 → "27년 1월 MR" */
export function formatApplyMonth(applyMonth: string | undefined): string {
  const m = /^(\d{4})-(\d{2})$/.exec((applyMonth || '').trim())
  if (!m) return ''
  return `${m[1].slice(2)}년 ${Number(m[2])}월 MR`
}

export const APPLY_MONTH_OPTIONS: readonly string[] = Array.from(
  { length: 12 },
  (_, i) => `2027-${String(i + 1).padStart(2, '0')}`
)

/** 27년 1월 ~ 12월 MR (+ 범위 밖으로 이미 저장된 값은 유지 표시) */
export function applyMonthOptions(extra: string[] = []): string[] {
  const out = new Set<string>(APPLY_MONTH_OPTIONS)
  extra.filter((m) => /^\d{4}-\d{2}$/.test(m)).forEach((m) => out.add(m))
  return [...out].sort()
}

export function applyScopeLabel(scope: ApplyScope): string {
  return APPLY_SCOPE_OPTIONS.find((o) => o.id === scope)?.label ?? scope
}

export function isDueOverdue(dueDate: string | undefined, today = dayjs()): boolean {
  if (!dueDate) return false
  const d = dayjs(dueDate)
  return d.isValid() && d.isBefore(today, 'day')
}

const JIRA_KEY_RE = /\b[A-Z][A-Z0-9_]+-\d+\b/g

/** Initiative 링크(Polarion hyperlinks → TV Jira) 의 issue key — 최대 6개 */
export function initiativeJiraKeys(
  row: Pick<RequirementsReviewRow, 'initiative' | 'initiativeLinks'>
): string[] {
  const keys = new Set<string>()
  for (const l of row.initiativeLinks ?? []) {
    for (const k of (l.key || '').toUpperCase().match(JIRA_KEY_RE) ?? []) keys.add(k)
  }
  if (!keys.size) {
    for (const k of (row.initiative || '').toUpperCase().match(JIRA_KEY_RE) ?? []) keys.add(k)
  }
  return [...keys].slice(0, 6)
}

export function emptyPlan(prdId: string): RequirementsReviewPlanInput {
  return { prdId, applyMonth: '', applyScopes: [], devTeam: '', actionItem: '', dueDate: '' }
}

export function planHasContent(plan: RequirementsReviewPlanInput | undefined): boolean {
  if (!plan) return false
  return Boolean(
    plan.applyMonth || plan.applyScopes.length || plan.devTeam || plan.actionItem || plan.dueDate
  )
}

const LOCAL_KEY = 'requirements-review-plans.v1'

export function readLocalPlans(): RequirementsReviewPlan[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeLocalPlan(plan: RequirementsReviewPlan): RequirementsReviewPlan[] {
  const next = [...readLocalPlans().filter((p) => p.prdId !== plan.prdId), plan]
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
  return next
}
