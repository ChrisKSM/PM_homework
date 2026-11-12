import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { AlertTriangle, CalendarClock, Check, Loader2, Save } from 'lucide-react'
import type {
  ApplyScope,
  RequirementsReviewPlan,
  RequirementsReviewPlanInput,
} from '../../types/requirementsReview'
import { APPLY_SCOPE_OPTIONS } from '../../types/requirementsReview'
import {
  applyMonthOptions,
  emptyPlan,
  formatApplyMonth,
  isDueOverdue,
} from '../../utils/requirementsReviewPlan'
import type { PlanStoreSource } from '../../hooks/useRequirementsReviewPlans'

interface Props {
  prdId: string
  plan?: RequirementsReviewPlan
  teamSuggestions: string[]
  knownMonths: string[]
  source: PlanStoreSource
  saving: boolean
  onSave: (input: RequirementsReviewPlanInput) => Promise<unknown>
}

function toInput(prdId: string, plan?: RequirementsReviewPlan): RequirementsReviewPlanInput {
  if (!plan) return emptyPlan(prdId)
  return {
    prdId,
    applyMonth: plan.applyMonth || '',
    applyScopes: plan.applyScopes || [],
    devTeam: plan.devTeam || '',
    actionItem: plan.actionItem || '',
    dueDate: plan.dueDate || '',
  }
}

export default function RequirementsReviewPlanForm({
  prdId,
  plan,
  teamSuggestions,
  knownMonths,
  source,
  saving,
  onSave,
}: Props) {
  const saved = useMemo(() => toInput(prdId, plan), [prdId, plan])
  const [draft, setDraft] = useState<RequirementsReviewPlanInput>(saved)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setDraft(saved)
    setError(null)
  }, [saved])

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const months = useMemo(
    () => applyMonthOptions([...knownMonths, saved.applyMonth]),
    [knownMonths, saved.applyMonth]
  )
  const overdue = isDueOverdue(draft.dueDate)

  const patch = (p: Partial<RequirementsReviewPlanInput>) => {
    setDraft((d) => ({ ...d, ...p }))
    setJustSaved(false)
  }

  const toggleScope = (scope: ApplyScope) => {
    const set = new Set(draft.applyScopes)
    if (set.has(scope)) set.delete(scope)
    else set.add(scope)
    patch({ applyScopes: APPLY_SCOPE_OPTIONS.map((o) => o.id).filter((id) => set.has(id)) })
  }

  const submit = async () => {
    setError(null)
    try {
      await onSave(draft)
      setJustSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5">
          <CalendarClock size={16} className="text-indigo-600" />
          적용 계획
        </h3>
        <span
          className={clsx(
            'text-[10px] px-1.5 py-0.5 rounded font-medium',
            source === 'server' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          )}
        >
          {source === 'server' ? 'DB 저장' : '브라우저 임시 저장 (BE 미연결)'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-bold text-gray-700 mb-1">적용 시점</span>
          <select
            value={draft.applyMonth}
            onChange={(e) => patch({ applyMonth: e.target.value })}
            className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white"
          >
            <option value="">미정</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatApplyMonth(m)} 적용
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="block text-xs font-bold text-gray-700 mb-1">적용 범위</span>
          <div className="flex gap-2">
            {APPLY_SCOPE_OPTIONS.map((o) => {
              const active = draft.applyScopes.includes(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleScope(o.id)}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-surface-border hover:bg-surface-page'
                  )}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        <label className="block sm:col-span-2">
          <span className="block text-xs font-bold text-gray-700 mb-1">개발팀</span>
          <input
            list="requirements-review-dev-teams"
            value={draft.devTeam}
            onChange={(e) => patch({ devTeam: e.target.value })}
            placeholder="예: Audio SW 1팀"
            className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white"
          />
          <datalist id="requirements-review-dev-teams">
            {teamSuggestions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-xs font-bold text-gray-700 mb-1">Action Item</span>
          <textarea
            value={draft.actionItem}
            onChange={(e) => patch({ actionItem: e.target.value })}
            rows={3}
            placeholder="후속 조치 · 담당 · 확인 사항을 기술하세요"
            className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white resize-y"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-bold text-gray-700 mb-1">Due date</span>
          <input
            type="date"
            value={draft.dueDate}
            onChange={(e) => patch({ dueDate: e.target.value })}
            className={clsx(
              'w-full text-sm border rounded-lg px-3 py-2 bg-white tabular-nums',
              overdue ? 'border-red-300 text-red-700' : 'border-surface-border'
            )}
          />
          {overdue ? (
            <span className="text-[11px] text-red-600 mt-1 inline-flex items-center gap-1">
              <AlertTriangle size={11} /> 기한 지남
            </span>
          ) : null}
        </label>

        <div className="flex items-end justify-end gap-2">
          {plan?.updatedAt && !dirty ? (
            <span className="text-[11px] text-gray-500 tabular-nums mr-auto sm:mr-0">
              {justSaved ? <Check size={11} className="inline text-emerald-600 mr-0.5" /> : null}
              저장 {dayjs(plan.updatedAt).format('YYYY-MM-DD HH:mm')}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setDraft(saved)}
            disabled={!dirty || saving}
            className="px-3 py-2 rounded-lg text-sm border border-surface-border text-gray-700 bg-white hover:bg-surface-page disabled:opacity-40"
          >
            되돌리기
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            저장
          </button>
        </div>
      </div>

      {error ? <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p> : null}
    </section>
  )
}
