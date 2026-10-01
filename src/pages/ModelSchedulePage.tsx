import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import Header from '../components/layout/Header'
import { Download, Pencil, Check, ChevronLeft, ChevronRight, Filter, X, Plus, Trash2, Undo2 } from 'lucide-react'
import clsx from 'clsx'

// ── 타입 ─────────────────────────────────────────────────────────────────────

type BarType = 'planned' | 'inprogress' | 'event_ng' | 'event_ok' | 'event_done_est' | 'su_fota'

interface ScheduleBar { start: string; end: string; type: BarType; label?: string }

type TestCategory = '일반성능' | '호환성' | '안정성' | '시너지'
type StatusType = '완료' | '검증제외' | '예정'

interface ModelRow {
  id: string; category: string; model: string; variant: string; manufacturer: string
  soc: string; staff: string; testType: TestCategory; changes: string; status: StatusType; bars: ScheduleBar[]
}

// ── 상수 ─────────────────────────────────────────────────────────────────────

const BAR_CONFIG: Record<BarType, { color: string; label: string }> = {
  planned: { color: '#94A3B8', label: '진행 예정' }, inprogress: { color: '#FACC15', label: '진행중' },
  event_ng: { color: '#EF4444', label: 'Event NG' }, event_ok: { color: '#22C55E', label: 'Event OK' },
  event_done_est: { color: '#A78BFA', label: 'Event 완료 예상' }, su_fota: { color: '#F97316', label: 'SU/FOTA 배포' },
}
const BAR_TYPES: BarType[] = ['planned', 'inprogress', 'event_ng', 'event_ok', 'event_done_est', 'su_fota']
const TEST_TYPES: TestCategory[] = ['일반성능', '호환성', '안정성', '시너지']
const STATUS_LIST: StatusType[] = ['예정', '완료', '검증제외']

const STATUS_STYLE: Record<StatusType, { bg: string; text: string }> = {
  '완료': { bg: 'bg-emerald-50', text: 'text-emerald-600' }, '예정': { bg: 'bg-gray-100', text: 'text-gray-500' },
  '검증제외': { bg: 'bg-amber-50', text: 'text-amber-600' },
}
const TT_STYLE: Record<TestCategory, string> = {
  '일반성능': 'bg-blue-50 text-blue-600', '호환성': 'bg-purple-50 text-purple-600',
  '안정성': 'bg-amber-50 text-amber-600', '시너지': 'bg-emerald-50 text-emerald-600',
}

// ── Mock ─────────────────────────────────────────────────────────────────────

function makeRows(cat: string, model: string, variant: string, mfr: string, soc: string, staff1: string, staff2: string, changes: string, status: StatusType, bars0: ScheduleBar[]): ModelRow[] {
  const base = { category: cat, model, variant, manufacturer: mfr, soc, changes, status }
  return TEST_TYPES.map((tt, i) => ({
    ...base, id: `${model.replace(/\//g, '')}-${i}`, staff: i < 2 ? staff1 : staff2, testType: tt,
    bars: i === 0 ? bars0 : [],
  }))
}

const INITIAL_DATA: ModelRow[] = [
  ...makeRows('사운드바(Wi-Fi)', 'H7', 'MR8/9', 'Symphony', 'Q2S', '김로경', '김승화', 'SoC LPE 적용', '예정', [
    { start: '2026-09-17', end: '2026-09-19', type: 'inprogress' },
    { start: '2026-09-22', end: '2026-09-24', type: 'event_ng' },
    { start: '2026-09-25', end: '2026-09-26', type: 'event_ok', label: 'MR8' },
  ]),
  ...makeRows('사운드바(Wi-Fi)', 'W7', 'MR8/9', 'Symphony', 'MTK532', '김승화', '김로경', 'OLED TV 연동', '예정', [
    { start: '2026-09-18', end: '2026-09-22', type: 'inprogress' },
    { start: '2026-09-23', end: '2026-09-25', type: 'event_ok', label: 'DEV' },
  ]),
  ...makeRows('사운드바(Wi-Fi)', 'M7/M5', 'MR8/9', 'Symphony', 'MTK532', '김로경', '김승화', 'MCU 개선', '예정', [
    { start: '2026-09-29', end: '2026-10-03', type: 'planned' },
    { start: '2026-10-06', end: '2026-10-08', type: 'event_done_est', label: 'MR9' },
  ]),
  ...makeRows('사운드바(Wi-Fi)', 'S80C', 'GM.B.HW', 'Tonly', 'MLC3763', '김로경', '김승화', 'Near Source 추가', '완료', [
    { start: '2026-09-22', end: '2026-09-26', type: 'event_ok', label: 'FC1' },
    { start: '2026-10-15', end: '2026-10-20', type: 'event_done_est', label: 'FC2' },
  ]),
  ...makeRows('휴대스피커(BT)', 'Mini', 'MR8/9', 'Worik', 'BES2710A', '김승화', '김로경', 'USB Audio Part', '예정', [
    { start: '2026-10-01', end: '2026-10-08', type: 'planned' },
    { start: '2026-10-19', end: '2026-10-22', type: 'su_fota', label: 'SU배포' },
  ]),
  ...makeRows('파티스피커(BT)', 'STAGE5301', 'MR1/N', 'Tonly', 'MLC3725', '김승화', '김로경', 'USB Audio Part', '검증제외', [
    { start: '2026-09-26', end: '2026-10-03', type: 'planned' },
  ]),
]

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function fmt(d: Date) { return `${d.getMonth() + 1}/${d.getDate()}` }
function diffD(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000) }
function toD(s: string) { return new Date(s + 'T00:00:00') }
function toISO(d: Date) { return d.toISOString().slice(0, 10) }
function uniq(data: ModelRow[], f: keyof ModelRow) { const s = new Set<string>(); data.forEach(r => { const v = String(r[f] || '').trim(); if (v) s.add(v) }); return Array.from(s).sort() }

function exportCSV(data: ModelRow[]) {
  const h = ['카테고리','모델명','개발등급','생산업체','SoC','담당','구분','주요 변경점','Status']
  const rows = data.map(r => [r.category,r.model,r.variant,r.manufacturer,r.soc,r.staff,r.testType,r.changes,r.status])
  const csv = '\uFEFF' + [h,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
  a.download = `모델현황_${new Date().toISOString().slice(0,10)}.csv`; a.click()
}

// ── 병합 (카테고리 + 모델 기준 — 개발등급~변경점 포함) ───────────────────────

interface Merge { rowSpan: number; hidden: boolean }

function calcMerge(rows: ModelRow[], groupKey: (r: ModelRow) => string): Merge[] {
  const res: Merge[] = rows.map(() => ({ rowSpan: 1, hidden: false }))
  let i = 0
  while (i < rows.length) {
    const k = groupKey(rows[i])
    let j = i + 1
    while (j < rows.length && groupKey(rows[j]) === k && k) j++
    res[i].rowSpan = j - i
    for (let x = i + 1; x < j; x++) res[x].hidden = true
    i = j
  }
  return res
}

// ── 바 타입 선택 팝업 ────────────────────────────────────────────────────────

function BarTypePicker({ x, y, onSelect, onRemove, onClose }: {
  x: number; y: number; onSelect: (t: BarType) => void; onRemove: () => void; onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 bg-white border border-surface-border rounded-lg shadow-xl py-1 w-36" style={{ left: x, top: y }}>
        {BAR_TYPES.map(t => (
          <button key={t} onClick={() => onSelect(t)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-surface-page text-left">
            <div className="w-4 h-3 rounded-sm shrink-0" style={{ backgroundColor: BAR_CONFIG[t].color }} />
            {BAR_CONFIG[t].label}
          </button>
        ))}
        <div className="border-t border-surface-border my-1" />
        <button onClick={onRemove} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-red-50 text-red-500 text-left">
          <X size={12} /> 삭제
        </button>
      </div>
    </>
  )
}

// ── 페이지 ───────────────────────────────────────────────────────────────────

const DAYS = 42, CW = 28, RH = 28

export default function ModelSchedulePage() {
  const [data, setData] = useState<ModelRow[]>(INITIAL_DATA)
  const [snapshot, setSnapshot] = useState<ModelRow[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [startDate, setStartDate] = useState(new Date('2026-09-15'))
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fCat, setFCat] = useState(''); const [fModel, setFModel] = useState(''); const [fStatus, setFStatus] = useState('')
  const [picker, setPicker] = useState<{ rowId: string; date: string; x: number; y: number } | null>(null)

  const hasFilter = !!(fCat || fModel || fStatus)
  const filtered = useMemo(() => data.filter(r =>
    (!fCat || r.category === fCat) && (!fModel || r.model === fModel) && (!fStatus || r.status === fStatus)
  ), [data, fCat, fModel, fStatus])

  const catMerge = useMemo(() => calcMerge(filtered, r => r.category), [filtered])
  const modelMerge = useMemo(() => calcMerge(filtered, r => `${r.category}|${r.model}`), [filtered])

  const today = new Date(); today.setHours(0,0,0,0)
  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(startDate, i)), [startDate])
  const todayOff = useMemo(() => diffD(startDate, today), [startDate, today])

  const isModelLastRow = useCallback((ri: number) => {
    if (ri >= filtered.length - 1) return true
    return `${filtered[ri].category}|${filtered[ri].model}` !== `${filtered[ri + 1].category}|${filtered[ri + 1].model}`
  }, [filtered])

  const startEdit = () => { setSnapshot(JSON.parse(JSON.stringify(data))); setEditing(true) }
  const cancelEdit = () => { if (snapshot) setData(snapshot); setSnapshot(null); setEditing(false) }
  const finishEdit = () => { setSnapshot(null); setEditing(false) /* TODO: save to MongoDB */ }

  const updateField = (id: string, f: keyof ModelRow, v: string) => setData(p => p.map(r => r.id === id ? { ...r, [f]: v } : r))
  const updateModelGroup = (oldModel: string, oldCat: string, field: keyof ModelRow, value: string) => {
    setData(p => p.map(r => r.model === oldModel && r.category === oldCat ? { ...r, [field]: value } : r))
  }

  const addModel = () => {
    const ts = Date.now()
    const rows: ModelRow[] = TEST_TYPES.map((tt, i) => ({
      id: `new-${ts}-${i}`, category: '', model: '새 모델', variant: '', manufacturer: '', soc: '',
      staff: '', testType: tt, changes: '', status: '예정' as StatusType, bars: [],
    }))
    setData(p => [...p, ...rows])
  }

  const deleteModel = (model: string, cat: string) => setData(p => p.filter(r => !(r.model === model && r.category === cat)))

  const handleCellClick = (e: React.MouseEvent, rowId: string, date: Date) => {
    if (!editing) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPicker({ rowId, date: toISO(date), x: rect.left, y: rect.bottom + 2 })
  }

  const applyBarType = (type: BarType) => {
    if (!picker) return
    setData(p => p.map(r => {
      if (r.id !== picker.rowId) return r
      const existing = r.bars.findIndex(b => picker.date >= b.start && picker.date <= b.end)
      if (existing >= 0) {
        const bars = [...r.bars]; bars[existing] = { ...bars[existing], type }; return { ...r, bars }
      }
      return { ...r, bars: [...r.bars, { start: picker.date, end: picker.date, type }] }
    }))
    setPicker(null)
  }

  const removeBar = () => {
    if (!picker) return
    setData(p => p.map(r => {
      if (r.id !== picker.rowId) return r
      return { ...r, bars: r.bars.filter(b => !(picker.date >= b.start && picker.date <= b.end)) }
    }))
    setPicker(null)
  }

  const EI = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input className="w-full px-1 py-0.5 border border-gray-300 rounded text-[10px] bg-white" value={value} onChange={e => onChange(e.target.value)} />
  )

  // 병합 대상 컬럼 렌더 (카테고리/모델 기준 합칠 컬럼들)
  const MergedCell = ({ ri, children, className = '' }: { ri: number; children: React.ReactNode; className?: string }) => {
    if (modelMerge[ri].hidden) return null
    return <td rowSpan={modelMerge[ri].rowSpan} className={clsx('border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap align-middle', className)}>{children}</td>
  }

  return (
    <>
      <Header title="모델 현황" subtitle="모델별 개발/검증 일정 Gantt — 편집 · 엑셀 출력 · MongoDB 저장" />
      <div className="pt-16 p-4">
        {/* 툴바 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button onClick={() => setStartDate(p => addDays(p, -7))} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">{fmt(startDate)} ~ {fmt(addDays(startDate, DAYS - 1))}</span>
          <button onClick={() => setStartDate(p => addDays(p, 7))} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"><ChevronRight size={16} /></button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <div className="flex items-center gap-3 flex-wrap text-[10px] font-medium">
            {Object.entries(BAR_CONFIG).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1"><div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} /><span className="text-gray-600">{c.label}</span></div>
            ))}
          </div>
          <div className="flex-1" />
          {editing && <button onClick={addModel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200"><Plus size={14} /> 모델 추가</button>}
          {editing ? (
            <>
              <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100">
                <Undo2 size={14} /> 취소
              </button>
              <button onClick={finishEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-300">
                <Check size={14} /> 편집 완료
              </button>
            </>
          ) : (
            <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page">
              <Pencil size={14} /> Edit
            </button>
          )}
          <button onClick={() => exportCSV(filtered)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page">
            <Download size={14} /> 엑셀
          </button>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          {([['카테고리', fCat, setFCat, 'category'], ['모델명', fModel, setFModel, 'model'], ['Status', fStatus, setFStatus, 'status']] as const).map(([l, v, s, f]) => (
            <select key={f} value={v} onChange={e => s(e.target.value)}
              className={clsx('text-[10px] px-1.5 py-1 rounded border bg-white cursor-pointer', v ? 'border-lg-red text-lg-red font-bold' : 'border-gray-200 text-gray-500')}>
              <option value="">{l} ▾</option>
              {uniq(data, f).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {hasFilter && <button onClick={() => { setFCat(''); setFModel(''); setFStatus('') }} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-red-500 hover:bg-red-50"><X size={10} /> 초기화</button>}
          <span className="text-[10px] text-gray-400 ml-auto">{filtered.length} / {data.length}건</span>
        </div>

        {editing && (
          <div className="text-[10px] text-gray-500 mb-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            💡 일정 셀 <b>클릭</b> → 바 타입 선택 팝업 · <b>취소</b> 누르면 편집 전 상태로 복원
          </div>
        )}

        {/* 테이블 */}
        <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto" ref={scrollRef}>
            <table className="text-xs border-collapse" style={{ minWidth: `${620 + DAYS * CW}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  {['카테고리','모델명','개발등급','생산업체','SoC','담당','구분','주요 변경점','Status'].map((h, i) => (
                    <th key={i} className={clsx('border-r border-surface-border px-1.5 py-2 text-gray-500 font-semibold text-[10px] whitespace-nowrap',
                      i === 0 && 'sticky left-0 z-10 bg-gray-50 w-20', i === 1 && 'sticky left-20 z-10 bg-gray-50 w-16',
                    )}>{h}</th>
                  ))}
                  {editing && <th className="border-r border-surface-border px-1 py-2 text-gray-400 text-[9px] w-8">삭제</th>}
                  {dates.map((d, i) => (
                    <th key={i} className={clsx('border-r border-surface-border px-0 py-1 text-center font-medium',
                      d.getTime() === today.getTime() ? 'bg-red-100 text-red-700' : (d.getDay() === 0 || d.getDay() === 6) ? 'bg-gray-100 text-gray-400' : 'text-gray-500',
                      d.getDay() === 1 && 'border-l-2 border-l-gray-300'
                    )} style={{ width: CW, minWidth: CW }}>
                      <div className="text-[8px] leading-tight">{fmt(d)}</div>
                      <div className="text-[7px] text-gray-400">{['일','월','화','수','목','금','토'][d.getDay()]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, ri) => {
                  const cm = catMerge[ri]; const mm = modelMerge[ri]
                  const isLast = isModelLastRow(ri)
                  const borderB = isLast ? 'border-b-2 border-b-gray-400' : 'border-b border-b-surface-border/60'

                  return (
                    <tr key={row.id} className={clsx('hover:bg-gray-50/30', borderB)} style={{ height: RH }}>
                      {/* 카테고리 */}
                      {!cm.hidden && (
                        <td rowSpan={cm.rowSpan} className={clsx('sticky left-0 z-10 bg-white border-r border-surface-border px-1.5 text-gray-600 text-[10px] whitespace-nowrap align-middle', isLast && 'border-b-2 border-b-gray-400')}>
                          {editing ? <EI value={row.category} onChange={v => updateModelGroup(row.model, row.category, 'category', v)} /> : row.category}
                        </td>
                      )}
                      {/* 모델명 — 가운데정렬 */}
                      {!mm.hidden && (
                        <td rowSpan={mm.rowSpan} className={clsx('sticky left-20 z-10 bg-white border-r border-surface-border px-1.5 text-gray-900 font-semibold text-[11px] whitespace-nowrap align-middle text-center', isLast && 'border-b-2 border-b-gray-400')}>
                          {editing ? <EI value={row.model} onChange={v => { const om = row.model; const oc = row.category; setData(p => p.map(r => r.model === om && r.category === oc ? { ...r, model: v } : r)) }} /> : row.model}
                        </td>
                      )}
                      {/* 개발등급~변경점: 모델 기준 병합 */}
                      <MergedCell ri={ri} className="text-gray-600">{row.variant}</MergedCell>
                      <MergedCell ri={ri}>{editing ? <EI value={row.manufacturer} onChange={v => updateModelGroup(row.model, row.category, 'manufacturer', v)} /> : <span className="text-gray-600">{row.manufacturer}</span>}</MergedCell>
                      <MergedCell ri={ri} className="text-gray-600 font-mono">{row.soc}</MergedCell>
                      <MergedCell ri={ri}>{editing ? <EI value={row.staff} onChange={v => updateField(row.id, 'staff', v)} /> : <span className="text-gray-600">{row.staff}</span>}</MergedCell>
                      {/* 구분 — 병합 안 함 */}
                      <td className="border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap">
                        <span className={clsx('px-1 py-0.5 rounded text-[9px] font-bold', TT_STYLE[row.testType])}>{row.testType}</span>
                      </td>
                      <MergedCell ri={ri} className="text-gray-500 text-[9px] truncate max-w-[96px]">{row.changes}</MergedCell>
                      {/* Status */}
                      <td className="border-r border-surface-border px-1.5">
                        {editing ? (
                          <select value={row.status} onChange={e => updateField(row.id, 'status', e.target.value)} className="text-[9px] px-1 py-0.5 border border-gray-300 rounded bg-white">
                            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (() => { const s = STATUS_STYLE[row.status]; return <span className={`px-1 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>{row.status}</span> })()}
                      </td>
                      {editing && (
                        <td className="border-r border-surface-border px-1 text-center">
                          {row.testType === '일반성능' && <button onClick={() => deleteModel(row.model, row.category)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>}
                        </td>
                      )}

                      {/* Gantt */}
                      {dates.map((d, di) => {
                        const isW = d.getDay() === 0 || d.getDay() === 6
                        const isM = d.getDay() === 1
                        const bar = row.bars.find(b => d >= toD(b.start) && d <= toD(b.end))
                        const isBS = bar && toD(bar.start).getTime() === d.getTime()
                        const bc = bar ? BAR_CONFIG[bar.type] : null

                        return (
                          <td key={di} className={clsx(
                            'border-r border-surface-border/40 px-0 py-0 relative',
                            isW && 'bg-gray-50/50', isM && 'border-l-2 border-l-gray-200',
                            editing && 'cursor-pointer hover:bg-blue-50/40'
                          )} style={{ width: CW, minWidth: CW, height: RH }}
                            onClick={editing ? (e) => handleCellClick(e, row.id, d) : undefined}
                          >
                            {bar && bc && (
                              <div className="absolute inset-y-1 inset-x-0 rounded-sm flex items-center justify-center" style={{ backgroundColor: bc.color }}>
                                {isBS && bar.label && <span className="text-white text-[7px] font-bold truncate px-0.5 drop-shadow-sm">{bar.label}</span>}
                              </div>
                            )}
                            {di === todayOff && <div className="absolute inset-y-0 left-1/2 w-0.5 bg-red-600 z-20" style={{ transform: 'translateX(-50%)' }} />}
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
        <p className="text-[10px] text-gray-400 mt-2 text-right">빨간 세로선 = 오늘 ({fmt(today)})</p>
      </div>

      {picker && <BarTypePicker x={picker.x} y={picker.y} onSelect={applyBarType} onRemove={removeBar} onClose={() => setPicker(null)} />}
    </>
  )
}
