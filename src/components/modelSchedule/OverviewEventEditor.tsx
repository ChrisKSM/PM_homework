import { useEffect, useRef, useState } from 'react'
import { Calendar, X } from 'lucide-react'
import clsx from 'clsx'
import type { OverviewBarType, OverviewEventKind } from '../../types/modelScheduleOverview'
import { HW_BAR_STYLE, SW_BAR_STYLE } from '../../utils/overviewBarStyles'

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

export interface OverviewEventDraft {
  name: string
  start: string
  end: string
  barType: OverviewBarType
  kind: OverviewEventKind
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return
  try {
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.focus()
  } catch {
    input.focus()
  }
}

function DateField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="mb-2">
      <label className="block text-[9px] text-gray-500 mb-0.5">{label}</label>
      <div className="flex gap-1">
        <input
          ref={ref}
          type="date"
          className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => !disabled && openDatePicker(ref.current)}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => openDatePicker(ref.current)}
          className="shrink-0 px-2 py-1.5 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
          title="날짜 선택"
        >
          <Calendar size={14} className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}

export default function OverviewEventEditor({
  x,
  y,
  kind,
  draft,
  isNew,
  onApply,
  onRemove,
  onClose,
}: {
  x: number
  y: number
  kind: OverviewEventKind
  draft: OverviewEventDraft
  isNew: boolean
  onApply: (draft: OverviewEventDraft) => void
  onRemove: () => void
  onClose: () => void
}) {
  const BAR_TYPES = kind === 'hw' ? HW_BAR_TYPES : SW_BAR_TYPES
  const styleMap = kind === 'hw' ? HW_BAR_STYLE : SW_BAR_STYLE
  const [name, setName] = useState(draft.name)
  const [start, setStart] = useState(draft.start)
  const [end, setEnd] = useState(draft.end)
  const [barType, setBarType] = useState(draft.barType)

  useEffect(() => {
    setName(draft.name)
    setStart(draft.start)
    setEnd(draft.end)
    setBarType(draft.barType)
  }, [draft])

  const apply = () => {
    const s = start.slice(0, 10)
    let e = end.slice(0, 10) || s
    if (e < s) e = s
    if (barType === 'mp') e = s
    onApply({
      name: name.trim() || BAR_LABELS[barType],
      start: s,
      end: e,
      barType,
      kind,
    })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-[200]" onMouseDown={onClose} />
      <div
        className="fixed z-[210] bg-white border border-surface-border rounded-lg shadow-xl p-3 w-72"
        style={{ left: Math.min(x, window.innerWidth - 300), top: Math.min(y, window.innerHeight - 380) }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-semibold text-gray-700 mb-2">
          {kind === 'hw' ? 'HW Event' : 'SW Event'} {isNew ? '추가' : '편집'}
        </p>
        <div className="flex flex-wrap gap-1 mb-2">
          {BAR_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setBarType(t)
                if (!name.trim()) setName(BAR_LABELS[t])
              }}
              className={clsx(
                'px-1.5 py-0.5 rounded text-[9px] border',
                barType === t ? 'border-gray-800 font-bold' : 'border-gray-200',
              )}
              style={{ backgroundColor: styleMap[t].bg, color: styleMap[t].text }}
            >
              {BAR_LABELS[t]}
            </button>
          ))}
        </div>
        <label className="block text-[9px] text-gray-500 mb-0.5">Event명</label>
        <input
          className="w-full mb-2 px-2 py-1 border border-gray-300 rounded text-[11px]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: FC 1, PV1..."
        />
        <DateField label="Start Date" value={start} onChange={setStart} />
        <DateField label="End Date" value={end} onChange={setEnd} disabled={barType === 'mp'} />
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={apply}
            className="flex-1 py-1.5 rounded text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          >
            적용
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => {
                onRemove()
                onClose()
              }}
              className="px-2 py-1.5 rounded text-[11px] text-red-500 hover:bg-red-50 border border-red-200"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
