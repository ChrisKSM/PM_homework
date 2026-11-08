import clsx from 'clsx'
import { PRD_WORKFLOW_COLUMNS, type PrdWorkflowStageId } from '../../utils/modelStatusPrdWorkflow'

const CARD_STYLES: Record<string, string> = {
  draft: 'text-gray-700',
  review_request: 'text-amber-600',
  review_approved: 'text-blue-600',
  dev_review: 'text-indigo-600',
  planning_review: 'text-violet-600',
  dev_approved: 'text-emerald-600',
  rejected: 'text-red-600',
  other: 'text-gray-500',
  total: 'text-red-600',
}

export type StatusCardDef = {
  id: PrdWorkflowStageId | 'total'
  label: string
  count: number
}

interface Props {
  cards: StatusCardDef[]
  stageFilter: PrdWorkflowStageId | 'total' | null
  onStageFilter: (id: PrdWorkflowStageId | 'total' | null) => void
}

export default function RequirementsReviewStatusCards({ cards, stageFilter, onStageFilter }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onStageFilter(stageFilter === c.id ? null : c.id)}
          className={clsx(
            'rounded-xl border bg-white px-3 py-3 text-left transition-shadow hover:shadow-sm min-h-[72px]',
            stageFilter === c.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 truncate">{c.label}</p>
          <p
            className={clsx(
              'text-2xl font-bold tabular-nums mt-1',
              CARD_STYLES[c.id] ?? 'text-gray-800'
            )}
          >
            {c.count}
          </p>
        </button>
      ))}
    </div>
  )
}

export function buildStatusCardCounts(
  items: { workflowStageId?: string }[],
  workflowColumns = PRD_WORKFLOW_COLUMNS
): StatusCardDef[] {
  const cols = workflowColumns.map((c) => ({
    id: c.id as PrdWorkflowStageId,
    label: c.label,
    count: items.filter((r) => r.workflowStageId === c.id).length,
  }))
  return [
    { id: 'total', label: 'TOTAL', count: items.length },
    ...cols,
    {
      id: 'other',
      label: '기타',
      count: items.filter((r) => r.workflowStageId === 'other' || !r.workflowStageId).length,
    },
  ]
}
