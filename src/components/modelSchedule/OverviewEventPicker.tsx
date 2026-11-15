import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import type { OverviewBarType } from '../../types/modelScheduleOverview'

const HW_BAR_TYPES: OverviewBarType[] = ['prepv', 'pv', 'mp', 'ats', 'default']
const SW_BAR_TYPES: OverviewBarType[] = ['sit', 'dev_test', 'fc', 'preqp', 'qp', 'su', 'default']

const BAR_LABELS: Record<OverviewBarType, string> = {
  sit: 'SIT',
  dev_test: 'Dev Test',
  fc: 'FC',
  prepv: 'PrePV',
  pv: 'PV',
  mp: 'MP',
  preqp: 'PreQP',
  qp: 'QP',
  su: 'SU',
  ats: 'ATS',
  default: '기타',
}

const BAR_COLORS: Record<OverviewBarType, string> = {
  sit: '#FACC15',
  dev_test: '#FDE68A',
  fc: '#E2E8F0',
  prepv: '#FB923C',
  pv: '#7DD3FC',
  mp: '#22C55E',
  preqp: '#C4B5FD',
  qp: '#A78BFA',
  su: '#EF4444',
  ats: '#64748B',
  default: '#94A3B8',
}

export default function OverviewEventPicker({
  x,
  y,
  kind,
  currentType,
  currentName,
  onSelect,
  onRemove,
  onClose,
}: {
  x: number
  y: number
  kind: 'hw' | 'sw'
  currentType: OverviewBarType | null
  currentName: string
  onSelect: (type: OverviewBarType, name: string) => void
  onRemove: () => void
  onClose: () => void
}) {
  const BAR_TYPES = kind === 'hw' ? HW_BAR_TYPES : SW_BAR_TYPES
  const [name, setName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setName(currentName)
  }, [currentName])

  const readName = () => (inputRef.current?.value ?? name).trim()

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="fixed z-50 bg-white border border-surface-border rounded-lg shadow-xl py-1 w-44"
        style={{ left: Math.min(x, window.innerWidth - 180), top: Math.min(y, window.innerHeight - 360) }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {BAR_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onSelect(t, readName() || BAR_LABELS[t])}
            className={clsx(
              'w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-surface-page text-left',
              currentType === t && 'bg-blue-50 font-semibold',
            )}
          >
            <div className="w-4 h-3 rounded-sm shrink-0" style={{ backgroundColor: BAR_COLORS[t] }} />
            {BAR_LABELS[t]}
          </button>
        ))}
        <div className="border-t border-surface-border my-1" />
        <div className="px-3 py-1.5">
          <p className="text-[9px] text-gray-400 mb-1">Event명 (바 라벨)</p>
          <input
            ref={inputRef}
            className="w-full px-2 py-1 border border-gray-300 rounded text-[11px]"
            value={name}
            placeholder="예: FC1, PV1..."
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSelect(currentType ?? 'default', readName())
                onClose()
              }
            }}
            autoFocus
          />
        </div>
        <div className="border-t border-surface-border my-1" />
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-red-50 text-red-500 text-left"
        >
          <X size={12} />
          삭제
        </button>
      </div>
    </>
  )
}
