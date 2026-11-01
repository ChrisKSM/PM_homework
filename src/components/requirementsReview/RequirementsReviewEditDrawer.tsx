import { X } from 'lucide-react'
import { MOCK_CUSTOM_LABEL_POOL } from '../../data/requirementsReviewMock'
import type { RequirementsReviewMongoOverlay, RequirementsReviewRow } from '../../types/requirementsReview'

interface Props {
  open: boolean
  row: RequirementsReviewRow | null
  draft: RequirementsReviewMongoOverlay | null
  onClose: () => void
  onChange: (patch: Partial<RequirementsReviewMongoOverlay>) => void
  onSave: () => void
}

export default function RequirementsReviewEditDrawer({
  open,
  row,
  draft,
  onClose,
  onChange,
  onSave,
}: Props) {
  if (!open || !row || !draft) return null

  const toggleLabel = (label: string) => {
    const set = new Set(draft.customLabels)
    if (set.has(label)) set.delete(label)
    else set.add(label)
    onChange({ customLabels: [...set] })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-surface-border z-50 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <p className="text-xs text-gray-500 font-medium">Mongo overlay · 편집</p>
            <h2 className="text-sm font-bold text-gray-900 truncate">{row.id}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-page text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <p className="text-sm text-gray-700 leading-relaxed">{row.title}</p>

          <div>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Custom labels</p>
            <div className="flex flex-wrap gap-2">
              {MOCK_CUSTOM_LABEL_POOL.map((label) => {
                const active = draft.customLabels.includes(label)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleLabel(label)}
                    className={
                      active
                        ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-violet-600 text-white'
                        : 'px-2.5 py-1 rounded-full text-xs font-medium bg-surface-page border border-surface-border text-gray-700'
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">5.1 적용시점</label>
              <input
                className="w-full text-sm border border-surface-border rounded-lg px-3 py-2"
                value={draft.appliedAt}
                placeholder="예: 2026-Q2"
                onChange={(e) => onChange({ appliedAt: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">5.1 개발기간</label>
              <input
                className="w-full text-sm border border-surface-border rounded-lg px-3 py-2"
                value={draft.devPeriod}
                placeholder="예: 8주"
                onChange={(e) => onChange({ devPeriod: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">5.1 개발 주체</label>
              <input
                className="w-full text-sm border border-surface-border rounded-lg px-3 py-2"
                value={draft.devOwner}
                placeholder="예: Audio Platform"
                onChange={(e) => onChange({ devOwner: e.target.value })}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 border-t border-surface-border pt-3">
            저장 시 localStorage mock sync · 추후{' '}
            <code className="text-[11px] bg-surface-page px-1 rounded">databases.connect()</code> +{' '}
            <code className="text-[11px] bg-surface-page px-1 rounded">auth.valid(..., req-review-editor)</code>
          </p>
        </div>

        <div className="px-5 py-4 border-t border-surface-border flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-surface-border text-sm font-medium text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            저장 (mock sync)
          </button>
        </div>
      </aside>
    </>
  )
}
