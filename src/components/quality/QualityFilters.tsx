import clsx from 'clsx'
import type { QualityCategory, QualityEventGroup, QualityFilterOptions } from '../../types/quality'

interface Props {
  filterOptions: QualityFilterOptions
  eventGroup: QualityEventGroup
  phase: string
  category: QualityCategory
  jql?: string
  onEventChange: (event: QualityEventGroup) => void
  onPhaseChange: (phase: string) => void
  onCategoryChange: (category: QualityCategory) => void
}

const CATEGORY_OPTIONS: { value: QualityCategory; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'bug', label: 'Bug' },
  { value: 'function', label: 'Function' },
  { value: 'auto', label: 'Auto (자동화)' },
]

export default function QualityFilters({
  filterOptions,
  eventGroup,
  phase,
  category,
  jql,
  onEventChange,
  onPhaseChange,
  onCategoryChange,
}: Props) {
  const phases = filterOptions.phases[eventGroup] ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterOptions.eventGroups.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => onEventChange(g.value)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors',
              eventGroup === g.value
                ? 'bg-lg-red-light text-lg-red border-red-200'
                : 'bg-white text-gray-600 border-surface-border hover:bg-surface-page'
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {phases.map((p) => (
          <button
            key={p.phase}
            type="button"
            onClick={() => onPhaseChange(p.phase)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              phase === p.phase
                ? 'bg-lg-red-light text-lg-red border-red-200'
                : 'bg-white text-gray-600 border-surface-border hover:bg-surface-page'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {jql && (
          <code className="text-xs bg-surface-page border border-surface-border rounded-lg px-3 py-1.5 text-gray-600 font-mono">
            {jql}
          </code>
        )}
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as QualityCategory)}
          className="text-sm border border-surface-border rounded-lg px-3 py-1.5 bg-white text-gray-700 font-medium"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
