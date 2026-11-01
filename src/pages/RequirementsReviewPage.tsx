import { useCallback, useMemo, useState } from 'react'
import { Database, Shield } from 'lucide-react'
import Header from '../components/layout/Header'
import RequirementsReviewFilters from '../components/requirementsReview/RequirementsReviewFilters'
import RequirementsReviewTable from '../components/requirementsReview/RequirementsReviewTable'
import RequirementsReviewEditDrawer from '../components/requirementsReview/RequirementsReviewEditDrawer'
import {
  buildAlmQueryPreview,
  DEFAULT_MONGO_OVERLAY,
  MOCK_CUSTOM_LABEL_POOL,
  MOCK_MONGO_SEED,
  REQUIREMENTS_REVIEW_ALM_MOCK,
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

function mergeRows(overlayMap: Record<string, RequirementsReviewMongoOverlay>): RequirementsReviewRow[] {
  return REQUIREMENTS_REVIEW_ALM_MOCK.map((alm) => {
    const seed = MOCK_MONGO_SEED[alm.id]
    const stored = overlayMap[alm.id]
    const base: RequirementsReviewMongoOverlay = {
      ...DEFAULT_MONGO_OVERLAY,
      ...seed,
      customLabels: [...(seed?.customLabels ?? DEFAULT_MONGO_OVERLAY.customLabels)],
    }
    if (stored) {
      return {
        ...alm,
        ...base,
        ...stored,
        customLabels: stored.customLabels ?? base.customLabels,
      }
    }
    return { ...alm, ...base }
  })
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

  const canEdit = canEditRequirementsReview(mockRole)

  const allRows = useMemo(() => mergeRows(overlayMap), [overlayMap])

  const modelOptions = useMemo(
    () => [...new Set(allRows.map((r) => r.appliedModel))].sort(),
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

  const almQuery = useMemo(
    () =>
      buildAlmQueryPreview({
        osType,
        productCategory,
        appliedModel,
        label: labelFilter,
      }),
    [osType, productCategory, appliedModel, labelFilter]
  )

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

  const saveOverlay = () => {
    if (!editRow || !draft) return
    const next: RequirementsReviewMongoOverlay = {
      ...draft,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updatedBy: mockRole === 'editor' ? 'mock-editor' : 'mock-viewer',
    }
    const map = { ...overlayMap, [editRow.id]: next }
    setOverlayMap(map)
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(map))
    setEditRow(null)
    setDraft(null)
  }

  return (
    <>
      <Header
        title="요구사항 검토"
        subtitle="ALM query + Mongo Labels/메타 overlay (mock) · OS / 카테고리 / 적용모델 / Label 정렬"
      />

      <div className="pt-16 p-6 space-y-6 max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <Database className="text-indigo-600 shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-gray-800">
              <p className="font-semibold text-gray-900">MongoDB overlay (mock)</p>
              <p className="text-gray-600 mt-1 leading-relaxed">
                ALM 쓰기 권한 없이 Labels, 적용시점, 개발기간, 개발 주체를 Workspace DB에 저장·동기화할 예정입니다.
                지금은 localStorage로 편집 결과를 유지합니다.
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
                <span className="text-xs text-gray-500 self-center">
                  또는 URL <code className="bg-white px-1 rounded">?role=editor</code>
                </span>
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
            <span className="font-semibold text-gray-900">{filteredRows.length}</span>건 · ALM mock{' '}
            {REQUIREMENTS_REVIEW_ALM_MOCK.length}건
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
        onSave={saveOverlay}
      />
    </>
  )
}
