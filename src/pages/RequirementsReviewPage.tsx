import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Database, Loader2, RefreshCw, Shield } from 'lucide-react'
import Header from '../components/layout/Header'
import RequirementsReviewFilters from '../components/requirementsReview/RequirementsReviewFilters'
import RequirementsReviewTable from '../components/requirementsReview/RequirementsReviewTable'
import RequirementsReviewEditDrawer from '../components/requirementsReview/RequirementsReviewEditDrawer'
import {
  buildAlmQueryPreview,
  MOCK_CUSTOM_LABEL_POOL,
} from '../data/requirementsReviewMock'
import type {
  OsType,
  ProductCategory,
  RequirementsReviewMongoOverlay,
  RequirementsReviewRow,
  RequirementsReviewSortKey,
} from '../types/requirementsReview'
import {
  canEditRequirementsReview,
  getMockRequirementsReviewRole,
  REQ_REVIEW_EDITOR_ROLE,
  setMockRequirementsReviewRole,
  type RequirementsReviewMockRole,
} from '../utils/requirementsReviewAuth'
import { useRequirementsReviewPrd } from '../hooks/useRequirementsReviewPrd'
import { modelStatusApi } from '../api/modelStatusApi'
import {
  listRequirementsReviewModelCodes,
  mapPrdItemToReviewRow,
} from '../utils/requirementsReviewFromPrd'

const OVERLAY_STORAGE_KEY = 'req-review-mongo-overlay-v1'

function loadOverlayMap(): Record<string, RequirementsReviewMongoOverlay> {
  try {
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, RequirementsReviewMongoOverlay>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function sortRows(
  rows: RequirementsReviewRow[],
  sortKey: RequirementsReviewSortKey,
  sortLabel: string
): RequirementsReviewRow[] {
  const copy = [...rows]
  if (sortKey === 'customLabel' && sortLabel) {
    copy.sort((a, b) => {
      const aHas = a.customLabels.includes(sortLabel) ? 0 : 1
      const bHas = b.customLabels.includes(sortLabel) ? 0 : 1
      if (aHas !== bHas) return aHas - bHas
      return a.id.localeCompare(b.id)
    })
    return copy
  }
  copy.sort((a, b) => {
    switch (sortKey) {
      case 'title':
        return a.title.localeCompare(b.title, 'ko')
      case 'appliedModel':
        return a.appliedModel.localeCompare(b.appliedModel)
      case 'appliedAt':
        return (b.appliedAt || '').localeCompare(a.appliedAt || '')
      case 'devPeriod':
        return (a.devPeriod || '').localeCompare(b.devPeriod || '')
      default:
        return a.id.localeCompare(b.id)
    }
  })
  return copy
}

export default function RequirementsReviewPage() {
  const modelCodes = useMemo(() => listRequirementsReviewModelCodes(), [])
  const [selectedModel, setSelectedModel] = useState(modelCodes[0] ?? 'H7_VI')
  const [mockRole, setMockRole] = useState<RequirementsReviewMockRole>(() => getMockRequirementsReviewRole())
  const [overlayMap, setOverlayMap] = useState<Record<string, RequirementsReviewMongoOverlay>>(() => loadOverlayMap())

  const [osType, setOsType] = useState<OsType | 'all'>('all')
  const [productCategory, setProductCategory] = useState<ProductCategory | 'all'>('all')
  const [appliedModel, setAppliedModel] = useState('all')
  const [labelFilter, setLabelFilter] = useState('all')
  const [sortKey, setSortKey] = useState<RequirementsReviewSortKey>('id')
  const [sortLabel, setSortLabel] = useState('')
  const [groupByOs, setGroupByOs] = useState(true)

  const [editRow, setEditRow] = useState<RequirementsReviewRow | null>(null)
  const [draft, setDraft] = useState<RequirementsReviewMongoOverlay | null>(null)

  const qc = useQueryClient()
  const { data, isPending, isFetching, isError, error, refetch } = useRequirementsReviewPrd(selectedModel)
  const meta = data?.meta
  const almQueryFragment =
    meta?.winningQuery || buildAlmQueryPreview({ osType, productCategory, appliedModel, label: labelFilter })

  const canEdit = canEditRequirementsReview(mockRole)

  const allRows = useMemo(() => {
    const items = data?.items ?? []
    return items.map((item) =>
      mapPrdItemToReviewRow(item, selectedModel, overlayMap[item.id], almQueryFragment)
    )
  }, [data?.items, selectedModel, overlayMap, almQueryFragment])

  const modelOptions = useMemo(
    () => [...new Set(allRows.map((r) => r.appliedModel).filter(Boolean))].sort(),
    [allRows]
  )

  const labelOptions = useMemo(() => {
    const fromRows = new Set<string>()
    allRows.forEach((r) => r.customLabels.forEach((l) => fromRows.add(l)))
    MOCK_CUSTOM_LABEL_POOL.forEach((l) => fromRows.add(l))
    return [...fromRows].sort()
  }, [allRows])

  const filteredRows = useMemo(() => {
    let list = allRows
    if (osType !== 'all') list = list.filter((r) => r.osType === osType)
    if (productCategory !== 'all') list = list.filter((r) => r.productCategory === productCategory)
    if (appliedModel !== 'all') list = list.filter((r) => r.appliedModel === appliedModel)
    if (labelFilter !== 'all') list = list.filter((r) => r.customLabels.includes(labelFilter))
    return sortRows(list, sortKey, sortLabel)
  }, [allRows, osType, productCategory, appliedModel, labelFilter, sortKey, sortLabel])

  const almQuery = useMemo(() => {
    const base = meta?.winningQuery || buildAlmQueryPreview({ osType, productCategory, appliedModel, label: labelFilter })
    if (labelFilter !== 'all') {
      return `${base} /* UI label: ${labelFilter} (Milvus/local) */`
    }
    return base
  }, [meta?.winningQuery, osType, productCategory, appliedModel, labelFilter])

  const saveLabelMutation = useMutation({
    mutationFn: async (args: { prdId: string; reviewLabel: string; almLabels: string[] }) =>
      modelStatusApi.savePrdReviewLabel({
        model: selectedModel,
        prdId: args.prdId,
        reviewLabel: args.reviewLabel,
        almLabels: args.almLabels,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['requirements-review-prd', selectedModel] })
      void qc.invalidateQueries({ queryKey: ['model-status-prd', selectedModel] })
    },
  })

  const switchRole = (role: RequirementsReviewMockRole) => {
    setMockRequirementsReviewRole(role)
    setMockRole(role)
  }

  const openEdit = useCallback(
    (row: RequirementsReviewRow) => {
      if (!canEdit) return
      setEditRow(row)
      setDraft({
        customLabels: [...row.customLabels],
        appliedAt: row.appliedAt,
        devPeriod: row.devPeriod,
        devOwner: row.devOwner,
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy,
      })
    },
    [canEdit]
  )

  const saveOverlay = async () => {
    if (!editRow || !draft) return
    const reviewLabel = draft.customLabels.join(', ')
    const next: RequirementsReviewMongoOverlay = {
      ...draft,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: mockRole === 'editor' ? 'mock-editor' : 'mock-viewer',
    }
    const map = { ...overlayMap, [editRow.id]: next }
    setOverlayMap(map)
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(map))
    try {
      await saveLabelMutation.mutateAsync({
        prdId: editRow.id,
        reviewLabel,
        almLabels: [],
      })
    } catch {
      /* local overlay saved; BE label sync failed */
    }
    setEditRow(null)
    setDraft(null)
  }

  const apiTotal = meta?.total ?? data?.items?.length ?? 0

  return (
    <>
      <Header
        title="요구사항 검토"
        subtitle="Polarion PRD (GET /api/model-status/prd) · Labels는 Milvus BE + 로컬 메타 overlay"
      />

      <div className="pt-16 p-6 space-y-6 max-w-[1400px]">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Polarion 적용모델 (API)
            </label>
            <select
              className="text-sm border border-surface-border rounded-lg px-3 py-2 bg-white min-w-[160px]"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {modelCodes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border text-sm text-gray-700 hover:bg-surface-page"
          >
            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            새로고침
          </button>
          {meta?.source && (
            <p className="text-xs text-gray-500 pb-2">
              source: <span className="font-mono">{meta.source}</span>
              {meta.polarionUrl && (
                <>
                  {' '}
                  ·{' '}
                  <a href={meta.polarionUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                    Polarion UI
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        {(isError || meta?.error) && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">PRD API 오류</p>
              <p className="mt-1">{meta?.error || (error instanceof Error ? error.message : String(error))}</p>
              <p className="text-xs mt-1 text-red-700">Network: GET /api/model-status/prd?model={selectedModel}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <Database className="text-indigo-600 shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-gray-800">
              <p className="font-semibold text-gray-900">ALM + Milvus labels</p>
              <p className="text-gray-600 mt-1 leading-relaxed">
                목록은 BE Polarion PRD API. 검토 라벨은 PUT /api/model-status/prd/labels (Milvus). 적용시점·개발기간·주체는
                localStorage overlay.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Shield className="text-amber-700 shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-gray-800 w-full">
              <p className="font-semibold text-gray-900">편집 권한 (mock → DEJ auth)</p>
              <p className="text-gray-600 mt-1">
                BE 연동 시{' '}
                <code className="text-xs bg-white px-1 rounded">auth.valid(request, required_roles=[&quot;{REQ_REVIEW_EDITOR_ROLE}&quot;])</code>
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => switchRole('viewer')}
                  className={
                    mockRole === 'viewer'
                      ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-white'
                      : 'px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border bg-white'
                  }
                >
                  Viewer
                </button>
                <button
                  type="button"
                  onClick={() => switchRole('editor')}
                  className={
                    mockRole === 'editor'
                      ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white'
                      : 'px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border bg-white'
                  }
                >
                  Editor ({REQ_REVIEW_EDITOR_ROLE})
                </button>
              </div>
            </div>
          </div>
        </div>

        <RequirementsReviewFilters
          osType={osType}
          productCategory={productCategory}
          appliedModel={appliedModel}
          labelFilter={labelFilter}
          sortKey={sortKey}
          sortLabel={sortLabel}
          modelOptions={modelOptions}
          labelOptions={labelOptions}
          almQuery={almQuery}
          onOsTypeChange={setOsType}
          onProductCategoryChange={setProductCategory}
          onAppliedModelChange={setAppliedModel}
          onLabelFilterChange={setLabelFilter}
          onSortKeyChange={(v) => setSortKey(v as RequirementsReviewSortKey)}
          onSortLabelChange={setSortLabel}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Polarion 로딩…
              </span>
            ) : (
              <>
                <span className="font-semibold text-gray-900">{filteredRows.length}</span>건 표시 · API{' '}
                <span className="font-semibold text-gray-900">{apiTotal}</span>건
              </>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByOs}
              onChange={(e) => setGroupByOs(e.target.checked)}
              className="rounded border-gray-300"
            />
            OS type별 섹션 헤더로 그룹
          </label>
        </div>

        <RequirementsReviewTable
          rows={filteredRows}
          groupByOs={groupByOs}
          canEdit={canEdit}
          onEditRow={openEdit}
        />
      </div>

      <RequirementsReviewEditDrawer
        open={!!editRow}
        row={editRow}
        draft={draft}
        onClose={() => {
          setEditRow(null)
          setDraft(null)
        }}
        onChange={(patch) => draft && setDraft({ ...draft, ...patch })}
        onSave={() => void saveOverlay()}
      />
    </>
  )
}
