import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import type { OverviewDisplayRow, OverviewMetaKey, OverviewScheduleBar } from '../../types/modelScheduleOverview'
import {
  OVERVIEW_META_COLUMNS,
  calcOverviewMerge,
  overviewCategoryKey,
  overviewGroupKey,
} from '../../utils/modelScheduleOverviewRows'
import { HW_LEGEND, SW_LEGEND, barStyleForKind } from '../../utils/overviewBarStyles'

const CW = 22
const RH = 26

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
function barCoversDay(bar: OverviewScheduleBar, d: Date) {
  const dk = toISO(d)
  return dk >= normDate(bar.start) && dk <= normDate(bar.end)
}
function isBarStartDay(bar: OverviewScheduleBar, d: Date) {
  return toISO(d) === normDate(bar.start)
}
function isBarEndDay(bar: OverviewScheduleBar, d: Date) {
  return toISO(d) === normDate(bar.end)
}
function barSpanDays(bar: OverviewScheduleBar) {
  return diffD(toD(normDate(bar.start)), toD(normDate(bar.end))) + 1
}
function isSingleDayBar(bar: OverviewScheduleBar) {
  return barSpanDays(bar) <= 1
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

const STICKY_LEFT = [0, OVERVIEW_META_COLUMNS[0].minW]

export default function OverviewScheduleTable({
  displayRows,
  dates,
  todayOff,
  editing = false,
  showDeleteCol = false,
  onTimelineClick,
  onDeleteModel,
  renderMetaCell,
}: {
  displayRows: OverviewDisplayRow[]
  dates: Date[]
  todayOff: number
  editing?: boolean
  showDeleteCol?: boolean
  onTimelineClick?: (modelId: string, kind: 'hw' | 'sw', d: Date, e: React.MouseEvent) => void
  onDeleteModel?: (modelId: string) => void
  renderMetaCell?: (row: OverviewDisplayRow, key: OverviewMetaKey) => React.ReactNode
}) {
  const catMerge = calcOverviewMerge(displayRows, overviewCategoryKey)
  const modelMerge = calcOverviewMerge(displayRows, overviewGroupKey)
  const monthHdr = monthSpans(dates)
  const leftW = OVERVIEW_META_COLUMNS.reduce((s, c) => s + c.minW, 0) + (showDeleteCol ? 32 : 0)

  const isModelLast = (ri: number) => {
    if (ri >= displayRows.length - 1) return true
    return overviewGroupKey(displayRows[ri]) !== overviewGroupKey(displayRows[ri + 1])
  }

  const defaultMeta = (row: OverviewDisplayRow, key: OverviewMetaKey) => {
    const val = row[key]
    if (key === 'spec') {
      return <span className="whitespace-pre-wrap leading-snug text-[9px]">{val}</span>
    }
    return <span className="text-[10px]">{val}</span>
  }

  const cell = renderMetaCell ?? defaultMeta

  return (
    <table className="text-xs border-collapse" style={{ minWidth: leftW + dates.length * CW }}>
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th
            colSpan={OVERVIEW_META_COLUMNS.length + (showDeleteCol ? 1 : 0)}
            className="border-r border-surface-border px-2 py-1 text-left text-[10px] text-gray-500 sticky left-0 z-20 bg-gray-50"
          />
          {monthHdr.map((m, i) => (
            <th
              key={i}
              colSpan={m.len}
              className="border-r border-surface-border px-1 py-1 text-center text-[10px] font-semibold text-gray-600 bg-gray-50"
            >
              {m.label}
            </th>
          ))}
        </tr>
        <tr className="bg-gray-50 border-b-2 border-gray-300">
          {OVERVIEW_META_COLUMNS.map((col, i) => (
            <th
              key={col.key}
              className={clsx(
                'border-r border-surface-border px-1.5 py-2 text-gray-500 font-semibold text-[10px] whitespace-nowrap text-center',
                i === 0 && 'sticky left-0 z-10 bg-gray-50',
                i === 1 && 'sticky z-10 bg-gray-50',
              )}
              style={{
                minWidth: col.minW,
                ...(i === 1 ? { left: STICKY_LEFT[1] } : {}),
              }}
            >
              {col.label}
            </th>
          ))}
          {showDeleteCol && (
            <th className="border-r border-surface-border px-1 py-2 text-gray-400 text-[9px] w-8 text-center">삭제</th>
          )}
          {dates.map((d, i) => (
            <th
              key={i}
              className={clsx(
                'border-r border-surface-border px-0 py-0.5 text-center font-medium',
                d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-100 text-red-400' : 'text-gray-500',
                d.getDay() === 1 && 'border-l-2 border-l-gray-300',
              )}
              style={{ width: CW, minWidth: CW }}
            >
              <div className="text-[8px] leading-tight">{d.getDate()}</div>
              <div className="text-[7px] opacity-70">{['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {displayRows.map((row, ri) => {
          const cm = catMerge[ri]
          const mm = modelMerge[ri]
          const borderB = isModelLast(ri) ? 'border-b-2 border-b-gray-400' : 'border-b border-b-surface-border/60'
          const showMeta = row.lineIndex === 0 && !mm.hidden
          const kind = row.timelineKind === 'hw' || row.timelineKind === 'sw' ? row.timelineKind : 'sw'
          const rowBg = kind === 'hw' ? 'bg-sky-50/30' : 'bg-amber-50/20'

          return (
            <tr key={row.id} className={clsx(borderB, rowBg)} style={{ height: RH }}>
              {!cm.hidden && row.lineIndex === 0 && (
                <td
                  rowSpan={cm.rowSpan}
                  className="sticky left-0 z-10 bg-white border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle text-center"
                >
                  {cell(row, 'category')}
                </td>
              )}
              {!mm.hidden && row.lineIndex === 0 && (
                <>
                  <td
                    rowSpan={mm.rowSpan}
                    className="sticky z-10 bg-white border-r border-surface-border px-1.5 text-[11px] font-semibold align-middle text-center"
                    style={{ left: STICKY_LEFT[1] }}
                  >
                    {cell(row, 'model')}
                  </td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle text-center">
                    {cell(row, 'variant')}
                  </td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] font-mono align-middle text-center">
                    {cell(row, 'soc')}
                  </td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle text-center">
                    {cell(row, 'swPm')}
                  </td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[9px] text-gray-600 align-middle text-center min-w-[160px]">
                    {cell(row, 'spec')}
                  </td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle text-center">
                    {cell(row, 'pv')}
                  </td>
                  <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle text-center">
                    {cell(row, 'mp')}
                  </td>
                </>
              )}
              {showDeleteCol && row.lineIndex === 0 && !mm.hidden && (
                <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1 text-center align-middle">
                  {editing && onDeleteModel ? (
                    <button type="button" onClick={() => onDeleteModel(row.modelId)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  ) : null}
                </td>
              )}

              {dates.map((d, di) => {
                const isW = d.getDay() === 0 || d.getDay() === 6
                if (row.timelineKind === 'none') {
                  return (
                    <td key={di} className={clsx('border-r border-surface-border/30', isW && 'bg-gray-50/40')} style={{ width: CW, minWidth: CW, height: RH }} />
                  )
                }

                const bar = row.bars.find((b) => barCoversDay(b, d))
                const isBS = bar && isBarStartDay(bar, d)
                const isBE = bar && isBarEndDay(bar, d)
                const bc = bar ? barStyleForKind(bar.kind, bar.barType) : null
                const span = bar ? barSpanDays(bar) : 0
                const barMinW = span * CW - 2
                const barW = bar?.label ? Math.max(barMinW, bar.label.length * 7 + 10) : barMinW
                const singleDay = bar ? isSingleDayBar(bar) : false

                return (
                  <td
                    key={di}
                    className={clsx(
                      'border-r border-surface-border/40 px-0 py-0 relative overflow-visible',
                      isW && 'bg-gray-50/50',
                      d.getDay() === 1 && 'border-l-2 border-l-gray-200',
                      editing && onTimelineClick && 'cursor-pointer hover:bg-blue-50/40',
                    )}
                    style={{ width: CW, minWidth: CW, height: RH }}
                    onClick={editing && onTimelineClick ? (e) => onTimelineClick(row.modelId, kind, d, e) : undefined}
                  >
                    {bar && bc && singleDay && (
                      <div
                        className="absolute top-1 left-1/2 -translate-x-1/2 rounded px-1 py-0.5 text-[8px] font-bold leading-tight z-[1] pointer-events-none whitespace-nowrap max-w-[calc(100%-2px)] truncate"
                        style={{ backgroundColor: bc.bg, color: bc.text }}
                        title={bar.label}
                      >
                        {bar.label}
                      </div>
                    )}
                    {bar && bc && isBS && !singleDay && (
                      <div
                        className="absolute top-1 left-0 rounded-l-sm flex items-center z-[1] pointer-events-none overflow-hidden"
                        style={{ width: `${barW}px`, minWidth: `${CW - 2}px`, height: RH - 8, backgroundColor: bc.bg }}
                      >
                        {bar.label ? (
                          <span className="px-1 text-[8px] font-bold leading-none whitespace-nowrap" style={{ color: bc.text }}>
                            {bar.label}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {bar && bc && !isBS && !singleDay && !isBE && (
                      <div className="absolute top-1 bottom-1 left-0 right-0 pointer-events-none" style={{ backgroundColor: bc.bg }} />
                    )}
                    {bar && bc && !isBS && !singleDay && isBE && (
                      <div
                        className="absolute top-1 bottom-1 left-0 right-0 rounded-r-sm pointer-events-none"
                        style={{ backgroundColor: bc.bg }}
                      />
                    )}
                    {di === todayOff && todayOff >= 0 && todayOff < dates.length && (
                      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-red-600 z-[2] pointer-events-none" style={{ transform: 'translateX(-50%)' }} />
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

export { CW, RH, HW_LEGEND, SW_LEGEND, monthSpans }
