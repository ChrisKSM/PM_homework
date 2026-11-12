import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { ApplyScope } from '../../types/requirementsReview'
import { APPLY_SCOPE_OPTIONS } from '../../types/requirementsReview'
import { PLAN_FILTER_UNSET, formatApplyMonth } from '../../utils/requirementsReviewPlan'

interface Props {
  monthCounts: { month: string; count: number }[]
  unsetCount: number
  totalCount: number
  scopeCounts: Record<ApplyScope, number>
  applyMonth: string
  applyScope: ApplyScope | 'all'
  onApplyMonthChange: (v: string) => void
  onApplyScopeChange: (v: ApplyScope | 'all') => void
}

export default function RequirementsReviewPlanFilters({
  monthCounts,
  unsetCount,
  totalCount,
  scopeCounts,
  applyMonth,
  applyScope,
  onApplyMonthChange,
  onApplyScopeChange,
}: Props) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-5 space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">적용 시점</p>
        <div className="flex flex-wrap gap-2">
          <Pill active={applyMonth === 'all'} onClick={() => onApplyMonthChange('all')} count={totalCount}>
            전체
          </Pill>
          {monthCounts.map(({ month, count }) => (
            <Pill
              key={month}
              active={applyMonth === month}
              onClick={() => onApplyMonthChange(month)}
              count={count}
            >
              {formatApplyMonth(month)} 적용
            </Pill>
          ))}
          <Pill
            active={applyMonth === PLAN_FILTER_UNSET}
            onClick={() => onApplyMonthChange(PLAN_FILTER_UNSET)}
            count={unsetCount}
            muted
          >
            미정
          </Pill>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">적용 범위</p>
        <div className="flex flex-wrap gap-2">
          <Pill active={applyScope === 'all'} onClick={() => onApplyScopeChange('all')}>
            전체
          </Pill>
          {APPLY_SCOPE_OPTIONS.map((o) => (
            <Pill
              key={o.id}
              active={applyScope === o.id}
              onClick={() => onApplyScopeChange(o.id)}
              count={scopeCounts[o.id]}
            >
              {o.label}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  )
}

function Pill({
  active,
  onClick,
  count,
  muted = false,
  children,
}: {
  active: boolean
  onClick: () => void
  count?: number
  muted?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
        active
          ? 'bg-indigo-600 text-white border-indigo-600'
          : muted
            ? 'bg-surface-page text-gray-500 border-surface-border hover:bg-white'
            : 'bg-white text-gray-700 border-surface-border hover:bg-surface-page'
      )}
    >
      {children}
      {count != null ? (
        <span
          className={clsx(
            'text-[11px] tabular-nums px-1.5 rounded',
            active ? 'bg-white/20 text-white' : 'bg-surface-page text-gray-500'
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}
