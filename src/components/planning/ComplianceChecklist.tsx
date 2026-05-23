import clsx from 'clsx'
import { CheckCircle2, Circle } from 'lucide-react'
import type { PlanningChecklistItem } from '../../types/planning'

interface Props {
  items: PlanningChecklistItem[]
}

export default function ComplianceChecklist({ items }: Props) {
  const done = items.filter((i) => i.done).length

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3 font-medium">
        보완 체크리스트{' '}
        <span className="text-lg-red font-bold">
          {done}/{items.length}
        </span>{' '}
        완료
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5">
            {item.done ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Circle size={16} className="text-gray-300 shrink-0 mt-0.5" />
            )}
            <span
              className={clsx(
                'text-sm',
                item.done ? 'text-gray-700 font-medium' : 'text-gray-500'
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
