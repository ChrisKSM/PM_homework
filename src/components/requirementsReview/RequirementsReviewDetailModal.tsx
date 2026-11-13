import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Loader2, X, ExternalLink } from 'lucide-react'
import type { RequirementsReviewPrdDetail, RequirementsReviewRow } from '../../types/requirementsReview'
import { POLARION_PRD_UI } from '../../data/requirementsReviewCatalog'
import { prdWorkflowBadgeClass } from '../../utils/requirementsReviewStatusBadge'
import InitiativeLinksCell from './InitiativeLinksCell'

const DETAIL_SECTIONS: { key: keyof RequirementsReviewPrdDetail; label: string; polarionField: string }[] = [
  { key: 'requestedReviewItems', label: '검토요청사항', polarionField: 'RequestedReviewItems' },
  { key: 'requestReason', label: '요청사유', polarionField: 'requestReason' },
  { key: 'userValue', label: '목적/사용자 Value', polarionField: 'userValue' },
  { key: 'userFunctionDetail', label: '사용자 기능 구체화', polarionField: 'UserFunctionDetailDescription' },
  { key: 'operationDetail', label: '동작성 구체화', polarionField: 'OperationDetailDescription' },
  { key: 'comments', label: 'Comments', polarionField: 'comments.text' },
]

interface Props {
  row: RequirementsReviewRow | null
  loading?: boolean
  planSlot?: ReactNode
  onClose: () => void
}

export default function RequirementsReviewDetailModal({ row, loading = false, planSlot, onClose }: Props) {
  if (!row) return null

  const detail = row.detail ?? {}
  const polarionItem = row.polarionUrl || `${POLARION_PRD_UI}?query=id%3A${encodeURIComponent(row.id)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="닫기" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-surface-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-surface-border">
          <div className="min-w-0">
            <p className="text-xs font-mono text-gray-500">{row.id}</p>
            <h2 className="text-lg font-bold text-gray-900 mt-1 leading-snug">{row.title}</h2>
            <p className="text-xs text-gray-500 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={clsx(
                  'inline-flex px-2 py-0.5 rounded font-semibold',
                  prdWorkflowBadgeClass(
                    row.workflowStageId,
                    row.workflowStageLabel || row.almStatus
                  )
                )}
              >
                {row.workflowStageId && row.workflowStageId !== 'other'
                  ? row.workflowStageLabel
                  : row.almStatus && row.almStatus !== '—'
                    ? row.almStatus
                    : row.workflowStageLabel || '—'}
              </span>
              <span>Owner: {row.devOwner || '—'}</span>
              {row.updated ? <span className="tabular-nums">Updated: {row.updated}</span> : null}
              {(row.initiativeLinks?.length || row.initiativeUrl || row.initiative) && (
                <span className="flex flex-wrap items-center gap-1">
                  <span className="shrink-0">Initiative:</span>
                  <InitiativeLinksCell
                    initiative={row.initiative}
                    initiativeUrl={row.initiativeUrl}
                    initiativeLinks={row.initiativeLinks}
                  />
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-surface-page"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-500 inline-flex items-center gap-2 py-2">
              <Loader2 size={16} className="animate-spin" />
              Polarion 상세 불러오는 중…
            </p>
          ) : null}
          {planSlot}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">요구사항 구체화</h3>
            <div className="space-y-4">
              {DETAIL_SECTIONS.map((sec) => {
                const text = (detail[sec.key] || '').trim()
                return (
                  <section key={sec.key} className="border border-surface-border rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600">{sec.label}</h4>
                      <a
                        href={`${POLARION_PRD_UI}?query=HAS_VALUE%3A${encodeURIComponent(sec.polarionField)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        Polarion field
                        <ExternalLink size={10} />
                      </a>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {text || '— (상세 필드 API 연동 예정)'}
                    </p>
                  </section>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-surface-border flex flex-wrap gap-2 justify-end bg-surface-page/50">
          <a
            href={polarionItem}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Polarion PRD 열기
            <ExternalLink size={14} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm border border-surface-border text-gray-700 hover:bg-white"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
