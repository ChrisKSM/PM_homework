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
  Undo2,
} from 'lucide-react'
import clsx from 'clsx'
import Header from '../components/layout/Header'
import OverviewEventPicker from '../components/modelSchedule/OverviewEventPicker'
import OverviewScheduleTable, { HW_LEGEND, SW_LEGEND } from '../components/modelSchedule/OverviewScheduleTable'
import OverviewSnapshotDialog from '../components/modelSchedule/OverviewSnapshotDialog'
import { modelScheduleApi } from '../api/modelScheduleApi'
import { OVERVIEW_MOCK_MODELS } from '../data/modelScheduleOverviewMock'
import type { OverviewBarType, OverviewEvent, OverviewEventKind, OverviewModel } from '../types/modelScheduleOverview'
import {
  classifyEventKind,
  expandOverviewToDisplayRows,
  inferBarType,
  isValidOverviewEvent,
  prepareOverviewModels,
  type OverviewMetaKey,
} from '../utils/modelScheduleOverviewRows'
import { HW_BAR_STYLE, SW_BAR_STYLE } from '../utils/overviewBarStyles'

const DAYS = 123

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

function exportOverviewCSV(models: OverviewModel[]) {
  const h = ['제품군', '모델명', '개발등급', 'SoC', 'SW', '스펙', 'PV', 'MP', 'Event', 'Start', 'End', 'Kind']
  const rows: string[][] = []
  for (const m of models) {
    const base = [m.category, m.model, m.variant, m.soc, m.swPm, m.spec.replace(/\n/g, ' '), m.pv, m.mp]
    const evs = (m.events ?? []).filter(isValidOverviewEvent)
    if (!evs.length) rows.push([...base, '', '', '', ''])
    else {
      for (const e of evs) {
        rows.push([...base, e.name, e.start, e.end, classifyEventKind(e.name, e.kind)])
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
        className="w-full px-1 py-0.5 border border-gray-300 rounded text-[9px] bg-white resize-none min-h-[40px] text-center"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
      />
    )
  }
  return (
    <input
      className="w-full px-1 py-0.5 border border-gray-300 rounded text-[10px] bg-white text-center"
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

function findEventAt(events: OverviewEvent[], date: string, kind: OverviewEventKind): OverviewEvent | undefined {
  return events.find(
    (e) =>
      isValidOverviewEvent(e) &&
      classifyEventKind(e.name, e.kind) === kind &&
      date >= normDate(e.start) &&
      date <= normDate(e.end),
  )
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
    kind: OverviewEventKind
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
          setModels(prepareOverviewModels(res.models as OverviewModel[]))
          setDataSource(res.source === 'default' ? 'mock' : res.source)
          setLoadError(null)
        } else {
          setModels(prepareOverviewModels(OVERVIEW_MOCK_MODELS))
          setDataSource('mock')
          setLoadError('DB/API 데이터 없음 — mock 데이터 표시')
        }
      })
      .catch(() => {
        if (cancelled) return
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
  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => dayStart(addDays(viewStart, i))), [viewStart])
  const today = dayStart(new Date())
  const todayOff = useMemo(() => diffD(viewStart, today), [viewStart, today])
  const displayRows = useMemo(() => expandOverviewToDisplayRows(sortedModels), [sortedModels])

  const updateModel = (modelId: string, field: OverviewMetaKey, value: string) => {
    setModels((p) => p.map((m) => (m.id === modelId ? { ...m, [field]: value } : m)))
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
    } catch {
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
        category: 'Sound Suite',
        model: '새 모델',
        variant: 'JDM B_HW',
        soc: '',
        swPm: '',
        spec: '',
        pv: '',
        mp: '',
        events: [],
      },
    ])
  }

  const deleteModel = (modelId: string) => setModels((p) => p.filter((m) => m.id !== modelId))

  const handleTimelineClick = (modelId: string, kind: OverviewEventKind, d: Date, e: React.MouseEvent) => {
    if (!editing) return
    e.stopPropagation()
    const ds = toISO(d)
    const model = models.find((m) => m.id === modelId)
    const ev = model ? findEventAt(model.events ?? [], ds, kind) : undefined
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPicker({
      modelId,
      kind,
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
          const idx = events.findIndex(
            (ev) =>
              isValidOverviewEvent(ev) &&
              classifyEventKind(ev.name, ev.kind) === snap.kind &&
              snap.date >= normDate(ev.start) &&
              snap.date <= normDate(ev.end),
          )
          const payload: OverviewEvent = {
            name: name || type,
            start: snap.date,
            end: snap.date,
            barType: type,
            kind: snap.kind,
          }
          if (idx >= 0) events[idx] = { ...events[idx], ...payload, end: events[idx].end || snap.date }
          else events.push(payload)
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
              (ev) =>
                !(
                  classifyEventKind(ev.name, ev.kind) === snap.kind &&
                  snap.date >= normDate(ev.start) &&
                  snap.date <= normDate(ev.end)
                ),
            ),
          }
        }),
      )
      return null
    })
  }

  const renderMetaCell = useCallback(
    (row: (typeof displayRows)[0], key: OverviewMetaKey) => {
      const model = sortedModels.find((m) => m.id === row.modelId)
      if (!model) return null
      const val = model[key]
      if (!editing) {
        if (key === 'spec') return <span className="whitespace-pre-wrap leading-snug text-[9px]">{val}</span>
        return val
      }
      return <EI value={val} onChange={(v) => updateModel(row.modelId, key, v)} multiline={key === 'spec'} />
    },
    [editing, sortedModels],
  )

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
      <Header title="전 모델 일정" subtitle="A~H 메타 · HW/SW Event 타임라인" />
      <div className="pt-16 p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button type="button" onClick={() => setDayOffset((o) => o - 14)} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
            {fmt(viewStart)} ~ {fmt(addDays(viewStart, DAYS - 1))}
          </span>
          <button type="button" onClick={() => setDayOffset((o) => o + 14)} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page">
            <ChevronRight size={16} />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <div className="flex items-center gap-3 flex-wrap text-[10px] font-medium">
            <span className="text-gray-500 font-semibold">HW</span>
            {HW_LEGEND.map(({ type, label }) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: HW_BAR_STYLE[type].bg }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 font-semibold">SW</span>
            {SW_LEGEND.map(({ type, label }) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: SW_BAR_STYLE[type].bg }} />
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
          {editing && (
            <button type="button" onClick={addModel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200">
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

        {loadError ? <p className="text-[10px] text-amber-800 mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">{loadError}</p> : null}
        {editing && (
          <div className="text-[10px] text-gray-500 mb-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            1행=HW Event(PrePV/PV/MP) · 2행=SW Event(SIT/FC/QP) · <b>-</b> 는 빈칸 · 제품군별 정렬
          </div>
        )}
        <p className="text-[10px] text-gray-500 mb-2 bg-slate-50 border border-surface-border rounded-lg px-3 py-1.5">
          A~H: 제품군·모델·등급·SoC·SW·스펙·PV·MP (중앙정렬) · I~N: 1행 HW / 2행 SW 타임라인 · MR_Minor 1행(SW)
        </p>

        {displayRows.length === 0 ? (
          <div className="border border-surface-border rounded-xl bg-white p-8 text-center text-gray-500 text-sm">표시할 모델 데이터가 없습니다.</div>
        ) : (
          <div className="border border-surface-border rounded-xl bg-white">
            <div className="overflow-x-auto">
              <OverviewScheduleTable
                displayRows={displayRows}
                dates={dates}
                todayOff={todayOff}
                editing={editing}
                showDeleteCol={editing}
                onTimelineClick={handleTimelineClick}
                onDeleteModel={deleteModel}
                renderMetaCell={renderMetaCell}
              />
            </div>
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-2 text-right">빨간 세로선 = 오늘 ({fmt(today)})</p>
      </div>

      {picker && (
        <OverviewEventPicker
          x={picker.x}
          y={picker.y}
          kind={picker.kind}
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
        todayOff={todayOff}
      />
    </>
  )
}
