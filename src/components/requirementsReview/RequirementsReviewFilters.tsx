import clsx from 'clsx'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OsType } from '../../types/requirementsReview'
import {
  CategoryScope,
  OS_LABEL_OPTIONS,
  POLARION_PRD_UI,
  POLARION_QUERIES,
  PRODUCT_CATEGORY_OPTIONS,
  categoryHasSubModels,
  subModelOptionsForCategory,
} from '../../data/requirementsReviewCatalog'

interface Props {
  category: CategoryScope
  subModelId: string
  osType: OsType | 'all'
  almQuery: string
  onCategoryChange: (v: CategoryScope) => void
  onSubModelChange: (v: string) => void
  onOsTypeChange: (v: OsType | 'all') => void
}

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
  category,
  subModelId,
  osType,
  almQuery,
  onCategoryChange,
  onSubModelChange,
  onOsTypeChange,
}: Props) {
  const subOptions = subModelOptionsForCategory(category)
  const showSubRow = categoryHasSubModels(category)

  return (
    <div className="bg-white border border-surface-border rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">Polarion AVSWReqMgmt · PRD</p>
        <StepLink href={POLARION_PRD_UI}>Polarion PRD</StepLink>
      </div>

      <Divider />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Product category</p>
          {category === 'all' ? (
            <StepLink href={POLARION_QUERIES.audioDivision}>division.KEY:6 (오디오)</StepLink>
          ) : (
            <StepLink href={POLARION_QUERIES.productCategory}>productCategory.KEY</StepLink>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onCategoryChange('all')} className={pillClass(category === 'all')}>
            전체
          </button>
          {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={pillClass(category === cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {category === 'soundbar' && <p className="text-xs text-gray-500 mt-2">검색: components:(S80C)</p>}
        {category === 'wireless-headset' && (
          <p className="text-xs text-gray-500 mt-2">검색: productCategory.KEY:무선헤드셋</p>
        )}
      </div>

      {showSubRow && (
        <div>
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">모델</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSubModelChange('all')}
              className={pillClass(subModelId === 'all', true)}
            >
              전체
            </button>
            {subOptions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSubModelChange(m.id)}
                className={pillClass(subModelId === m.id, true)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Divider />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Labels (ALM)</p>
          <StepLink href={POLARION_QUERIES.labels}>labels</StepLink>
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

      <Divider />

      <div>
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">ALM query (preview)</p>
        <code className="block text-xs bg-surface-page border border-surface-border rounded-lg px-3 py-2 text-gray-700 font-mono break-all">
          {almQuery}
        </code>
      </div>
    </div>
  )
}

function pillClass(active: boolean, muted = false) {
  return clsx(
    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
    active
      ? muted
        ? 'bg-violet-100 text-violet-900 border-violet-200'
        : 'bg-indigo-600 text-white border-indigo-600'
      : 'bg-white text-gray-700 border-surface-border hover:bg-surface-page'
  )
}

function Divider() {
  return <hr className="border-surface-border" />
}
