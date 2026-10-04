import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from 'lucide-react'
import clsx from 'clsx'
import Header from '../components/layout/Header'
import OverviewEventPicker from '../components/modelSchedule/OverviewEventPicker'
import OverviewSnapshotDialog from '../components/modelSchedule/OverviewSnapshotDialog'
import { modelScheduleApi } from '../api/modelScheduleApi'
import { OVERVIEW_MOCK_MODELS } from '../data/modelScheduleOverviewMock'
import type {
  OverviewBarType,
  OverviewEvent,
  OverviewModel,
  OverviewScheduleBar,
} from '../types/modelScheduleOverview'
import {
  calcOverviewMerge,
  expandOverviewToDisplayRows,
  inferBarType,
  overviewGroupKey,
  prepareOverviewModels,
} from '../utils/modelScheduleOverviewRows'

const CW = 22
const RH = 26
const LEFT_W = 980
const DAYS = 123

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

const META_FIELDS = [
  'category',
  'model',
  'variant',
  'manufacturer',
  'soc',
  'hwPm',
  'swPo',
  'swPm',
  'spec',
  'pv',
  'mp',
  'ats',
] as const

type MetaField = (typeof META_FIELDS)[number]

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

function exportOverviewCSV(models: OverviewModel[]) {
  const h = [
    '제품군', '모델명', '개발등급', '생산', 'SoC', 'HW PM', 'SW PO', 'SW PM',
    '스펙', 'PV', 'MP', 'ATS', 'Event', 'Start', 'End',
  ]
  const rows: string[][] = []
  for (const m of models) {
    const base = [
      m.category, m.model, m.variant, m.manufacturer, m.soc,
      m.hwPm, m.swPo, m.swPm, m.spec.replace(/\n/g, ' '), m.pv, m.mp, m.ats,
    ]
    if (!m.events?.length) {
      rows.push([...base, '', '', ''])
    } else {
      for (const e of m.events) {
        rows.push([...base, e.name, e.start, e.end])
      }
    }
  }
  const csv = '\uFEFF' + [h, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `전모델일정_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

function EI({ value, onChange, multiline = false }: { value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const [local, setLocal] = useState(value)
  useEffect(() => {
    setLocal(value)
  }, [value])
  const commit = () => {
    if (local !== value) onChange(local)
  }
  if (multiline) {
    return (
      <textarea
        className="w-full px-1 py-0.5 border border-gray-300 rounded text-[9px] bg-white resize-none min-h-[40px]"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
      />
    )
  }
  return (
    <input
      className="w-full px-1 py-0.5 border border-gray-300 rounded text-[10px] bg-white"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
          ;(e.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}

function findEventAt(events: OverviewEvent[], date: string): OverviewEvent | undefined {
  return events.find((e) => date >= normDate(e.start) && date <= normDate(e.end))
}

export default function ModelScheduleOverviewPage() {
  const location = useLocation()
  const [models, setModels] = useState<OverviewModel[]>(() => prepareOverviewModels(OVERVIEW_MOCK_MODELS))
  const [snapshot, setSnapshot] = useState<OverviewModel[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'warn'; text: string } | null>(null)
  const [dataSource, setDataSource] = useState<'mongo' | 'local' | 'mock'>('mock')
  const [startDate] = useState(() => toD('2026-10-01'))
  const [dayOffset, setDayOffset] = useState(0)
  const [showSnapshotPopup, setShowSnapshotPopup] = useState(false)
  const [picker, setPicker] = useState<{
    modelId: string
    date: string
    x: number
    y: number
    currentType: OverviewBarType | null
    currentName: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    modelScheduleApi
      .loadOverview()
      .then((res) => {
        if (cancelled) return
        if (res.models.length > 0) {
          const prepared = prepareOverviewModels(res.models as OverviewModel[])
          setModels(prepared)
          setDataSource(res.source === 'default' ? 'mock' : res.source)
          setLoadError(null)
        } else {
          setModels(prepareOverviewModels(OVERVIEW_MOCK_MODELS))
          setDataSource('mock')
          setLoadError('DB/API 데이터 없음 — mock 데이터 표시')
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('overview load error:', err)
        setModels(prepareOverviewModels(OVERVIEW_MOCK_MODELS))
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

  const sortedModels = useMemo(() => prepareOverviewModels(models), [models])
  const viewStart = useMemo(() => addDays(startDate, dayOffset), [startDate, dayOffset])
  const dates = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => dayStart(addDays(viewStart, i))),
    [viewStart],
  )
  const today = dayStart(new Date())
  const todayOff = useMemo(() => diffD(viewStart, today), [viewStart, today])

  const displayRows = useMemo(() => expandOverviewToDisplayRows(sortedModels), [sortedModels])
  const catMerge = useMemo(() => calcOverviewMerge(displayRows, (r) => r.category), [displayRows])
  const modelMerge = useMemo(() => calcOverviewMerge(displayRows, overviewGroupKey), [displayRows])
  const monthHdr = useMemo(() => monthSpans(dates), [dates])

  const isModelLast = useCallback(
    (ri: number) => {
      if (ri >= displayRows.length - 1) return true
      return overviewGroupKey(displayRows[ri]) !== overviewGroupKey(displayRows[ri + 1])
    },
    [displayRows],
  )

  const updateModel = (modelId: string, field: MetaField, value: string) => {
    setModels((p) =>
      p.map((m) => (m.id === modelId ? { ...m, [field]: value } : m)),
    )
  }

  const startEdit = () => {
    setSnapshot(JSON.parse(JSON.stringify(sortedModels)))
    setEditing(true)
    setSaveMessage(null)
  }

  const cancelEdit = () => {
    if (snapshot) setModels(snapshot)
    setSnapshot(null)
    setEditing(false)
    setPicker(null)
  }

  const finishEdit = async () => {
    setEditing(false)
    setPicker(null)
    setSnapshot(null)
    setSaving(true)
    setSaveMessage(null)
    const prepared = prepareOverviewModels(models)
    setModels(prepared)
    try {
      const res = await modelScheduleApi.saveOverview(prepared)
      setDataSource(res.source)
      setSaveMessage({
        type: res.source === 'mongo' ? 'success' : 'warn',
        text: res.source === 'mongo' ? '저장되었습니다.' : res.message,
      })
    } catch (e) {
      console.warn('Save failed:', e)
      setSaveMessage({ type: 'warn', text: '저장에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  const addModel = () => {
    const ts = Date.now()
    setModels((p) => [
      ...p,
      {
        id: `new-${ts}`,
        category: '',
        model: '새 모델',
        variant: '',
        manufacturer: '',
        soc: '',
        hwPm: '',
        swPo: '',
        swPm: '',
        spec: '',
        pv: '',
        mp: '',
        ats: '',
        events: [],
      },
    ])
  }

  const deleteModel = (modelId: string) => {
    setModels((p) => p.filter((m) => m.id !== modelId))
  }

  const handleTimelineClick = (modelId: string, d: Date, e: React.MouseEvent) => {
    if (!editing) return
    e.stopPropagation()
    const ds = toISO(d)
    const model = models.find((m) => m.id === modelId)
    const ev = model ? findEventAt(model.events ?? [], ds) : undefined
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPicker({
      modelId,
      date: ds,
      x: rect.left,
      y: rect.bottom + 2,
      currentType: ev?.barType ?? (ev ? inferBarType(ev.name) : null),
      currentName: ev?.name ?? '',
    })
  }

  const applyEvent = (type: OverviewBarType, name: string) => {
    setPicker((current) => {
      if (!current) return null
      const snap = current
      setModels((p) =>
        p.map((m) => {
          if (m.id !== snap.modelId) return m
          const events = [...(m.events ?? [])]
          const idx = events.findIndex((ev) => snap.date >= normDate(ev.start) && snap.date <= normDate(ev.end))
          if (idx >= 0) {
            events[idx] = { ...events[idx], name: name || events[idx].name, barType: type }
          } else {
            events.push({ name: name || 'Event', start: snap.date, end: snap.date, barType: type })
          }
          return { ...m, events }
        }),
      )
      return { ...snap, currentType: type, currentName: name }
    })
  }

  const removeEvent = () => {
    setPicker((current) => {
      if (!current) return null
      const snap = current
      setModels((p) =>
        p.map((m) => {
          if (m.id !== snap.modelId) return m
          return {
            ...m,
            events: (m.events ?? []).filter(
              (ev) => !(snap.date >= normDate(ev.start) && snap.date <= normDate(ev.end)),
            ),
          }
        }),
      )
      return null
    })
  }

  const metaCols = [
    '제품군', '모델명', '개발등급', '생산', 'SoC', 'HW PM', 'SW PO', 'SW PM', '스펙', 'PV', 'MP', 'ATS',
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
      <Header title="전 모델 일정" subtitle="모델별 PV/MP 일정 · Event 타임라인 · 편집 · 엑셀" />
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
          <div className="flex-1" />
          {saving && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              저장 중...
            </span>
          )}
          {!saving && saveMessage && (
            <span className={clsx('text-[10px] font-medium', saveMessage.type === 'success' ? 'text-emerald-600' : 'text-amber-600')}>
              {saveMessage.text}
            </span>
          )}
          {!saving && !saveMessage && dataSource !== 'mock' && (
            <span className="text-[10px] text-gray-400">{dataSource === 'mongo' ? 'DB' : '브라우저'}에서 불러옴</span>
          )}
          {editing && (
            <button
              type="button"
              onClick={addModel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200"
            >
              <Plus size={14} />
              모델 추가
            </button>
          )}
          {editing ? (
            <>
              <button type="button" onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 border border-gray-300">
                <Undo2 size={14} />
                취소
              </button>
              <button type="button" onClick={finishEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-300">
                <Check size={14} />
                편집 완료
              </button>
            </>
          ) : (
            <button type="button" onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page">
              <Pencil size={14} />
              Edit
            </button>
          )}
          <button type="button" onClick={() => setShowSnapshotPopup(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page">
            <Camera size={14} />
            Snapshot
          </button>
          <button type="button" onClick={() => exportOverviewCSV(sortedModels)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page">
            <Download size={14} />
            엑셀
          </button>
          <span className="text-[10px] text-gray-400">
            {sortedModels.length}모델 · {displayRows.length}행
          </span>
        </div>

        {loadError ? (
          <p className="text-[10px] text-amber-800 mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">{loadError}</p>
        ) : null}
        {editing && (
          <div className="text-[10px] text-gray-500 mb-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            💡 메타 셀 직접 편집 · 일정 셀 <b>클릭</b> → Event 타입+이름 · <b>취소</b> = 복원 · <b>편집 완료</b> = DB 저장
          </div>
        )}
        <p className="text-[10px] text-gray-500 mb-2 bg-slate-50 border border-surface-border rounded-lg px-3 py-1.5">
          JDM 모델 <b>2행</b>(메타+Event) · <b>MR_Minor</b> 1행 · 정렬: 사운드바(Wi-Fi) → 사운드바 → 파티스피커 → 무선스피커
        </p>

        {displayRows.length === 0 ? (
          <div className="border border-surface-border rounded-xl bg-white p-8 text-center text-gray-500 text-sm">
            표시할 모델 데이터가 없습니다.
          </div>
        ) : (
          <div className="border border-surface-border rounded-xl bg-white">
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse" style={{ minWidth: LEFT_W + DAYS * CW + (editing ? 32 : 0) }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th colSpan={metaCols.length + (editing ? 1 : 0)} className="border-r border-surface-border px-2 py-1 text-left text-[10px] text-gray-500 sticky left-0 z-20 bg-gray-50" />
                    {monthHdr.map((m, i) => (
                      <th key={i} colSpan={m.len} className="border-r border-surface-border px-1 py-1 text-center text-[10px] font-semibold text-gray-600 bg-gray-50">
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
                    {editing && <th className="border-r border-surface-border px-1 py-2 text-gray-400 text-[9px] w-8">삭제</th>}
                    {dates.map((d, i) => (
                      <th
                        key={i}
                        className={clsx(
                          'border-r border-surface-border px-0 py-0.5 text-center font-medium',
                          d.getTime() === today.getTime() ? 'bg-red-100 text-red-700' : d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-100 text-red-400' : 'text-gray-500',
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
                    const showMeta = row.lineIndex === 0 || row.isMrMinor
                    const model = sortedModels.find((m) => m.id === row.modelId)

                    const renderMetaCell = (field: MetaField, multiline = false) => {
                      if (!model) return null
                      const val = model[field]
                      return editing ? (
                        <EI value={val} onChange={(v) => updateModel(row.modelId, field, v)} multiline={multiline} />
                      ) : multiline ? (
                        <span className="whitespace-pre-wrap leading-snug">{val}</span>
                      ) : (
                        val
                      )
                    }

                    return (
                      <tr key={row.id} className={borderB} style={{ height: RH }}>
                        {!cm.hidden && showMeta && (
                          <td rowSpan={cm.rowSpan} className="sticky left-0 z-10 bg-white border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle">
                            {renderMetaCell('category')}
                          </td>
                        )}
                        {!mm.hidden && showMeta && (
                          <td rowSpan={mm.rowSpan} className="sticky left-[88px] z-10 bg-white border-r border-surface-border px-1.5 text-[11px] font-semibold text-center align-middle">
                            {renderMetaCell('model')}
                          </td>
                        )}
                        {!mm.hidden && showMeta && (
                          <>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] text-gray-600 align-middle">{renderMetaCell('variant')}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{renderMetaCell('manufacturer')}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] font-mono align-middle">{renderMetaCell('soc')}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{renderMetaCell('hwPm')}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{renderMetaCell('swPo')}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{renderMetaCell('swPm')}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[9px] text-gray-600 align-middle min-w-[140px]">{renderMetaCell('spec', true)}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{renderMetaCell('pv')}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{renderMetaCell('mp')}</td>
                            <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1.5 text-[10px] align-middle">{renderMetaCell('ats')}</td>
                          </>
                        )}
                        {editing && showMeta && (
                          <td rowSpan={mm.rowSpan} className="border-r border-surface-border px-1 text-center align-middle">
                            <button type="button" onClick={() => deleteModel(row.modelId)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        )}

                        {dates.map((d, di) => {
                          const isW = d.getDay() === 0 || d.getDay() === 6
                          if (!row.showTimeline) {
                            return (
                              <td key={di} className={clsx('border-r border-surface-border/30', isW && 'bg-gray-50/40')} style={{ width: CW, minWidth: CW, height: RH }} />
                            )
                          }

                          const bars = row.bars
                          const bar = bars.find((b) => barCoversDay(b, d))
                          const isBS = bar && isBarStartDay(bar, d)
                          const bc = bar ? BAR_STYLE[bar.barType] : null
                          const barSpanDays = bar ? diffD(toD(normDate(bar.start)), toD(normDate(bar.end))) + 1 : 0
                          const barMinW = barSpanDays * CW - 2
                          const barW = bar?.label ? Math.max(barMinW, bar.label.length * 6 + 8) : barMinW
                          const isMpSingle = bar?.barType === 'mp' && barSpanDays <= 1

                          return (
                            <td
                              key={di}
                              className={clsx(
                                'border-r border-surface-border/40 px-0 py-0 relative',
                                isW && 'bg-gray-50/50',
                                d.getDay() === 1 && 'border-l-2 border-l-gray-200',
                                editing && 'cursor-pointer hover:bg-blue-50/40',
                              )}
                              style={{ width: CW, minWidth: CW, height: RH }}
                              onClick={editing ? (e) => handleTimelineClick(row.modelId, d, e) : undefined}
                            >
                              {bar && bc && isBS && !isMpSingle && (
                                <div className="absolute top-1 left-0 rounded-sm flex items-center z-[1] pointer-events-none" style={{ width: `${barW}px`, minWidth: `${barMinW}px`, height: RH - 8, backgroundColor: bc.bg }}>
                                  {bar.label ? <span className="px-0.5 text-[7px] font-bold leading-none whitespace-nowrap" style={{ color: bc.text }}>{bar.label}</span> : null}
                                </div>
                              )}
                              {bar && bc && isBS && isMpSingle && (
                                <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded px-0.5 text-[7px] font-bold z-[1] pointer-events-none" style={{ backgroundColor: bc.bg, color: bc.text }}>MP</div>
                              )}
                              {bar && bc && !isBS && !isMpSingle && (
                                <div className="absolute inset-y-1 inset-x-0 rounded-sm pointer-events-none" style={{ backgroundColor: bc.bg }} />
                              )}
                              {di === todayOff && todayOff >= 0 && todayOff < DAYS && (
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
            </div>
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-2 text-right">빨간 세로선 = 오늘 ({fmt(today)}) · Event 라벨 = Event명</p>
      </div>

      {picker && (
        <OverviewEventPicker
          x={picker.x}
          y={picker.y}
          currentType={picker.currentType}
          currentName={picker.currentName}
          onSelect={applyEvent}
          onRemove={removeEvent}
          onClose={() => setPicker(null)}
        />
      )}
      <OverviewSnapshotDialog
        open={showSnapshotPopup}
        onClose={() => setShowSnapshotPopup(false)}
        models={sortedModels}
        dates={dates}
        periodLabel={`${fmt(viewStart)} ~ ${fmt(addDays(viewStart, DAYS - 1))}`}
        today={today}
        viewStart={viewStart}
      />
    </>
  )
}
