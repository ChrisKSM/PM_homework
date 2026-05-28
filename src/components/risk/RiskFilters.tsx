import clsx from 'clsx'
import type { RiskCategory, RiskFilterOptions } from '../../types/risk'

interface Props {
  filterOptions: RiskFilterOptions
  category: RiskCategory
  jql?: string
  onCategoryChange: (category: RiskCategory) => void
}

export default function RiskFilters({
  filterOptions,
  category,
  jql,
  onCategoryChange,
}: Props) {
  const categories = filterOptions.categories ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onCategoryChange(c.value as RiskCategory)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors',
              category === c.value
                ? 'bg-lg-red-light text-lg-red border-red-200'
                : 'bg-white text-gray-600 border-surface-border hover:bg-surface-page'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="font-medium">
          식별: labels = <code className="font-mono text-gray-700">{filterOptions.riskLabel}</code>
        </span>
        <span>·</span>
        <span>
          범주: <code className="font-mono text-gray-700">{filterOptions.categoryField}</code>
        </span>
        <span>·</span>
        <span>
          대응 계획: <code className="font-mono text-gray-700">{filterOptions.responsePlanField}</code>
        </span>
      </div>

      {jql && (
        <code className="block text-xs bg-surface-page border border-surface-border rounded-lg px-3 py-1.5 text-gray-600 font-mono">
          {jql}
        </code>
      )}
    </div>
  )
}
