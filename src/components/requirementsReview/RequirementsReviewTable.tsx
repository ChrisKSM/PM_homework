import clsx from 'clsx'
import { ExternalLink, Pencil } from 'lucide-react'
import type { RequirementsReviewRow } from '../../types/requirementsReview'
import { OS_TYPE_LABELS, PRODUCT_CATEGORY_LABELS } from '../../types/requirementsReview'

interface Props {
  rows: RequirementsReviewRow[]
  groupByOs: boolean
  canEdit: boolean
  onEditRow: (row: RequirementsReviewRow) => void
}

function LabelChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-800 border border-violet-200">
      {text}
    </span>
  )
}

function OsSectionHeader({ osType }: { osType: 'webOS' | 'non-webOS' }) {
  return (
    <tr className="bg-surface-page">
      <td colSpan={9} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600">
        OS type · {OS_TYPE_LABELS[osType]}
      </td>
    </tr>
  )
}

function RowCells({
  row,
  canEdit,
  onEditRow,
}: {
  row: RequirementsReviewRow
  canEdit: boolean
  onEditRow: (row: RequirementsReviewRow) => void
}) {
  return (
    <tr className="border-t border-surface-border hover:bg-surface-page/80">
      <td className="px-3 py-3 text-xs font-mono text-gray-800 whitespace-nowrap">{row.id}</td>
      <td className="px-3 py-3 text-sm text-gray-900 max-w-xs">
        <span className="line-clamp-2">{row.title}</span>
      </td>
      <td className="px-3 py-3 text-xs text-gray-600">{OS_TYPE_LABELS[row.osType]}</td>
      <td className="px-3 py-3 text-xs text-gray-700">{PRODUCT_CATEGORY_LABELS[row.productCategory]}</td>
      <td className="px-3 py-3 text-xs font-medium text-gray-800">{row.appliedModel}</td>
      <td className="px-3 py-3">
        <span
          className={clsx(
            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
            row.almStatus === 'Approved' && 'bg-emerald-100 text-emerald-800',
            row.almStatus === 'In Review' && 'bg-amber-100 text-amber-900',
            row.almStatus === 'Draft' && 'bg-gray-100 text-gray-700'
          )}
        >
          {row.almStatus}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {row.customLabels.length === 0 ? (
            <span className="text-xs text-gray-400">—</span>
          ) : (
            row.customLabels.map((l) => <LabelChip key={l} text={l} />)
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">
        <div>{row.appliedAt || '—'}</div>
        <div className="text-gray-500">{row.devPeriod || '—'} · {row.devOwner || '—'}</div>
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          {row.polarionUrl && (
            <a
              href={row.polarionUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
              title="Polarion UI"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onEditRow(row)}
            className={clsx(
              'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border',
              canEdit
                ? 'border-surface-border text-gray-700 hover:bg-white'
                : 'border-transparent text-gray-400 cursor-not-allowed'
            )}
            title={canEdit ? 'Mongo 필드 편집' : '편집 권한 없음 (viewer)'}
          >
            <Pencil size={14} />
            편집
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function RequirementsReviewTable({ rows, groupByOs, canEdit, onEditRow }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-surface-border rounded-xl px-6 py-12 text-center text-sm text-gray-500">
        필터 조건에 맞는 요구사항이 없습니다.
      </div>
    )
  }

  const webOsRows = rows.filter((r) => r.osType === 'webOS')
  const nonWebOsRows = rows.filter((r) => r.osType === 'non-webOS')

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left">
          <thead className="bg-surface-page border-b border-surface-border">
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-600">
              <th className="px-3 py-3">ALM ID</th>
              <th className="px-3 py-3">제목</th>
              <th className="px-3 py-3">OS</th>
              <th className="px-3 py-3">카테고리</th>
              <th className="px-3 py-3">적용모델</th>
              <th className="px-3 py-3">ALM 상태</th>
              <th className="px-3 py-3">Labels (Mongo)</th>
              <th className="px-3 py-3">적용시점 / 개발</th>
              <th className="px-3 py-3 text-right">링크</th>
            </tr>
          </thead>
          <tbody>
            {groupByOs ? (
              <>
                {webOsRows.length > 0 && (
                  <>
                    <OsSectionHeader osType="webOS" />
                    {webOsRows.map((row) => (
                      <RowCells key={row.id} row={row} canEdit={canEdit} onEditRow={onEditRow} />
                    ))}
                  </>
                )}
                {nonWebOsRows.length > 0 && (
                  <>
                    <OsSectionHeader osType="non-webOS" />
                    {nonWebOsRows.map((row) => (
                      <RowCells key={row.id} row={row} canEdit={canEdit} onEditRow={onEditRow} />
                    ))}
                  </>
                )}
              </>
            ) : (
              rows.map((row) => (
                <RowCells key={row.id} row={row} canEdit={canEdit} onEditRow={onEditRow} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
