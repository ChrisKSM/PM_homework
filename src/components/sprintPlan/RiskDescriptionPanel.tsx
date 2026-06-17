import { ExternalLink, X } from 'lucide-react'
import type { SprintPlanRisk } from '../../types/sprintPlan'
import JiraLinkedText from './JiraLinkedText'

interface RiskDescriptionPanelProps {
  risk: SprintPlanRisk | null
  browseBase?: string
  onClose: () => void
}

export default function RiskDescriptionPanel({ risk, browseBase, onClose }: RiskDescriptionPanelProps) {
  if (!risk) return null

  const base = browseBase ?? 'https://harmony.lge.com:8443/issue/browse'

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:bg-transparent lg:pointer-events-none"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-16 bottom-0 z-50 w-full max-w-lg bg-white border-l border-surface-border flex flex-col"
        role="dialog"
        aria-labelledby="risk-panel-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-surface-muted shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-lg-red mb-1">RISK · labels=risk</p>
            <h2 id="risk-panel-title" className="text-sm font-bold text-gray-900 leading-snug">
              {risk.summary}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <a
                href={risk.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono font-semibold text-lg-red hover:underline"
              >
                {risk.issueKey}
                <ExternalLink size={12} />
              </a>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{risk.id}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{risk.category}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-surface-page transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Description</p>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-surface-page border border-surface-border rounded-lg px-4 py-3">
              <JiraLinkedText text={risk.description} browseBase={base} />
            </div>
          </section>

          <section>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Environment</p>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-surface-page border border-surface-border rounded-lg px-4 py-3 font-mono text-[12px]">
              <JiraLinkedText text={risk.environment} browseBase={base} />
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
