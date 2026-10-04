import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import clsx from 'clsx'
import type { OverviewBarType, OverviewModel } from '../../types/modelScheduleOverview'
import {
  calcOverviewMerge,
  expandOverviewToDisplayRows,
  overviewGroupKey,
} from '../../utils/modelScheduleOverviewRows'

const CW = 22
const RH = 26
const LEFT_W = 980
const MIN_SCALE = 0.75

const BAR_STYLE: Record<OverviewBarType, { bg: string; text: string }> = {
  sit: { bg: '#FACC15', text: '#78350F' },
  dev_test: { bg: '#FDE68A', text: '#92400E' },
  fc: { bg: '#E2E8F0', text: '#334155' },
  prepv: { bg: '#FB923C', text: '#fff' },
  pv: { bg: '#7DD3FC', text: '#0C4A6E' },
  mp: { bg: '#22C55E', text: '#fff' },
  preqp: { bg: '#C4B5FD', text: '#4C1D95' },
  qp: { bg: '#A78BFA', text: '#fff' },
  su: { bg: '#EF4444', text: '#fff' },
  default: { bg: '#94A3B8', text: '#fff' },
}

function fmt(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function toD(s: string) {
  return new Date(s + 'T00:00:00')
}
function dayStart(d: Date) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}
function toISO(d: Date) {
  const x = dayStart(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
function normDate(s: string) {
  return String(s || '').slice(0, 10)
}
function diffD(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
function barCoversDay(bar: { start: string; end: string }, d: Date) {
  const dk = toISO(d)
  return dk >= normDate(bar.start) && dk <= normDate(bar.end)
}
function isBarStartDay(bar: { start: string }, d: Date) {
  return toISO(d) === normDate(bar.start)
}

function monthSpans(dates: Date[]) {
  const spans: { label: string; len: number }[] = []
  let i = 0
  while (i < dates.length) {
    const m = dates[i].getMonth()
    const y = dates[i].getFullYear()
    let j = i + 1
    while (j < dates.length && dates[j].getMonth() === m && dates[j].getFullYear() === y) j++
    spans.push({ label: `${y % 100}/${m + 1}월`, len: j - i })
    i = j
  }
  return spans
}

function splitModelsIntoPages(models: OverviewModel[]): OverviewModel[][] {
  if (models.length <= 8) return [models]
  const mid = Math.ceil(models.length / 2)
  return [models.slice(0, mid), models.slice(mid)]
}

function OverviewSnapshotTable({
  models,
  dates,
  today,
  viewStart,
}: {
  models: OverviewModel[]
  dates: Date[]
  today: Date
  viewStart: Date
}) {
  const displayRows = useMemo(() => expandOverviewToDisplayRows(models), [models])
  const catMerge = useMemo(() => calcOverviewMerge(displayRows, (r) => r.category), [displayRows])
  const modelMerge = useMemo(() => calcOverviewMerge(displayRows, overviewGroupKey), [displayRows])
  const monthHdr = useMemo(() => monthSpans(dates), [dates])
  const todayOff = useMemo(() => diffD(viewStart, today), [viewStart, today])

  const metaCols = ['제품군', '모델명', '개발등급', '생산', 'SoC', 'HW PM', 'SW PO', 'SW PM', '스펙', 'PV', 'MP', 'ATS']

  const isModelLast = (ri: number) => {
    if (ri >= displayRows.length - 1) return true
    return overviewGroupKey(displayRows[ri]) !== overviewGroupKey(displayRows[ri + 1])
  }

  if (displayRows.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">표시할 데이터가 없습니다.</p>
  }

  return (
    <table className="text-xs border-collapse bg-white" style={{ minWidth: LEFT_W + dates.length * CW }}>
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th colSpan={metaCols.length} className="border-r border-surface-border px-2 py-1 text-left text-[10px] text-gray-500" />
          {monthHdr.map((m, i) => (
            <th key={i} colSpan={m.len} className="border-r border-surface-border px-1 py-1 text-center text-[10px] font-semibold text-gray-600">
              {m.label}
            </th>
          ))}
        </tr>
        <tr className="bg-gray-50 border-b-2 border-gray-300">
          {metaCols.map((h) => (
            <th key={h} className="border-r border-surface-border px-1.5 py-2 text-gray-600 font-semibold text-[10px] whitespace-nowrap">
              {h}
            </th>
          ))}
          {dates.map((d, i) => (
            <th
              key={i}
              className={clsx(
                'border-r border-surface-border px-0 py-0.5 text-center font-medium',
                d.getTime() === today.getTime() ? 'bg-red-100 text-red-700' : 'text-gray-600',
              )}
              style={{ width: CW, minWidth: CW }}
            >
              <div className="text-[8px]">{d.getDate()}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {displayRows.map((row, ri) => {
          const cm = catMerge[ri]
          const mm = modelMerge[ri]
          const showMeta = row.lineIndex === 0 || row.isMrMinor
          const borderB = isModelLast(ri) ? 'border-b-2 border-b-gray-400' : 'border-b border-b-surface-border/60'

          return (
            <tr key={row.id} className={borderB} style={{ height: RH }}>
              {!cm.hidden && showMeta && (
                <td rowSpan={cm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] text-gray-700 align-middle">
                  {row.category}
                </td>
              )}
              {!mm.hidden && showMeta && (
                <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[11px] font-semibold text-center align-middle">
                  {row.model}
                </td>
              )}
              {!mm.hidden && showMeta && (
                <>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{row.variant}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{row.manufacturer}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] font-mono align-middle">{row.soc}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{row.hwPm}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{row.swPo}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{row.swPm}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[9px] align-middle min-w-[120px]">{row.spec}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{row.pv}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{row.mp}</td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{row.ats}</td>
                </>
              )}
              {dates.map((d, di) => {
                if (!row.showTimeline) {
                  return <td key={di} className="border-r border-surface-border/30" style={{ width: CW, minWidth: CW }} />
                }
                const bar = row.bars.find((b) => barCoversDay(b, d))
                const isBS = bar && isBarStartDay(bar, d)
                const bc = bar ? BAR_STYLE[bar.barType] : null
                const barSpanDays = bar ? diffD(toD(normDate(bar.start)), toD(normDate(bar.end))) + 1 : 0
                const barMinW = barSpanDays * CW - 2
                const barW = bar?.label ? Math.max(barMinW, bar.label.length * 6 + 8) : barMinW
                const isMpSingle = bar?.barType === 'mp' && barSpanDays <= 1

                return (
                  <td key={di} className="border-r border-surface-border/40 px-0 py-0 relative" style={{ width: CW, minWidth: CW, height: RH }}>
                    {bar && bc && isBS && !isMpSingle && (
                      <div className="absolute top-1 left-0 rounded-sm flex items-center z-[1]" style={{ width: barW, minWidth: barMinW, height: RH - 8, backgroundColor: bc.bg }}>
                        {bar.label ? <span className="px-0.5 text-[7px] font-bold whitespace-nowrap" style={{ color: bc.text }}>{bar.label}</span> : null}
                      </div>
                    )}
                    {bar && bc && isBS && isMpSingle && (
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded px-0.5 text-[7px] font-bold" style={{ backgroundColor: bc.bg, color: bc.text }}>MP</div>
                    )}
                    {bar && bc && !isBS && !isMpSingle && (
                      <div className="absolute inset-y-1 inset-x-0 rounded-sm" style={{ backgroundColor: bc.bg }} />
                    )}
                    {di === todayOff && todayOff >= 0 && todayOff < dates.length && (
                      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-red-600 z-[2]" style={{ transform: 'translateX(-50%)' }} />
                    )}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function OverviewSnapshotDialog({
  open,
  onClose,
  models,
  dates,
  periodLabel,
  today,
  viewStart,
}: {
  open: boolean
  onClose: () => void
  models: OverviewModel[]
  dates: Date[]
  periodLabel: string
  today: Date
  viewStart: Date
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
                <span className="text-xs text-gray-500">Page {page + 1}/{pages.length}</span>
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
            <OverviewSnapshotTable models={pageModels} dates={dates} today={today} viewStart={viewStart} />
          </div>
        </div>
        <p className="text-[10px] text-gray-400 px-4 py-2 border-t border-surface-border shrink-0">
          오늘: {fmt(today)} · {models.length}모델
        </p>
      </div>
    </div>
  )
}
