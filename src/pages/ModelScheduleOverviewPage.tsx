import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import Header from '../components/layout/Header'
import { modelScheduleApi } from '../api/modelScheduleApi'
import { OVERVIEW_MOCK_MODELS } from '../data/modelScheduleOverviewMock'
import type { OverviewBarType, OverviewModel, OverviewScheduleBar } from '../types/modelScheduleOverview'
import {
  calcOverviewMerge,
  expandOverviewToDisplayRows,
  overviewGroupKey,
} from '../utils/modelScheduleOverviewRows'

const CW = 22
const RH = 26
const LEFT_W = 980
const DAYS = 123 // 2026-10-01 ~ 2027-01-31

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

const LEGEND: { type: OverviewBarType; label: string }[] = [
  { type: 'sit', label: 'SIT' },
  { type: 'dev_test', label: 'Dev Test' },
  { type: 'fc', label: 'FC' },
  { type: 'prepv', label: 'PrePV' },
  { type: 'pv', label: 'PV' },
  { type: 'mp', label: 'MP' },
  { type: 'preqp', label: 'PreQP' },
  { type: 'qp', label: 'QP' },
  { type: 'su', label: 'SU' },
]

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
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
function barCoversDay(bar: OverviewScheduleBar, d: Date) {
  const dk = toISO(d)
  return dk >= normDate(bar.start) && dk <= normDate(bar.end)
}
function isBarStartDay(bar: OverviewScheduleBar, d: Date) {
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

export default function ModelScheduleOverviewPage() {
  const location = useLocation()
  const [models, setModels] = useState<OverviewModel[]>(OVERVIEW_MOCK_MODELS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'mongo' | 'local' | 'mock'>('mock')
  const [startDate] = useState(() => toD('2026-10-01'))
  const [dayOffset, setDayOffset] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    modelScheduleApi
      .loadOverview()
      .then((res) => {
        if (cancelled) return
        if (res.models.length > 0) {
          setModels(res.models as OverviewModel[])
          setDataSource(res.source === 'default' ? 'mock' : res.source)
          setLoadError(null)
        } else {
          setModels(OVERVIEW_MOCK_MODELS)
          setDataSource('mock')
          setLoadError('DB/API 데이터 없음 — mock 데이터 표시')
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('overview load error:', err)
        setModels(OVERVIEW_MOCK_MODELS)
        setDataSource('mock')
        setLoadError('API 로드 실패 — mock 데이터 표시')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const viewStart = useMemo(() => addDays(startDate, dayOffset), [startDate, dayOffset])
  const dates = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => dayStart(addDays(viewStart, i))),
    [viewStart],
  )
  const today = dayStart(new Date())
  const todayOff = useMemo(() => diffD(viewStart, today), [viewStart, today])

  const displayRows = useMemo(() => expandOverviewToDisplayRows(models), [models])
  const catMerge = useMemo(() => calcOverviewMerge(displayRows, (r) => r.category), [displayRows])
  const modelMerge = useMemo(() => calcOverviewMerge(displayRows, overviewGroupKey), [displayRows])
  const monthHdr = useMemo(() => monthSpans(dates), [dates])

  const isModelLast = (ri: number) => {
    if (ri >= displayRows.length - 1) return true
    return overviewGroupKey(displayRows[ri]) !== overviewGroupKey(displayRows[ri + 1])
  }

  const metaCols = [
    '제품군',
    '모델명',
    '개발등급',
    '생산',
    'SoC',
    'HW PM',
    'SW PO',
    'SW PM',
    '스펙',
    'PV',
    'MP',
    'ATS',
  ] as const

  if (loading) {
    return (
      <>
        <Header title="전 모델 일정" subtitle="로딩 중..." />
        <div className="pt-16 p-6 flex justify-center items-center h-40">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="전 모델 일정" subtitle="모델별 PV/MP 일정 · Event 타임라인" />
      <div className="pt-16 p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setDayOffset((o) => o - 14)}
            className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
            {fmt(viewStart)} ~ {fmt(addDays(viewStart, DAYS - 1))}
          </span>
          <button
            type="button"
            onClick={() => setDayOffset((o) => o + 14)}
            className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"
          >
            <ChevronRight size={16} />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <div className="flex items-center gap-2 flex-wrap text-[10px] font-medium">
            {LEGEND.map(({ type, label }) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: BAR_STYLE[type].bg }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-gray-400 ml-auto">
            {models.length}모델 · {displayRows.length}행
            {dataSource === 'mongo' ? ' · DB' : dataSource === 'local' ? ' · local' : ' · mock'}
          </span>
        </div>

        {loadError ? (
          <p className="text-[10px] text-amber-800 mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            {loadError}
          </p>
        ) : null}
        <p className="text-[10px] text-gray-500 mb-2 bg-slate-50 border border-surface-border rounded-lg px-3 py-1.5">
          JDM 모델은 <b>2행</b>(1행=메타, 2행=Event 바) · <b>MR_Minor</b>는 1행에 Event 바 표시
        </p>
        {displayRows.length === 0 ? (
          <div className="border border-surface-border rounded-xl bg-white p-8 text-center text-gray-500 text-sm">
            표시할 모델 데이터가 없습니다. BE seed 또는 FE 배포를 확인하세요.
          </div>
        ) : (

        <div className="border border-surface-border rounded-xl bg-white">
          <div className="overflow-x-auto">
            <table
              className="text-xs border-collapse"
              style={{ minWidth: LEFT_W + DAYS * CW }}
            >
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    colSpan={metaCols.length}
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
                  {metaCols.map((h, i) => (
                    <th
                      key={h}
                      className={clsx(
                        'border-r border-surface-border px-1.5 py-2 text-gray-500 font-semibold text-[10px] whitespace-nowrap',
                        i === 0 && 'sticky left-0 z-10 bg-gray-50 min-w-[88px]',
                        i === 1 && 'sticky left-[88px] z-10 bg-gray-50 min-w-[64px]',
                        h === '스펙' && 'min-w-[140px]',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                  {dates.map((d, i) => (
                    <th
                      key={i}
                      className={clsx(
                        'border-r border-surface-border px-0 py-0.5 text-center font-medium',
                        d.getTime() === today.getTime()
                          ? 'bg-red-100 text-red-700'
                          : d.getDay() === 0 || d.getDay() === 6
                            ? 'bg-gray-100 text-red-400'
                            : 'text-gray-500',
                        d.getDay() === 1 && 'border-l-2 border-l-gray-300',
                      )}
                      style={{ width: CW, minWidth: CW }}
                    >
                      <div className="text-[8px] leading-tight">{d.getDate()}</div>
                      <div className="text-[7px] opacity-70">
                        {['일', '월', '화', '수', '목', '금', '토'][d.getDay()]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, ri) => {
                  const cm = catMerge[ri]
                  const mm = modelMerge[ri]
                  const borderB = isModelLast(ri)
                    ? 'border-b-2 border-b-gray-400'
                    : 'border-b border-b-surface-border/60'
                  const showMeta = row.lineIndex === 0 || row.isMrMinor

                  return (
                    <tr key={row.id} className={borderB} style={{ height: RH }}>
                      {!cm.hidden && showMeta && (
                        <td
                          rowSpan={cm.rowSpan}
                          className="sticky left-0 z-10 bg-white border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle"
                        >
                          {row.category}
                        </td>
                      )}
                      {!mm.hidden && showMeta && (
                        <td
                          rowSpan={mm.rowSpan}
                          className="sticky left-[88px] z-10 bg-white border-r border-surface-border px-1.5 text-[11px] font-semibold text-center align-middle"
                        >
                          {row.model}
                        </td>
                      )}
                      {!mm.hidden && showMeta && (
                        <>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle"
                          >
                            {row.variant}
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] align-middle"
                          >
                            {row.manufacturer}
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] font-mono align-middle"
                          >
                            {row.soc}
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] align-middle"
                          >
                            {row.hwPm}
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] align-middle"
                          >
                            {row.swPo}
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] align-middle"
                          >
                            {row.swPm}
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[9px] text-gray-600 align-middle min-w-[140px]"
                          >
                            <span className="whitespace-pre-wrap leading-snug">{row.spec}</span>
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] align-middle"
                          >
                            {row.pv}
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] align-middle"
                          >
                            {row.mp}
                          </td>
                          <td
                            rowSpan={mm.rowSpan}
                            className="border-r border-surface-border px-1.5 text-[10px] align-middle"
                          >
                            {row.ats}
                          </td>
                        </>
                      )}

                      {dates.map((d, di) => {
                        const isW = d.getDay() === 0 || d.getDay() === 6
                        if (!row.showTimeline) {
                          return (
                            <td
                              key={di}
                              className={clsx(
                                'border-r border-surface-border/30',
                                isW && 'bg-gray-50/40',
                              )}
                              style={{ width: CW, minWidth: CW, height: RH }}
                            />
                          )
                        }

                        const bars = row.bars
                        const bar = bars.find((b) => barCoversDay(b, d))
                        const isBS = bar && isBarStartDay(bar, d)
                        const bc = bar ? BAR_STYLE[bar.barType] : null
                        const barSpanDays = bar
                          ? diffD(toD(normDate(bar.start)), toD(normDate(bar.end))) + 1
                          : 0
                        const barMinW = barSpanDays * CW - 2
                        const barW = bar?.label
                          ? Math.max(barMinW, bar.label.length * 6 + 8)
                          : barMinW
                        const isMpSingle = bar?.barType === 'mp' && barSpanDays <= 1

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
                            {bar && bc && isBS && !isMpSingle && (
                              <div
                                className="absolute top-1 left-0 rounded-sm flex items-center z-[1] pointer-events-none"
                                style={{
                                  width: `${barW}px`,
                                  minWidth: `${barMinW}px`,
                                  height: RH - 8,
                                  backgroundColor: bc.bg,
                                }}
                              >
                                {bar.label ? (
                                  <span
                                    className="px-0.5 text-[7px] font-bold leading-none whitespace-nowrap"
                                    style={{ color: bc.text }}
                                  >
                                    {bar.label}
                                  </span>
                                ) : null}
                              </div>
                            )}
                            {bar && bc && isBS && isMpSingle && (
                              <div
                                className="absolute top-1 left-1/2 -translate-x-1/2 rounded px-0.5 text-[7px] font-bold z-[1]"
                                style={{ backgroundColor: bc.bg, color: bc.text }}
                              >
                                MP
                              </div>
                            )}
                            {bar && bc && !isBS && !isMpSingle && (
                              <div
                                className="absolute inset-y-1 inset-x-0 rounded-sm pointer-events-none"
                                style={{ backgroundColor: bc.bg }}
                              />
                            )}
                            {di === todayOff && todayOff >= 0 && todayOff < DAYS && (
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
          </div>
        </div>
        )}
        <p className="text-[10px] text-gray-400 mt-2 text-right">
          빨간 세로선 = 오늘 ({fmt(today)}) · Event 라벨 = Event명
        </p>
      </div>
    </>
  )
}
