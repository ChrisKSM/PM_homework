import clsx from 'clsx'
import { ExternalLink } from 'lucide-react'
import type { RequirementsReviewRow } from '../../types/requirementsReview'
import { prdWorkflowBadgeClass } from '../../utils/requirementsReviewStatusBadge'

interface Props {
  rows: RequirementsReviewRow[]
  onIdClick: (row: RequirementsReviewRow) => void
}

function statusLabel(row: RequirementsReviewRow): string {
  if (row.workflowStageId && row.workflowStageId !== 'other') {
    return row.workflowStageLabel || row.almStatus || '—'
  }
  return row.almStatus || row.workflowStageLabel || '—'
}

export default function RequirementsReviewTable({ rows, onIdClick }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-surface-border rounded-xl px-6 py-12 text-center text-sm text-gray-500">
        필터 조건에 맞는 요구사항이 없습니다. Product category · 적용모델 · Labels를 조정하세요.
      </div>
    )
  }

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1024px] text-left">
          <thead className="bg-surface-page border-b border-surface-border">
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-600">
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Initiative</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Delivery Date</th>
              <th className="px-3 py-3">Action Item</th>
              <th className="px-3 py-3 text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={clsx(
                  'border-t border-surface-border hover:bg-surface-page/80',
                  index % 2 === 1 && 'bg-gray-50/40'
                )}
              >
                <td className="px-3 py-3 text-xs font-mono whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onIdClick(row)}
                    className="inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline"
                  >
                    {row.id}
                  </button>
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 max-w-md">
                  {row.polarionUrl ? (
                    <a
                      href={row.polarionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-left font-medium text-blue-600 hover:underline line-clamp-2"
                    >
                      {row.title}
                      <ExternalLink size={12} className="opacity-60 shrink-0" />
                    </a>
                  ) : (
                    <span className="line-clamp-2">{row.title}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={clsx(
                      'inline-flex px-2 py-0.5 rounded text-xs font-semibold',
                      prdWorkflowBadgeClass(row.workflowStageId, statusLabel(row))
                    )}
                  >
                    {statusLabel(row)}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-gray-700">
                  {row.initiativeUrl ? (
                    <a
                      href={row.initiativeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline font-mono"
                    >
                      {row.initiative || row.initiativeUrl}
                    </a>
                  ) : (
                    row.initiative || '—'
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-gray-700">{row.devOwner || '—'}</td>
                <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{row.deliveryDate || '—'}</td>
                <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px] truncate" title={row.actionItem}>
                  {row.actionItem || '—'}
                </td>
                <td className="px-3 py-3 text-xs text-gray-500 text-right whitespace-nowrap tabular-nums">
                  {row.updated || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
