import clsx from 'clsx'
import { X } from 'lucide-react'
import type { StoryDetail } from '../../types/planning'

interface Props {
  detail: StoryDetail | null
  onClose: () => void
}

export default function StoryDetailDrawer({ detail, onClose }: Props) {
  if (!detail) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} aria-hidden />
      <aside
        className="fixed top-16 right-0 bottom-0 z-50 w-full max-w-md bg-white border-l border-surface-border overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-surface-border px-5 py-4 flex items-start justify-between">
          <div>
            <p className="font-mono text-sm text-lg-red font-bold">{detail.issueKey}</p>
            <h3 className="text-base font-bold text-gray-900 mt-1">{detail.summary}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-surface-page"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Gate', detail.gate],
              ['Sprint', detail.sprint],
              ['Epic', detail.epic],
            ].map(([k, v]) => (
              <div key={k} className="col-span-2 sm:col-span-1">
                <dt className="text-xs text-gray-500 font-semibold uppercase">{k}</dt>
                <dd className="text-gray-800 font-medium mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Sprint Goal</h4>
            <p className="text-sm text-gray-700 bg-surface-page border border-surface-border rounded-lg px-3 py-2">
              {detail.sprintGoal}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              Acceptance Criteria ({detail.acceptanceCriteria.length})
            </h4>
            {detail.acceptanceCriteria.length === 0 ? (
              <p className="text-sm text-lg-red font-medium">AC 미작성 — Given-When-Then 3개 이상 필요</p>
            ) : (
              <ul className="space-y-2">
                {detail.acceptanceCriteria.map((ac, i) => (
                  <li key={i} className="text-sm text-gray-700 bg-surface-page border border-surface-border rounded-lg px-3 py-2">
                    {ac}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Definition of Done</h4>
            <ul className="space-y-1.5">
              {detail.dodItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  <span
                    className={clsx(
                      'w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold',
                      item.done ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-gray-300 text-gray-400'
                    )}
                  >
                    {item.done ? '✓' : ''}
                  </span>
                  <span className={item.done ? 'text-gray-800' : 'text-gray-500'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">우선순위 근거</h4>
            <p className="text-sm text-gray-700">
              {detail.priorityRationale ?? (
                <span className="text-amber-600 font-medium">미기재 — MoSCoW/WSJF 근거 필요</span>
              )}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
