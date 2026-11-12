import dayjs from 'dayjs'
import type {
  ApplyScope,
  RequirementsReviewPlan,
  RequirementsReviewPlanInput,
} from '../types/requirementsReview'
import { APPLY_SCOPE_OPTIONS } from '../types/requirementsReview'

export const PLAN_FILTER_UNSET = '__unset'

/** 2027-01 → "27년 1월 MR" */
export function formatApplyMonth(applyMonth: string | undefined): string {
  const m = /^(\d{4})-(\d{2})$/.exec((applyMonth || '').trim())
  if (!m) return ''
  return `${m[1].slice(2)}년 ${Number(m[2])}월 MR`
}

/** 이번 달 기준 앞 3개월 ~ 뒤 18개월 MR 선택지 (+ 이미 저장된 값) */
export function applyMonthOptions(extra: string[] = [], base = dayjs()): string[] {
  const out = new Set<string>()
  for (let i = -3; i <= 18; i++) out.add(base.add(i, 'month').format('YYYY-MM'))
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
