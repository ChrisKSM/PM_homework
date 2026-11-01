import clsx from 'clsx'
import type { OsType, ProductCategory } from '../../types/requirementsReview'
import { OS_TYPE_LABELS, PRODUCT_CATEGORY_LABELS } from '../../types/requirementsReview'

interface Props {
  osType: OsType | 'all'
  productCategory: ProductCategory | 'all'
  appliedModel: string
  labelFilter: string
  sortKey: string
  sortLabel: string
  modelOptions: string[]
  labelOptions: string[]
  almQuery: string
  onOsTypeChange: (v: OsType | 'all') => void
  onProductCategoryChange: (v: ProductCategory | 'all') => void
  onAppliedModelChange: (v: string) => void
  onLabelFilterChange: (v: string) => void
  onSortKeyChange: (v: string) => void
  onSortLabelChange: (v: string) => void
}

const selectClass =
  'w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-lg-red/20 focus:border-lg-red'

export default function RequirementsReviewFilters({
  osType,
  productCategory,
  appliedModel,
  labelFilter,
  sortKey,
  sortLabel,
  modelOptions,
  labelOptions,
  almQuery,
  onOsTypeChange,
  onProductCategoryChange,
  onAppliedModelChange,
  onLabelFilterChange,
  onSortKeyChange,
  onSortLabelChange,
}: Props) {
  const osTabs: { id: OsType | 'all'; label: string }[] = [
    { id: 'all', label: '전체 OS' },
    { id: 'webOS', label: OS_TYPE_LABELS.webOS },
    { id: 'non-webOS', label: OS_TYPE_LABELS['non-webOS'] },
  ]

  const categories: { id: ProductCategory | 'all'; label: string }[] = [
    { id: 'all', label: '전체 카테고리' },
    ...(
      Object.entries(PRODUCT_CATEGORY_LABELS) as [ProductCategory, string][]
    ).map(([id, label]) => ({ id, label })),
  ]

  return (
    <div className="bg-white border border-surface-border rounded-xl p-5 space-y-5">
      <div>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">1. OS type</p>
        <div className="flex flex-wrap gap-2">
          {osTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onOsTypeChange(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                osType === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-surface-page text-gray-700 border-surface-border hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">2. Product category</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onProductCategoryChange(cat.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                productCategory === cat.id
                  ? 'bg-lg-red-light text-lg-red border-red-200'
                  : 'bg-white text-gray-700 border-surface-border hover:bg-surface-page'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            3. 적용모델
          </label>
          <select
            className={selectClass}
            value={appliedModel}
            onChange={(e) => onAppliedModelChange(e.target.value)}
          >
            <option value="all">전체</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            4. Labels (Mongo)
          </label>
          <select
            className={selectClass}
            value={labelFilter}
            onChange={(e) => onLabelFilterChange(e.target.value)}
          >
            <option value="all">전체</option>
            {labelOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            정렬
          </label>
          <select className={selectClass} value={sortKey} onChange={(e) => onSortKeyChange(e.target.value)}>
            <option value="id">ALM ID</option>
            <option value="title">제목</option>
            <option value="appliedModel">적용모델</option>
            <option value="customLabel">커스텀 Label 우선</option>
            <option value="appliedAt">적용시점</option>
            <option value="devPeriod">개발기간</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Label sort 기준
          </label>
          <select
            className={selectClass}
            value={sortLabel}
            disabled={sortKey !== 'customLabel'}
            onChange={(e) => onSortLabelChange(e.target.value)}
          >
            <option value="">— 선택 —</option>
            {labelOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">ALM query (preview)</p>
        <code className="block text-xs bg-surface-page border border-surface-border rounded-lg px-3 py-2 text-gray-700 font-mono break-all">
          {almQuery}
        </code>
        <p className="text-xs text-gray-500 mt-2">
          ALM REST 연동 전 mock · Mongo Labels/메타는 로컬 overlay (추후 Workspace DB sync)
        </p>
      </div>
    </div>
  )
}
