import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import Header from '../components/layout/Header'
import RequirementsReviewFilters from '../components/requirementsReview/RequirementsReviewFilters'
import RequirementsReviewTable from '../components/requirementsReview/RequirementsReviewTable'
import RequirementsReviewStatusCards, {
  buildStatusCardCounts,
} from '../components/requirementsReview/RequirementsReviewStatusCards'
import RequirementsReviewDetailModal from '../components/requirementsReview/RequirementsReviewDetailModal'
import RequirementsReviewPlanFilters from '../components/requirementsReview/RequirementsReviewPlanFilters'
import RequirementsReviewPlanForm from '../components/requirementsReview/RequirementsReviewPlanForm'
import { POLARION_PRD_UI, resolveRequirementsReviewApiModel, type CategoryScope } from '../data/requirementsReviewCatalog'
import type {
  ApplyScope,
  OsType,
  RequirementsReviewPlan,
  RequirementsReviewRow,
} from '../types/requirementsReview'
import { useRequirementsReviewPrd } from '../hooks/useRequirementsReviewPrd'
import { useRequirementsReviewPlans } from '../hooks/useRequirementsReviewPlans'
import { PLAN_FILTER_UNSET, initiativeJiraKeys } from '../utils/requirementsReviewPlan'
import { mapPrdItemToReviewRow } from '../utils/requirementsReviewFromPrd'
import { requirementsReviewRowNeedsPrefetch } from '../utils/requirementsReviewPrefetch'
import { buildRequirementsReviewQueryPreview } from '../utils/requirementsReviewPolarionQuery'
import { modelStatusApi } from '../api/modelStatusApi'
import type { PrdWorkflowStageId } from '../utils/modelStatusPrdWorkflow'
import { PRD_WORKFLOW_COLUMNS } from '../utils/modelStatusPrdWorkflow'

const PRD_ROW_PREFETCH_CONCURRENCY = 3
const PRD_ROW_PREFETCH_MAX = 80

function matchesApplyMonth(plan: RequirementsReviewPlan | undefined, applyMonth: string): boolean {
  if (applyMonth === 'all') return true
  if (applyMonth === PLAN_FILTER_UNSET) return !plan?.applyMonth
  return plan?.applyMonth === applyMonth
}

function matchesApplyScope(plan: RequirementsReviewPlan | undefined, scope: ApplyScope | 'all'): boolean {
  return scope === 'all' || Boolean(plan?.applyScopes?.includes(scope))
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
  const [category, setCategory] = useState<CategoryScope>('all')
  const [subModelId, setSubModelId] = useState('all')
  const [osType, setOsType] = useState<OsType | 'all'>('all')
  const [stageFilter, setStageFilter] = useState<PrdWorkflowStageId | 'total' | null>(null)
  const [detailRow, setDetailRow] = useState<RequirementsReviewRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rowOverrides, setRowOverrides] = useState<Record<string, RequirementsReviewRow>>({})
  const [applyMonth, setApplyMonth] = useState<string>('all')
  const [applyScope, setApplyScope] = useState<ApplyScope | 'all'>('all')
  const plans = useRequirementsReviewPlans()
  const { plansById } = plans

  const apiModel = useMemo(
    () => resolveRequirementsReviewApiModel(category, subModelId),
    [category, subModelId]
  )

  const { data, isPending, isFetching, isError, error, refetch, dataUpdatedAt } =
    useRequirementsReviewPrd(apiModel)
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

  const osRows = useMemo(() => {
    const list = allRows.map((r) => rowOverrides[r.id] ?? r)
    return osType === 'all' ? list : list.filter((r) => r.osType === osType)
  }, [allRows, rowOverrides, osType])

  const planFacets = useMemo(() => {
    const byScope = osRows.filter((r) => matchesApplyScope(plansById[r.id], applyScope))
    const monthMap = new Map<string, number>()
    let unsetCount = 0
    for (const r of byScope) {
      const m = plansById[r.id]?.applyMonth
      if (m) monthMap.set(m, (monthMap.get(m) ?? 0) + 1)
      else unsetCount += 1
    }
    const byMonth = osRows.filter((r) => matchesApplyMonth(plansById[r.id], applyMonth))
    const scopeCounts: Record<ApplyScope, number> = { product: 0, app: 0, tv: 0 }
    for (const r of byMonth) {
      for (const s of plansById[r.id]?.applyScopes ?? []) scopeCounts[s] += 1
    }
    return {
      monthCounts: [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      unsetCount,
      totalCount: byScope.length,
      scopeCounts,
    }
  }, [osRows, plansById, applyMonth, applyScope])

  const planRows = useMemo(
    () =>
      osRows.filter(
        (r) => matchesApplyMonth(plansById[r.id], applyMonth) && matchesApplyScope(plansById[r.id], applyScope)
      ),
    [osRows, plansById, applyMonth, applyScope]
  )

  const teamSuggestions = useMemo(
    () => [...new Set(Object.values(plansById).map((p) => p.devTeam).filter(Boolean))].sort(),
    [plansById]
  )
  const knownMonths = useMemo(
    () => Object.values(plansById).map((p) => p.applyMonth).filter(Boolean),
    [plansById]
  )

  const filteredRows = useMemo(() => {
    let list = planRows
    if (stageFilter && stageFilter !== 'total') {
      list = list.filter((r) =>
        stageFilter === 'other'
          ? r.workflowStageId === 'other' || !r.workflowStageId
          : r.workflowStageId === stageFilter
      )
    }
    return sortByUpdated(list)
  }, [planRows, stageFilter])

  const statusCards = useMemo(
    () => buildStatusCardCounts(planRows, workflowColumns),
    [planRows, workflowColumns]
  )

  useEffect(() => {
    setSubModelId('all')
    setStageFilter(null)
  }, [category])

  useEffect(() => {
    setStageFilter(null)
  }, [subModelId, osType, apiModel, applyMonth, applyScope])

  useEffect(() => {
    setRowOverrides({})
  }, [dataUpdatedAt, apiModel])

  useEffect(() => {
    if (!data?.items?.length || isFetching) return
    const fragment = meta?.winningQuery || almQuery
    const targets = allRows
      .filter((r) => requirementsReviewRowNeedsPrefetch(r))
      .slice(0, PRD_ROW_PREFETCH_MAX)
    if (!targets.length) return

    let cancelled = false
    const queue = [...targets]

    const worker = async () => {
      while (!cancelled) {
        const row = queue.shift()
        if (!row) break
        try {
          const { item } = await modelStatusApi.getPrdWorkitem(row.id)
          if (cancelled) return
          const enriched = mapPrdItemToReviewRow(item, apiModel, undefined, fragment)
          setRowOverrides((prev) => {
            if (prev[row.id]) return prev
            return { ...prev, [row.id]: enriched }
          })
        } catch {
          /* Polarion 429 등 — 행은 stub 유지 */
        }
      }
    }

    void Promise.all(
      Array.from({ length: PRD_ROW_PREFETCH_CONCURRENCY }, () => worker())
    )
    return () => {
      cancelled = true
    }
  }, [allRows, apiModel, meta?.winningQuery, almQuery, data?.items?.length, isFetching])

  const onCategoryChange = useCallback((next: CategoryScope) => {
    setCategory(next)
  }, [])

  const onIdClick = useCallback(
    async (row: RequirementsReviewRow) => {
      setDetailRow(row)
      setDetailLoading(true)
      try {
        const { item } = await modelStatusApi.getPrdWorkitem(row.id)
        const fragment = meta?.winningQuery || almQuery
        const enriched = mapPrdItemToReviewRow(item, apiModel, undefined, fragment)
        setDetailRow(enriched)
        setRowOverrides((prev) => ({ ...prev, [row.id]: enriched }))
      } catch {
        setDetailRow(row)
      } finally {
        setDetailLoading(false)
      }
    },
    [almQuery, apiModel, meta?.winningQuery]
  )

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

        <RequirementsReviewPlanFilters
          {...planFacets}
          applyMonth={applyMonth}
          applyScope={applyScope}
          onApplyMonthChange={setApplyMonth}
          onApplyScopeChange={setApplyScope}
        />

        {plans.source === 'local' && !plans.isLoading ? (
          <div className="flex gap-2 items-start bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
            <AlertCircle size={16} className="shrink-0" />
            <p>
              적용 계획 API(<span className="font-mono">/api/model-status/prd/plans</span>) 미연결 — 이 브라우저에만
              임시 저장됩니다. {plans.loadError ? `(${plans.loadError})` : null}
            </p>
          </div>
        ) : null}

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

        <RequirementsReviewTable rows={filteredRows} plansById={plansById} onIdClick={onIdClick} />
      </div>

      <RequirementsReviewDetailModal
        row={detailRow}
        loading={detailLoading}
        planSlot={
          detailRow ? (
            <RequirementsReviewPlanForm
              key={detailRow.id}
              prdId={detailRow.id}
              initiativeKeys={initiativeJiraKeys(detailRow)}
              plan={plansById[detailRow.id]}
              teamSuggestions={teamSuggestions}
              knownMonths={knownMonths}
              source={plans.source}
              saving={plans.isSaving}
              onSave={plans.savePlan}
            />
          ) : null
        }
        onClose={() => {
          setDetailRow(null)
          setDetailLoading(false)
        }}
      />
    </>
  )
}
