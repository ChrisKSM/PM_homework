import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import clsx from 'clsx'
import {
  type BarType,
  type ModelRow,
  type ScheduleBar,
  groupKey,
} from '../../utils/modelScheduleRows'

const BAR_CONFIG: Record<BarType, { color: string; label: string; textColor: string }> = {
  planned: { color: '#94A3B8', label: '진행 예정', textColor: '#fff' },
  inprogress: { color: '#FACC15', label: '진행중', textColor: '#78350F' },
  event_ng: { color: '#EF4444', label: 'Event NG', textColor: '#fff' },
  event_ok: { color: '#22C55E', label: 'Event OK', textColor: '#fff' },
  event_done_est: { color: '#A78BFA', label: 'Event 완료 예상', textColor: '#fff' },
  su_fota: { color: '#F97316', label: 'SU/FOTA 배포', textColor: '#fff' },
}

const TT_STYLE = {
  '일반성능': 'bg-blue-50 text-blue-600',
  '호환성': 'bg-purple-50 text-purple-600',
  '안정성': 'bg-amber-50 text-amber-600',
  '시너지': 'bg-emerald-50 text-emerald-600',
} as const

const STATUS_STYLE = {
  '완료': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  '예정': { bg: 'bg-gray-100', text: 'text-gray-500' },
  '검증제외': { bg: 'bg-amber-50', text: 'text-amber-600' },
} as const

const CW = 26
const RH = 28
const LEFT_COLS_W = 740
const MIN_SCALE = 0.82

interface Merge {
  rowSpan: number
  hidden: boolean
}

function calcMerge(rows: ModelRow[], key: (r: ModelRow) => string): Merge[] {
  const res: Merge[] = rows.map(() => ({ rowSpan: 1, hidden: false }))
  let i = 0
  while (i < rows.length) {
    const k = key(rows[i])
    let j = i + 1
    while (j < rows.length && key(rows[j]) === k && k) j++
    res[i].rowSpan = j - i
    for (let x = i + 1; x < j; x++) res[x].hidden = true
    i = j
  }
  return res
}

/** 모델 그룹(4구분) 단위로 2페이지 분할 — 그룹 중간 절단 없음 */
function splitRowsIntoPages(rows: ModelRow[]): ModelRow[][] {
  if (rows.length <= 0) return [[]]
  const groups: ModelRow[][] = []
  let i = 0
  while (i < rows.length) {
    const k = groupKey(rows[i])
    const g: ModelRow[] = []
    while (i < rows.length && groupKey(rows[i]) === k) {
      g.push(rows[i])
      i++
    }
    groups.push(g)
  }
  if (groups.length <= 1) return [rows]
  const mid = Math.ceil(groups.length / 2)
  return [groups.slice(0, mid).flat(), groups.slice(mid).flat()]
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
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normDate(s: string) {
  return String(s || '').slice(0, 10)
}

function diffD(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function barCoversDay(bar: ScheduleBar, d: Date) {
  const dk = toISO(d)
  return dk >= normDate(bar.start) && dk <= normDate(bar.end)
}

function isBarStartDay(bar: ScheduleBar, d: Date) {
  return toISO(d) === normDate(bar.start)
}

function rowBars(row: ModelRow) {
  return Array.isArray(row.bars) ? row.bars : []
}

function isModelAllDone(rows: ModelRow[], model: string, cat: string, event: string) {
  const group = rows.filter((r) => r.model === model && r.category === cat && r.event === event)
  return group.length > 0 && group.every((r) => r.status === '완료')
}

function SnapshotTable({
  rows,
  dates,
  today,
  startDate,
}: {
  rows: ModelRow[]
  dates: Date[]
  today: Date
  startDate: Date
}) {
  const catMerge = useMemo(() => calcMerge(rows, (r) => r.category), [rows])
  const modelMerge = useMemo(() => calcMerge(rows, groupKey), [rows])
  const todayOff = useMemo(() => diffD(startDate, today), [startDate, today])

  const isModelLast = (ri: number) => {
    if (ri >= rows.length - 1) return true
    return groupKey(rows[ri]) !== groupKey(rows[ri + 1])
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">표시할 데이터가 없습니다.</p>
  }

  return (
    <table className="text-xs border-collapse bg-white border border-surface-border rounded-lg">
      <thead>
        <tr className="bg-gray-50 border-b-2 border-gray-300">
          {['카테고리', '모델명', '이벤트', '개발등급', '생산업체', 'SoC', '담당', '구분', '주요 변경점', 'Status'].map(
            (h, i) => (
              <th
                key={h}
                className={clsx(
                  'border-r border-surface-border px-1.5 py-2 text-gray-600 font-semibold text-[10px] whitespace-nowrap',
                  i === 0 && 'w-[88px]',
                  i === 1 && 'w-[72px]',
                  i === 8 && 'min-w-[130px]',
                )}
              >
                {h}
              </th>
            ),
          )}
          {dates.map((d, i) => (
            <th
              key={i}
              className={clsx(
                'border-r border-surface-border px-0 py-1 text-center font-medium',
                d.getTime() === today.getTime()
                  ? 'bg-red-100 text-red-700'
                  : d.getDay() === 0 || d.getDay() === 6
                    ? 'bg-gray-100 text-gray-400'
                    : 'text-gray-600',
                d.getDay() === 1 && 'border-l-2 border-l-gray-300',
              )}
              style={{ width: CW, minWidth: CW }}
            >
              <div className="text-[8px] leading-tight">{fmt(d)}</div>
              <div className="text-[7px] text-gray-400">{['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => {
          const cm = catMerge[ri]
          const mm = modelMerge[ri]
          const borderB = isModelLast(ri) ? 'border-b-2 border-b-gray-400' : 'border-b border-b-surface-border/60'
          const allDone = isModelAllDone(rows, row.model, row.category, row.event)

          return (
            <tr key={row.id} className={borderB} style={{ height: RH }}>
              {!cm.hidden && (
                <td
                  rowSpan={cm.rowSpan}
                  className={clsx(
                    'border-r border-surface-border px-1.5 text-gray-700 text-[10px] whitespace-nowrap align-middle',
                    allDone && 'bg-gray-100',
                  )}
                >
                  {row.category}
                </td>
              )}
              {!mm.hidden && (
                <td
                  rowSpan={mm.rowSpan}
                  className={clsx(
                    'border-r border-surface-border px-1.5 text-gray-900 font-semibold text-[11px] whitespace-nowrap align-middle text-center',
                    allDone && 'bg-gray-100',
                  )}
                >
                  {row.model}
                </td>
              )}
              {!mm.hidden && (
                <>
                  <td rowSpan={mm.rowSpan} className={clsx('border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle', allDone && 'bg-gray-100')}>
                    {row.event}
                  </td>
                  <td rowSpan={mm.rowSpan} className={clsx('border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle', allDone && 'bg-gray-100')}>
                    {row.variant}
                  </td>
                  <td rowSpan={mm.rowSpan} className={clsx('border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle', allDone && 'bg-gray-100')}>
                    {row.manufacturer}
                  </td>
                  <td rowSpan={mm.rowSpan} className={clsx('border-r border-surface-border px-1.5 text-[10px] font-mono text-gray-600 align-middle', allDone && 'bg-gray-100')}>
                    {row.soc}
                  </td>
                  <td rowSpan={mm.rowSpan} className={clsx('border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle', allDone && 'bg-gray-100')}>
                    {row.staff}
                  </td>
                </>
              )}
              <td className="border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap">
                <span className={clsx('px-1 py-0.5 rounded text-[9px] font-bold', TT_STYLE[row.testType])}>{row.testType}</span>
              </td>
              {!mm.hidden && (
                <td
                  rowSpan={mm.rowSpan}
                  className={clsx(
                    'border-r border-surface-border px-1.5 text-[9px] text-gray-600 align-middle min-w-[130px]',
                    allDone && 'bg-gray-100',
                  )}
                >
                  <span className="whitespace-pre-wrap leading-snug">{row.changes}</span>
                </td>
              )}
              <td className="border-r border-surface-border px-1.5">
                {(() => {
                  const s = STATUS_STYLE[row.status]
                  return (
                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>
                      {row.status}
                    </span>
                  )
                })()}
              </td>
              {dates.map((d, di) => {
                const isW = d.getDay() === 0 || d.getDay() === 6
                const bars = rowBars(row)
                const bar = bars.find((b) => barCoversDay(b, d))
                const isBS = bar && isBarStartDay(bar, d)
                const bc = bar ? BAR_CONFIG[bar.type] : null
                const barSpanDays = bar ? diffD(toD(normDate(bar.start)), toD(normDate(bar.end))) + 1 : 0
                const barMinW = barSpanDays * CW - 2
                const barW = bar?.label ? Math.max(barMinW, bar.label.length * 7 + 10) : barMinW

                return (
                  <td
                    key={di}
                    className={clsx(
                      'border-r border-surface-border/40 px-0 py-0 relative',
                      isW && 'bg-gray-50/50',
                      d.getDay() === 1 && 'border-l-2 border-l-gray-200',
                    )}
                    style={{ width: CW, minWidth: CW, height: RH }}
                  >
                    {bar && bc && isBS && (
                      <div
                        className="absolute top-1 left-0 rounded-sm flex items-center z-[1] pointer-events-none"
                        style={{ width: `${barW}px`, minWidth: `${barMinW}px`, height: RH - 8, backgroundColor: bc.color }}
                      >
                        {bar.label ? (
                          <span className="px-1 text-[8px] font-bold leading-none whitespace-nowrap" style={{ color: bc.textColor }}>
                            {bar.label}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {bar && bc && !isBS && (
                      <div className="absolute inset-y-1 inset-x-0 rounded-sm pointer-events-none" style={{ backgroundColor: bc.color }} />
                    )}
                    {di === todayOff && (
                      <div
                        className="absolute inset-y-0 left-1/2 w-0.5 bg-red-600 z-[2] pointer-events-none"
                        style={{ transform: 'translateX(-50%)' }}
                      />
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

type Props = {
  open: boolean
  onClose: () => void
  rows: ModelRow[]
  dates: Date[]
  periodLabel: string
  today: Date
  startDate: Date
}

export default function ScheduleSnapshotDialog({
  open,
  onClose,
  rows,
  dates,
  periodLabel,
  today,
  startDate,
}: Props) {
  const pages = useMemo(() => splitRowsIntoPages(rows), [rows])
  const pageCount = pages.length
  const [pageIndex, setPageIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const pageRows = pages[pageIndex] ?? []
  const tableW = LEFT_COLS_W + dates.length * CW

  useEffect(() => {
    if (open) setPageIndex(0)
  }, [open, rows])

  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const container = containerRef.current
      const content = contentRef.current
      if (!container || !content) return
      const cw = content.offsetWidth
      const ch = content.offsetHeight
      if (cw <= 0 || ch <= 0) return
      const pad = 12
      const sx = (container.clientWidth - pad) / cw
      const sy = (container.clientHeight - pad) / ch
      setScale(Math.max(Math.min(sx, sy, 1) * 0.98, MIN_SCALE))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, pageIndex, pageRows, dates])

  if (!open) return null

  const modelGroupCount = (() => {
    let n = 0
    let i = 0
    while (i < rows.length) {
      const k = groupKey(rows[i])
      n++
      while (i < rows.length && groupKey(rows[i]) === k) i++
    }
    return n
  })()

  const pageGroupCount = (() => {
    let n = 0
    let i = 0
    while (i < pageRows.length) {
      const k = groupKey(pageRows[i])
      n++
      while (i < pageRows.length && groupKey(pageRows[i]) === k) i++
    }
    return n
  })()

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/45" onClick={onClose} aria-hidden />
      <div
        className="fixed z-[70] inset-3 md:inset-6 lg:inset-8 flex flex-col bg-white rounded-xl shadow-2xl border border-surface-border overflow-hidden"
        role="dialog"
        aria-modal
        aria-labelledby="schedule-snapshot-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0 bg-gray-50">
          <div>
            <h2 id="schedule-snapshot-title" className="text-base font-semibold text-gray-800">
              일정 Snapshot
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {periodLabel} · 모델 {modelGroupCount}개 · {rows.length}행
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-surface-border shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium">
          {Object.entries(BAR_CONFIG).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1">
              <div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
              <span className="text-gray-600">{c.label}</span>
            </div>
          ))}
        </div>

        {pageCount > 1 && (
          <div className="px-4 py-2 border-b border-surface-border shrink-0 flex items-center justify-center gap-3 bg-white">
            <button
              type="button"
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg border border-surface-border disabled:opacity-30 hover:bg-surface-page"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1">
              {pages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPageIndex(i)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                    pageIndex === i ? 'bg-lg-red text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  Page {i + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              className="p-1.5 rounded-lg border border-surface-border disabled:opacity-30 hover:bg-surface-page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className="flex-1 min-h-0 flex items-center justify-center p-3 overflow-hidden bg-slate-50/80"
        >
          <div
            style={{
              width: tableW * scale,
              height: (44 + pageRows.length * RH) * scale,
            }}
          >
            <div
              ref={contentRef}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: tableW,
              }}
            >
              <SnapshotTable rows={pageRows} dates={dates} today={today} startDate={startDate} />
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-surface-border text-[11px] text-gray-500 shrink-0 flex justify-between items-center">
          <span>
            Page {pageIndex + 1}/{pageCount} · 이 페이지 모델 {pageGroupCount}개 · {pageRows.length}행
          </span>
          <span>빨간 세로선 = 오늘 ({fmt(today)})</span>
        </div>
      </div>
    </>
  )
}
