import clsx from 'clsx'
import type { ProcurementFilterOptions, ProcurementPhaseId, ProcurementVendorId } from '../../types/procurement'

interface Props {
  filterOptions: ProcurementFilterOptions
  vendor: ProcurementVendorId
  phase: ProcurementPhaseId
  jql?: string
  onVendorChange: (vendor: ProcurementVendorId) => void
  onPhaseChange: (phase: ProcurementPhaseId) => void
}

export default function ProcurementFilters({
  filterOptions,
  vendor,
  phase,
  jql,
  onVendorChange,
  onPhaseChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterOptions.vendors.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onVendorChange(v.id as ProcurementVendorId)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors',
              vendor === v.id
                ? 'bg-lg-red-light text-lg-red border-red-200'
                : 'bg-white text-gray-600 border-surface-border hover:bg-surface-page'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={phase}
          onChange={(e) => onPhaseChange(e.target.value as ProcurementPhaseId)}
          className="text-sm border border-surface-border rounded-lg px-3 py-1.5 bg-white text-gray-700 font-medium"
        >
          {filterOptions.phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {p.jiraLabel ? ` (${p.jiraLabel})` : ''}
            </option>
          ))}
        </select>
        {jql && (
          <code className="text-xs bg-surface-page border border-surface-border rounded-lg px-3 py-1.5 text-gray-600 font-mono">
            {jql}
          </code>
        )}
      </div>
    </div>
  )
}
