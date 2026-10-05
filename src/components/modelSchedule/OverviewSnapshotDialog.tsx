import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { OverviewModel } from '../../types/modelScheduleOverview'
import { expandOverviewToDisplayRows } from '../../utils/modelScheduleOverviewRows'
import OverviewScheduleTable from './OverviewScheduleTable'

const MIN_SCALE = 0.75

function fmt(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function splitModelsIntoPages(models: OverviewModel[]): OverviewModel[][] {
  if (models.length <= 8) return [models]
  const mid = Math.ceil(models.length / 2)
  return [models.slice(0, mid), models.slice(mid)]
}

export default function OverviewSnapshotDialog({
  open,
  onClose,
  models,
  dates,
  periodLabel,
  today,
  viewStart,
  todayOff,
}: {
  open: boolean
  onClose: () => void
  models: OverviewModel[]
  dates: Date[]
  periodLabel: string
  today: Date
  viewStart: Date
  todayOff: number
}) {
  const pages = useMemo(() => splitModelsIntoPages(models), [models])
  const [page, setPage] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (open) setPage(0)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !wrapRef.current || !innerRef.current) return
    const fit = () => {
      const w = wrapRef.current!.clientWidth - 24
      const h = wrapRef.current!.clientHeight - 24
      const sw = innerRef.current!.scrollWidth
      const sh = innerRef.current!.scrollHeight
      if (sw <= 0 || sh <= 0) return
      setScale(Math.max(MIN_SCALE, Math.min(1, w / sw, h / sh)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [open, page, models, dates])

  if (!open) return null

  const pageModels = pages[page] ?? []
  const displayRows = expandOverviewToDisplayRows(pageModels)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[96vw] max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">전 모델 일정 Snapshot</h2>
            <p className="text-[11px] text-gray-500">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {pages.length > 1 && (
              <>
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded border border-surface-border disabled:opacity-40">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-500">
                  Page {page + 1}/{pages.length}
                </span>
                <button type="button" onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))} disabled={page >= pages.length - 1} className="p-1.5 rounded border border-surface-border disabled:opacity-40">
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>
        <div ref={wrapRef} className="flex-1 overflow-auto p-3 min-h-0">
          <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <OverviewScheduleTable displayRows={displayRows} dates={dates} todayOff={todayOff} />
          </div>
        </div>
        <p className="text-[10px] text-gray-400 px-4 py-2 border-t border-surface-border shrink-0">
          오늘: {fmt(today)} · {models.length}모델 · 1행 HW / 2행 SW
        </p>
      </div>
    </div>
  )
}
