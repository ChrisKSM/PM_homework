import clsx from 'clsx'
import { ExternalLink } from 'lucide-react'
import type { RequirementsReviewRow } from '../../types/requirementsReview'

interface Props {
  rows: RequirementsReviewRow[]
  onTitleClick: (row: RequirementsReviewRow) => void
}

export default function RequirementsReviewTable({ rows, onTitleClick }: Props) {
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
                  {row.polarionUrl ? (
                    <a
                      href={row.polarionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                    >
                      {row.id}
                      <ExternalLink size={12} className="opacity-60" />
                    </a>
                  ) : (
                    row.id
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 max-w-md">
                  <button
                    type="button"
                    onClick={() => onTitleClick(row)}
                    className="text-left font-medium text-indigo-700 hover:underline line-clamp-2"
                  >
                    {row.title}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                    {row.workflowStageLabel || row.almStatus}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-gray-700">{row.initiative || '—'}</td>
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
