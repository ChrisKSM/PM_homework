import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import Header from '../components/layout/Header'
import RequirementsReviewFilters from '../components/requirementsReview/RequirementsReviewFilters'
import RequirementsReviewTable from '../components/requirementsReview/RequirementsReviewTable'
import RequirementsReviewStatusCards, {
  buildStatusCardCounts,
} from '../components/requirementsReview/RequirementsReviewStatusCards'
import RequirementsReviewDetailModal from '../components/requirementsReview/RequirementsReviewDetailModal'
import { POLARION_PRD_UI, resolveRequirementsReviewApiModel, type CategoryScope } from '../data/requirementsReviewCatalog'
import type { OsType, RequirementsReviewRow } from '../types/requirementsReview'
import { useRequirementsReviewPrd } from '../hooks/useRequirementsReviewPrd'
import { mapPrdItemToReviewRow } from '../utils/requirementsReviewFromPrd'
import { buildRequirementsReviewQueryPreview } from '../utils/requirementsReviewPolarionQuery'
import type { PrdWorkflowStageId } from '../utils/modelStatusPrdWorkflow'
import { PRD_WORKFLOW_COLUMNS } from '../utils/modelStatusPrdWorkflow'

function sortByUpdated(rows: RequirementsReviewRow[]): RequirementsReviewRow[] {
  return [...rows].sort((a, b) => {
    const ua = a.updated || ''
    const ub = b.updated || ''
    if (ua !== ub) return ub.localeCompare(ua)
    return a.id.localeCompare(b.id)
  })
}

export default function RequirementsReviewPage() {
  const [category, setCategory] = useState<CategoryScope>('all')
  const [subModelId, setSubModelId] = useState('all')
  const [osType, setOsType] = useState<OsType | 'all'>('all')
  const [stageFilter, setStageFilter] = useState<PrdWorkflowStageId | 'total' | null>(null)
  const [detailRow, setDetailRow] = useState<RequirementsReviewRow | null>(null)

  const apiModel = useMemo(
    () => resolveRequirementsReviewApiModel(category, subModelId),
    [category, subModelId]
  )

  const { data, isPending, isFetching, isError, error, refetch } = useRequirementsReviewPrd(apiModel)
  const meta = data?.meta
  const workflowColumns = data?.workflowColumns?.length ? data.workflowColumns : PRD_WORKFLOW_COLUMNS

  const almQuery = useMemo(
    () =>
      buildRequirementsReviewQueryPreview({
        category,
        subModelId,
        osType,
        winningQuery: meta?.winningQuery,
      }),
    [category, subModelId, osType, meta?.winningQuery]
  )

  const allRows = useMemo(() => {
    const items = data?.items ?? []
    const fragment = meta?.winningQuery || almQuery
    return items.map((item) => mapPrdItemToReviewRow(item, apiModel, undefined, fragment))
  }, [data?.items, apiModel, meta?.winningQuery, almQuery])

  const filteredRows = useMemo(() => {
    let list = allRows
    if (osType !== 'all') {
      list = list.filter((r) => r.osType === osType)
    }
    if (stageFilter && stageFilter !== 'total') {
      list = list.filter((r) =>
        stageFilter === 'other'
          ? r.workflowStageId === 'other' || !r.workflowStageId
          : r.workflowStageId === stageFilter
      )
    }
    return sortByUpdated(list)
  }, [allRows, osType, stageFilter])

  const statusCards = useMemo(() => {
    let base = allRows
    if (osType !== 'all') base = base.filter((r) => r.osType === osType)
    return buildStatusCardCounts(base, workflowColumns)
  }, [allRows, osType, workflowColumns])

  useEffect(() => {
    setSubModelId('all')
    setStageFilter(null)
  }, [category])

  useEffect(() => {
    setStageFilter(null)
  }, [subModelId, osType, apiModel])

  const onCategoryChange = useCallback((next: CategoryScope) => {
    setCategory(next)
  }, [])

  return (
    <>
      <Header
        title="요구사항 검토"
        subtitle="PRD · division / productCategory / components · status · updated"
      />

      <div className="pt-16 p-6 space-y-6 max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            API 조회: <span className="font-mono font-semibold text-gray-900">{apiModel}</span>
          </p>
          <div className="flex items-center gap-2">
            <a
              href={POLARION_PRD_UI}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 underline"
            >
              Polarion PRD
            </a>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border text-sm text-gray-700 hover:bg-surface-page"
            >
              {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              새로고침
            </button>
          </div>
        </div>

        {(isError || meta?.error) && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">PRD API 오류</p>
              <p className="mt-1">{meta?.error || (error instanceof Error ? error.message : String(error))}</p>
              <p className="text-xs mt-1 text-red-700">GET /api/model-status/prd?model={apiModel}</p>
            </div>
          </div>
        )}

        <RequirementsReviewFilters
          category={category}
          subModelId={subModelId}
          osType={osType}
          almQuery={almQuery}
          onCategoryChange={onCategoryChange}
          onSubModelChange={setSubModelId}
          onOsTypeChange={setOsType}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Polarion 로딩…
              </span>
            ) : (
              <>
                <span className="font-semibold text-gray-900">{filteredRows.length}</span>건 표시 · PRD API{' '}
                <span className="font-semibold text-gray-900">{meta?.total ?? data?.items?.length ?? 0}</span>건
                {meta?.polarionTotal != null && meta.polarionTotal > (meta?.total ?? 0) ? (
                  <span className="text-amber-700">
                    {' '}
                    · Polarion 전체 {meta.polarionTotal}건 (상한 {meta?.listLimit ?? '—'})
                  </span>
                ) : meta?.polarionTotal != null ? (
                  <span className="text-gray-500"> · Polarion {meta.polarionTotal}건</span>
                ) : null}
              </>
            )}
          </p>
          <span className="text-xs text-gray-600 px-2 py-1 border border-surface-border rounded bg-white">
            정렬: updated ↓
          </span>
        </div>

        <RequirementsReviewStatusCards
          cards={statusCards}
          stageFilter={stageFilter}
          onStageFilter={setStageFilter}
        />

        <RequirementsReviewTable rows={filteredRows} onIdClick={setDetailRow} />
      </div>

      <RequirementsReviewDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </>
  )
}
