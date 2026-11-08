import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import Header from '../components/layout/Header'
import RequirementsReviewFilters from '../components/requirementsReview/RequirementsReviewFilters'
import RequirementsReviewTable from '../components/requirementsReview/RequirementsReviewTable'
import RequirementsReviewStatusCards, {
  buildStatusCardCounts,
} from '../components/requirementsReview/RequirementsReviewStatusCards'
import RequirementsReviewDetailModal from '../components/requirementsReview/RequirementsReviewDetailModal'
import { POLARION_PRD_UI, resolveApiModel } from '../data/requirementsReviewCatalog'
import type { OsType, ProductCategory, RequirementsReviewRow } from '../types/requirementsReview'
import { useRequirementsReviewPrd } from '../hooks/useRequirementsReviewPrd'
import { mapPrdItemToReviewRow } from '../utils/requirementsReviewFromPrd'
import { buildRequirementsReviewQueryPreview } from '../utils/requirementsReviewPolarionQuery'
import type { PrdWorkflowStageId } from '../utils/modelStatusPrdWorkflow'
import { PRD_WORKFLOW_COLUMNS } from '../utils/modelStatusPrdWorkflow'

const DEFAULT_API_MODEL = 'H7_VI'

function modelMatchesApplied(rowModel: string, appliedModelId: string): boolean {
  if (appliedModelId === 'all') return true
  const a = appliedModelId.toUpperCase()
  const r = rowModel.toUpperCase()
  return r === a || r.includes(a) || a.includes(r)
}

function sortByUpdated(rows: RequirementsReviewRow[]): RequirementsReviewRow[] {
  return [...rows].sort((a, b) => {
    const ua = a.updated || ''
    const ub = b.updated || ''
    if (ua !== ub) return ub.localeCompare(ua)
    return a.id.localeCompare(b.id)
  })
}

export default function RequirementsReviewPage() {
  const [productCategory, setProductCategory] = useState<ProductCategory | 'all'>('soundbar')
  const [appliedModelId, setAppliedModelId] = useState('H7_VI')
  const [osType, setOsType] = useState<OsType | 'all'>('all')
  const [stageFilter, setStageFilter] = useState<PrdWorkflowStageId | 'total' | null>(null)
  const [detailRow, setDetailRow] = useState<RequirementsReviewRow | null>(null)

  const apiModel = useMemo(
    () => (appliedModelId === 'all' ? DEFAULT_API_MODEL : resolveApiModel(appliedModelId)),
    [appliedModelId]
  )

  const { data, isPending, isFetching, isError, error, refetch } = useRequirementsReviewPrd(apiModel)
  const meta = data?.meta
  const workflowColumns = data?.workflowColumns?.length ? data.workflowColumns : PRD_WORKFLOW_COLUMNS

  const almQuery = useMemo(
    () =>
      buildRequirementsReviewQueryPreview({
        productCategory,
        appliedModelId,
        osType,
        winningQuery: meta?.winningQuery,
      }),
    [productCategory, appliedModelId, osType, meta?.winningQuery]
  )

  const allRows = useMemo(() => {
    const items = data?.items ?? []
    const fragment = meta?.winningQuery || almQuery
    return items.map((item) => mapPrdItemToReviewRow(item, apiModel, undefined, fragment))
  }, [data?.items, apiModel, meta?.winningQuery, almQuery])

  const filteredRows = useMemo(() => {
    let list = allRows
    if (productCategory !== 'all') {
      list = list.filter((r) => r.productCategory === productCategory)
    }
    if (appliedModelId !== 'all') {
      list = list.filter((r) => modelMatchesApplied(r.appliedModel, appliedModelId))
    }
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
  }, [allRows, productCategory, appliedModelId, osType, stageFilter])

  const statusCards = useMemo(() => {
    let base = allRows
    if (productCategory !== 'all') base = base.filter((r) => r.productCategory === productCategory)
    if (appliedModelId !== 'all') base = base.filter((r) => modelMatchesApplied(r.appliedModel, appliedModelId))
    if (osType !== 'all') base = base.filter((r) => r.osType === osType)
    return buildStatusCardCounts(base, workflowColumns)
  }, [allRows, productCategory, appliedModelId, osType, workflowColumns])

  useEffect(() => {
    setStageFilter(null)
  }, [productCategory, appliedModelId, osType, apiModel])

  const onCategoryChange = useCallback((cat: ProductCategory | 'all') => {
    setProductCategory(cat)
  }, [])

  return (
    <>
      <Header
        title="요구사항 검토"
        subtitle="Polarion PRD · category / components / labels 필터 · status 요약 · updated 정렬"
      />

      <div className="pt-16 p-6 space-y-6 max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            API 조회 모델: <span className="font-mono font-semibold text-gray-900">{apiModel}</span>
            {appliedModelId === 'all' ? ' (적용모델 전체 — 기본 fetch)' : null}
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
            </div>
          </div>
        )}

        <RequirementsReviewFilters
          productCategory={productCategory}
          appliedModelId={appliedModelId}
          osType={osType}
          almQuery={almQuery}
          onProductCategoryChange={onCategoryChange}
          onAppliedModelChange={setAppliedModelId}
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
              </>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            정렬
            <span className="px-2 py-1 rounded border border-surface-border bg-white text-xs font-medium">
              updated (내림차순)
            </span>
          </label>
        </div>

        <RequirementsReviewStatusCards
          cards={statusCards}
          stageFilter={stageFilter}
          onStageFilter={setStageFilter}
        />

        <RequirementsReviewTable rows={filteredRows} onTitleClick={setDetailRow} />
      </div>

      <RequirementsReviewDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </>
  )
}
