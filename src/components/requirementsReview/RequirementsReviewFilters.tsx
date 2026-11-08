import clsx from 'clsx'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OsType, ProductCategory } from '../../types/requirementsReview'
import {
  APPLIED_MODEL_OPTIONS,
  OS_LABEL_OPTIONS,
  POLARION_PRD_UI,
  POLARION_QUERIES,
  PRODUCT_CATEGORY_OPTIONS,
  appliedModelsForCategory,
} from '../../data/requirementsReviewCatalog'

interface Props {
  productCategory: ProductCategory | 'all'
  appliedModelId: string
  osType: OsType | 'all'
  almQuery: string
  onProductCategoryChange: (v: ProductCategory | 'all') => void
  onAppliedModelChange: (v: string) => void
  onOsTypeChange: (v: OsType | 'all') => void
}

const selectClass =
  'w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-lg-red/20 focus:border-lg-red'

function StepLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-0.5"
    >
      {children}
      <ExternalLink size={10} />
    </a>
  )
}

export default function RequirementsReviewFilters({
  productCategory,
  appliedModelId,
  osType,
  almQuery,
  onProductCategoryChange,
  onAppliedModelChange,
  onOsTypeChange,
}: Props) {
  const modelOptions =
    productCategory === 'all' ? APPLIED_MODEL_OPTIONS : appliedModelsForCategory(productCategory)

  return (
    <div className="bg-white border border-surface-border rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">1. 요구사항 (기본 PRD)</p>
          <p className="text-sm text-gray-600 mt-1">Polarion AVSWReqMgmt · type PRD</p>
        </div>
        <StepLink href={POLARION_PRD_UI}>Polarion PRD 전체</StepLink>
      </div>

      <Divider />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">2. Product category</p>
          <StepLink href={POLARION_QUERIES.productCategory}>HAS_VALUE:productCategory.KEY</StepLink>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onProductCategoryChange('all')}
            className={pillClass(productCategory === 'all')}
          >
            전체
          </button>
          {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onProductCategoryChange(cat.id)}
              className={pillClass(productCategory === cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">3. 적용모델</p>
            <StepLink href={POLARION_QUERIES.components}>HAS_VALUE:components</StepLink>
          </div>
          <select
            className={selectClass}
            value={appliedModelId}
            onChange={(e) => onAppliedModelChange(e.target.value)}
          >
            <option value="all">선택 — 전체</option>
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.componentHint})
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">4. Labels (ALM)</p>
            <StepLink href={POLARION_QUERIES.labels}>HAS_VALUE:labels</StepLink>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onOsTypeChange('all')} className={pillClass(osType === 'all')}>
              전체
            </button>
            {OS_LABEL_OPTIONS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onOsTypeChange(tab.id)}
                className={pillClass(osType === tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Divider />

      <div>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">ALM query (preview)</p>
        <code className="block text-xs bg-surface-page border border-surface-border rounded-lg px-3 py-2 text-gray-700 font-mono break-all">
          {almQuery}
        </code>
        <p className="text-xs text-gray-500 mt-2">
          표시 순서: updated (Polarion{' '}
          <a href={POLARION_QUERIES.updatedToday} className="text-indigo-600 underline" target="_blank" rel="noreferrer">
            updated:$today$
          </a>
          )
        </p>
      </div>
    </div>
  )
}

function pillClass(active: boolean) {
  return clsx(
    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
    active
      ? 'bg-indigo-600 text-white border-indigo-600'
      : 'bg-white text-gray-700 border-surface-border hover:bg-surface-page'
  )
}

function Divider() {
  return <hr className="border-surface-border" />
}
