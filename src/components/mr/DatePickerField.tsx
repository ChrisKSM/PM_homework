import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toYmd(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDisplay(value: string): string {
  const date = parseYmd(value)
  if (!date) return '날짜 선택'
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
}

export default function DatePickerField({ label, value, onChange, min, max }: Props) {
  const [open, setOpen] = useState(false)
  const selected = parseYmd(value)
  const [cursor, setCursor] = useState(() => selected ?? new Date())
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1))
  }, [value])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const items: Array<{ key: string; day?: number; ymd?: string }> = []
    for (let i = 0; i < firstDow; i += 1) items.push({ key: `e-${i}` })
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ key: `d-${day}`, day, ymd: toYmd(year, month, day) })
    }
    return items
  }, [cursor])

  const minDate = min ? parseYmd(min) : null
  const maxDate = max ? parseYmd(max) : null

  const isDisabled = (ymd: string) => {
    const date = parseYmd(ymd)
    if (!date) return true
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  return (
    <div ref={wrapRef} className="relative">
      <p className="text-xs font-semibold text-gray-500 mb-1.5">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-2 min-w-[148px] px-3 py-2 rounded-lg border text-sm transition-colors',
          open
            ? 'border-lg-red bg-lg-red-light text-gray-900'
            : 'border-surface-border bg-white text-gray-700 hover:bg-surface-page'
        )}
      >
        <Calendar size={14} className="text-lg-red shrink-0" />
        <span className={clsx('font-medium', !selected && 'text-gray-400')}>
          {formatDisplay(value)}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-[252px] rounded-xl border border-surface-border bg-white shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="p-1 rounded-md text-gray-500 hover:bg-surface-page"
              aria-label="이전 달"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-bold text-gray-800">
              {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
            </p>
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="p-1 rounded-md text-gray-500 hover:bg-surface-page"
              aria-label="다음 달"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[10px] text-center text-gray-400 font-semibold py-1">
                {d}
              </div>
            ))}
            {cells.map((cell) =>
              cell.day && cell.ymd ? (
                <button
                  key={cell.key}
                  type="button"
                  disabled={isDisabled(cell.ymd)}
                  onClick={() => {
                    onChange(cell.ymd!)
                    setOpen(false)
                  }}
                  className={clsx(
                    'h-8 rounded-md text-xs font-medium transition-colors',
                    cell.ymd === value
                      ? 'bg-lg-red text-white'
                      : isDisabled(cell.ymd)
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-lg-red-light'
                  )}
                >
                  {cell.day}
                </button>
              ) : (
                <div key={cell.key} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
