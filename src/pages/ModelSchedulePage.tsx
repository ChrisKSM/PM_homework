import { useState, useRef, useMemo, useCallback } from 'react'
import Header from '../components/layout/Header'
import { Download, Pencil, Check, ChevronLeft, ChevronRight, Filter, X, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'

// ── 타입 ─────────────────────────────────────────────────────────────────────

type BarType = 'planned' | 'inprogress' | 'event_ng' | 'event_ok' | 'event_done_est' | 'su_fota'

interface ScheduleBar {
  start: string
  end: string
  type: BarType
  label?: string
}

type TestCategory = '일반성능' | '호환성' | '안정성' | '시너지'
type StatusType = '완료' | '검증제외' | '예정'

interface ModelRow {
  id: string
  category: string
  model: string
  variant: string
  manufacturer: string
  soc: string
  staff: string
  testType: TestCategory
  changes: string
  status: StatusType
  bars: ScheduleBar[]
}

// ── 상수 ─────────────────────────────────────────────────────────────────────

const BAR_CONFIG: Record<BarType, { color: string; label: string }> = {
  planned:        { color: '#94A3B8', label: '진행 예정' },
  inprogress:     { color: '#FACC15', label: '진행중' },
  event_ng:       { color: '#EF4444', label: 'Event NG' },
  event_ok:       { color: '#22C55E', label: 'Event OK' },
  event_done_est: { color: '#A78BFA', label: 'Event 완료 예상 일정' },
  su_fota:        { color: '#F97316', label: 'SU/FOTA 배포' },
}

const BAR_TYPES: BarType[] = ['planned', 'inprogress', 'event_ng', 'event_ok', 'event_done_est', 'su_fota']
const TEST_TYPES: TestCategory[] = ['일반성능', '호환성', '안정성', '시너지']
const STATUS_LIST: StatusType[] = ['예정', '완료', '검증제외']

const STATUS_STYLE: Record<StatusType, { bg: string; text: string }> = {
  '완료':     { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  '예정':     { bg: 'bg-gray-100', text: 'text-gray-500' },
  '검증제외': { bg: 'bg-amber-50', text: 'text-amber-600' },
}

const TEST_TYPE_STYLE: Record<TestCategory, string> = {
  '일반성능': 'bg-blue-50 text-blue-600',
  '호환성':   'bg-purple-50 text-purple-600',
  '안정성':   'bg-amber-50 text-amber-600',
  '시너지':   'bg-emerald-50 text-emerald-600',
}

// ── Mock 데이터 ──────────────────────────────────────────────────────────────

const INITIAL_DATA: ModelRow[] = [
  { id: 'h7-1', category: '사운드바(Wi-Fi)', model: 'H7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'Q2S', staff: '김로경', testType: '일반성능', changes: 'SoC LPE 적용', status: '예정', bars: [
    { start: '2026-09-17', end: '2026-09-19', type: 'inprogress' },
    { start: '2026-09-22', end: '2026-09-24', type: 'event_ng' },
    { start: '2026-09-25', end: '2026-09-26', type: 'event_ok', label: 'MR8' },
  ]},
  { id: 'h7-2', category: '사운드바(Wi-Fi)', model: 'H7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'Q2S', staff: '김로경', testType: '호환성', changes: '', status: '예정', bars: [{ start: '2026-09-28', end: '2026-10-01', type: 'planned' }]},
  { id: 'h7-3', category: '사운드바(Wi-Fi)', model: 'H7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'Q2S', staff: '김승화', testType: '안정성', changes: '', status: '예정', bars: [{ start: '2026-10-02', end: '2026-10-05', type: 'planned' }]},
  { id: 'h7-4', category: '사운드바(Wi-Fi)', model: 'H7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'Q2S', staff: '김승화', testType: '시너지', changes: '', status: '예정', bars: [{ start: '2026-10-06', end: '2026-10-08', type: 'planned' }]},

  { id: 'w7-1', category: '사운드바(Wi-Fi)', model: 'W7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김승화', testType: '일반성능', changes: 'OLED TV 연동', status: '예정', bars: [
    { start: '2026-09-18', end: '2026-09-22', type: 'inprogress' },
    { start: '2026-09-23', end: '2026-09-25', type: 'event_ok', label: 'DEV' },
  ]},
  { id: 'w7-2', category: '사운드바(Wi-Fi)', model: 'W7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김승화', testType: '호환성', changes: '', status: '예정', bars: [{ start: '2026-09-26', end: '2026-09-30', type: 'planned' }]},
  { id: 'w7-3', category: '사운드바(Wi-Fi)', model: 'W7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김로경', testType: '안정성', changes: '', status: '예정', bars: [{ start: '2026-10-01', end: '2026-10-03', type: 'planned' }]},
  { id: 'w7-4', category: '사운드바(Wi-Fi)', model: 'W7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김로경', testType: '시너지', changes: '', status: '예정', bars: [{ start: '2026-10-04', end: '2026-10-06', type: 'planned' }]},

  { id: 'm7-1', category: '사운드바(Wi-Fi)', model: 'M7/M5', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김로경', testType: '일반성능', changes: 'MCU 개선', status: '예정', bars: [
    { start: '2026-09-29', end: '2026-10-03', type: 'planned' },
    { start: '2026-10-06', end: '2026-10-08', type: 'event_done_est', label: 'MR9' },
  ]},
  { id: 'm7-2', category: '사운드바(Wi-Fi)', model: 'M7/M5', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김승화', testType: '호환성', changes: '', status: '예정', bars: [{ start: '2026-10-09', end: '2026-10-12', type: 'planned' }]},
  { id: 'm7-3', category: '사운드바(Wi-Fi)', model: 'M7/M5', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김로경', testType: '안정성', changes: '', status: '예정', bars: []},
  { id: 'm7-4', category: '사운드바(Wi-Fi)', model: 'M7/M5', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김승화', testType: '시너지', changes: '', status: '예정', bars: []},

  { id: 's80c-1', category: '사운드바(Wi-Fi)', model: 'S80C', variant: 'GM.B.HW', manufacturer: 'Tonly', soc: 'MLC3763', staff: '김로경', testType: '일반성능', changes: 'Near Source 추가', status: '완료', bars: [
    { start: '2026-09-22', end: '2026-09-26', type: 'event_ok', label: 'FC1' },
    { start: '2026-10-15', end: '2026-10-20', type: 'event_done_est', label: 'FC2' },
  ]},
  { id: 's80c-2', category: '사운드바(Wi-Fi)', model: 'S80C', variant: 'GM.B.HW', manufacturer: 'Tonly', soc: 'MLC3763', staff: '김승화', testType: '호환성', changes: '', status: '완료', bars: [{ start: '2026-09-27', end: '2026-09-30', type: 'event_ok' }]},
  { id: 's80c-3', category: '사운드바(Wi-Fi)', model: 'S80C', variant: 'GM.B.HW', manufacturer: 'Tonly', soc: 'MLC3763', staff: '김로경', testType: '안정성', changes: '', status: '완료', bars: []},
  { id: 's80c-4', category: '사운드바(Wi-Fi)', model: 'S80C', variant: 'GM.B.HW', manufacturer: 'Tonly', soc: 'MLC3763', staff: '김승화', testType: '시너지', changes: '', status: '완료', bars: []},

  { id: 'mini-1', category: '휴대스피커(BT)', model: 'Mini', variant: 'MR8/9', manufacturer: 'Worik', soc: 'BES2710A', staff: '김승화', testType: '일반성능', changes: 'USB Audio Part', status: '예정', bars: [
    { start: '2026-10-01', end: '2026-10-08', type: 'planned' },
    { start: '2026-10-19', end: '2026-10-22', type: 'su_fota', label: 'SU배포' },
  ]},
  { id: 'mini-2', category: '휴대스피커(BT)', model: 'Mini', variant: 'MR8/9', manufacturer: 'Worik', soc: 'BES2710A', staff: '김로경', testType: '호환성', changes: '', status: '예정', bars: []},
  { id: 'mini-3', category: '휴대스피커(BT)', model: 'Mini', variant: 'MR8/9', manufacturer: 'Worik', soc: 'BES2710A', staff: '김승화', testType: '안정성', changes: '', status: '예정', bars: []},
  { id: 'mini-4', category: '휴대스피커(BT)', model: 'Mini', variant: 'MR8/9', manufacturer: 'Worik', soc: 'BES2710A', staff: '김로경', testType: '시너지', changes: '', status: '예정', bars: []},

  { id: 'stg-1', category: '거치스피커(BT)', model: 'STAGE5301', variant: 'MR1/N', manufacturer: 'Tonly', soc: 'MLC3725', staff: '김승화', testType: '일반성능', changes: 'USB Audio Part', status: '검증제외', bars: [{ start: '2026-09-26', end: '2026-10-03', type: 'planned' }]},
  { id: 'stg-2', category: '거치스피커(BT)', model: 'STAGE5301', variant: 'MR1/N', manufacturer: 'Tonly', soc: 'MLC3725', staff: '김로경', testType: '호환성', changes: '', status: '검증제외', bars: []},
  { id: 'stg-3', category: '거치스피커(BT)', model: 'STAGE5301', variant: 'MR1/N', manufacturer: 'Tonly', soc: 'MLC3725', staff: '김승화', testType: '안정성', changes: '', status: '검증제외', bars: []},
  { id: 'stg-4', category: '거치스피커(BT)', model: 'STAGE5301', variant: 'MR1/N', manufacturer: 'Tonly', soc: 'MLC3725', staff: '김로경', testType: '시너지', changes: '', status: '검증제외', bars: []},
]

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function formatDate(d: Date): string { return `${d.getMonth() + 1}/${d.getDate()}` }
function daysBetween(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86400000) }
function toDate(s: string): Date { return new Date(s + 'T00:00:00') }
function toISO(d: Date): string { return d.toISOString().slice(0, 10) }

function uniqueValues(data: ModelRow[], field: keyof ModelRow): string[] {
  const set = new Set<string>(); data.forEach(r => { const v = String(r[field] || '').trim(); if (v) set.add(v) }); return Array.from(set).sort()
}

function exportToCSV(data: ModelRow[]) {
  const headers = ['카테고리', '모델명', '개발등급', '생산업체', 'SoC', '담당', '구분', '주요 변경점', 'Status']
  const rows = data.map(r => [r.category, r.model, r.variant, r.manufacturer, r.soc, r.staff, r.testType, r.changes, r.status])
  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `모델검증현황_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
}

// ── 병합 계산 ────────────────────────────────────────────────────────────────

interface MergeInfo { rowSpan: number; hidden: boolean }

function computeMerge(rows: ModelRow[], field: 'category' | 'model'): MergeInfo[] {
  const result: MergeInfo[] = rows.map(() => ({ rowSpan: 1, hidden: false }))
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    const key = field === 'category' ? rows[i].category : `${rows[i].category}|${rows[i].model}`
    while (j < rows.length) {
      const nextKey = field === 'category' ? rows[j].category : `${rows[j].category}|${rows[j].model}`
      if (nextKey === key && rows[i][field]) { j++ } else { break }
    }
    result[i].rowSpan = j - i
    for (let k = i + 1; k < j; k++) result[k].hidden = true
    i = j
  }
  return result
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

const TOTAL_DAYS = 42
const COL_W = 28
const ROW_H = 28

export default function ModelSchedulePage() {
  const [data, setData] = useState<ModelRow[]>(INITIAL_DATA)
  const [editing, setEditing] = useState(false)
  const [startDate, setStartDate] = useState(new Date('2026-09-15'))
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fCategory, setFCategory] = useState('')
  const [fModel, setFModel] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [editingBar, setEditingBar] = useState<{ rowId: string; dayIdx: number } | null>(null)

  const hasFilter = !!(fCategory || fModel || fStatus)
  const clearFilters = () => { setFCategory(''); setFModel(''); setFStatus('') }

  const filteredData = useMemo(() => data.filter(r =>
    (!fCategory || r.category === fCategory) && (!fModel || r.model === fModel) && (!fStatus || r.status === fStatus)
  ), [data, fCategory, fModel, fStatus])

  const catMerge = useMemo(() => computeMerge(filteredData, 'category'), [filteredData])
  const modelMerge = useMemo(() => computeMerge(filteredData, 'model'), [filteredData])

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dates = useMemo(() => Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(startDate, i)), [startDate])
  const todayOffset = useMemo(() => daysBetween(startDate, today), [startDate, today])

  const updateField = useCallback((rowId: string, field: keyof ModelRow, value: string) => {
    setData(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r))
  }, [])

  const addModel = useCallback(() => {
    const ts = Date.now()
    const newRows: ModelRow[] = TEST_TYPES.map((tt, i) => ({
      id: `new-${ts}-${i}`, category: '', model: '새 모델', variant: '', manufacturer: '', soc: '', staff: '',
      testType: tt, changes: '', status: '예정' as StatusType, bars: [],
    }))
    setData(prev => [...prev, ...newRows])
  }, [])

  const deleteModel = useCallback((model: string, category: string) => {
    setData(prev => prev.filter(r => !(r.model === model && r.category === category)))
  }, [])

  const toggleBar = useCallback((rowId: string, date: Date) => {
    const dateStr = toISO(date)
    setData(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const existing = r.bars.findIndex(b => dateStr >= b.start && dateStr <= b.end)
      if (existing >= 0) {
        const bars = [...r.bars]; bars.splice(existing, 1); return { ...r, bars }
      }
      return { ...r, bars: [...r.bars, { start: dateStr, end: dateStr, type: 'planned' as BarType }] }
    }))
  }, [])

  const cycleBarType = useCallback((rowId: string, date: Date) => {
    const dateStr = toISO(date)
    setData(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const bars = r.bars.map(b => {
        if (dateStr >= b.start && dateStr <= b.end) {
          const idx = BAR_TYPES.indexOf(b.type)
          return { ...b, type: BAR_TYPES[(idx + 1) % BAR_TYPES.length] }
        }
        return b
      })
      return { ...r, bars }
    }))
  }, [])

  const extendBar = useCallback((rowId: string, date: Date) => {
    const dateStr = toISO(date)
    const prevStr = toISO(addDays(date, -1))
    setData(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const bar = r.bars.find(b => prevStr >= b.start && prevStr <= b.end)
      if (bar && !r.bars.some(b => dateStr >= b.start && dateStr <= b.end)) {
        return { ...r, bars: r.bars.map(b => b === bar ? { ...b, end: dateStr } : b) }
      }
      return r
    }))
  }, [])

  const EditInput = ({ value, onChange, w = 'w-full' }: { value: string; onChange: (v: string) => void; w?: string }) => (
    <input className={`${w} px-1 py-0.5 border border-gray-300 rounded text-[10px] bg-white`} value={value} onChange={(e) => onChange(e.target.value)} />
  )

  return (
    <>
      <Header title="모델 검증 현황" subtitle="모델별 개발/검증 일정 Gantt — 편집 · 엑셀 출력 · 필터" />
      <div className="pt-16 p-4">
        {/* 툴바 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button onClick={() => setStartDate(prev => addDays(prev, -7))} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">{formatDate(startDate)} ~ {formatDate(addDays(startDate, TOTAL_DAYS - 1))}</span>
          <button onClick={() => setStartDate(prev => addDays(prev, 7))} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"><ChevronRight size={16} /></button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <div className="flex items-center gap-3 flex-wrap text-[10px] font-medium">
            {Object.entries(BAR_CONFIG).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1"><div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} /><span className="text-gray-600">{c.label}</span></div>
            ))}
          </div>
          <div className="flex-1" />
          {editing && (
            <button onClick={addModel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100">
              <Plus size={14} /> 모델 추가
            </button>
          )}
          <button onClick={() => setEditing(!editing)} className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
            editing ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-gray-600 border-surface-border hover:bg-surface-page'
          )}>
            {editing ? <Check size={14} /> : <Pencil size={14} />}
            {editing ? '편집 완료' : 'Edit'}
          </button>
          <button onClick={() => exportToCSV(filteredData)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page">
            <Download size={14} /> 엑셀
          </button>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          {([['카테고리', fCategory, setFCategory, 'category'], ['모델명', fModel, setFModel, 'model'], ['Status', fStatus, setFStatus, 'status']] as const).map(([label, val, setter, field]) => (
            <select key={field} value={val} onChange={(e) => setter(e.target.value)}
              className={clsx('text-[10px] px-1.5 py-1 rounded border bg-white cursor-pointer', val ? 'border-lg-red text-lg-red font-bold' : 'border-gray-200 text-gray-500')}>
              <option value="">{label} ▾</option>
              {uniqueValues(data, field).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {hasFilter && <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-red-500 hover:bg-red-50"><X size={10} /> 초기화</button>}
          <span className="text-[10px] text-gray-400 ml-auto">{filteredData.length} / {data.length}건</span>
        </div>

        {editing && (
          <div className="text-[10px] text-gray-500 mb-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            💡 일정 셀 <b>클릭</b> = 바 추가/삭제 · <b>더블클릭</b> = 바 타입 변경 · <b>Shift+클릭</b> = 이전 셀에서 연장
          </div>
        )}

        {/* 테이블 */}
        <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto" ref={scrollRef}>
            <table className="text-xs border-collapse" style={{ minWidth: `${620 + TOTAL_DAYS * COL_W}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b border-surface-border">
                  {['카테고리','모델명','개발등급','생산업체','SoC','담당','구분','주요 변경점','Status'].map((h, i) => (
                    <th key={i} className={clsx('border-r border-surface-border px-1.5 py-2 text-gray-500 font-semibold text-[10px] whitespace-nowrap',
                      i === 0 && 'sticky left-0 z-10 bg-gray-50 w-20', i === 1 && 'sticky left-20 z-10 bg-gray-50 w-16',
                      editing && i === 9 && 'w-8'
                    )}>{h}</th>
                  ))}
                  {editing && <th className="border-r border-surface-border px-1 py-2 text-gray-400 text-[9px] w-8">삭제</th>}
                  {dates.map((d, i) => {
                    const isW = d.getDay() === 0 || d.getDay() === 6
                    const isT = d.getTime() === today.getTime()
                    const isM = d.getDay() === 1
                    return (
                      <th key={i} className={clsx('border-r border-surface-border px-0 py-1 text-center font-medium',
                        isT ? 'bg-red-100 text-red-700' : isW ? 'bg-gray-100 text-gray-400' : 'text-gray-500',
                        isM && 'border-l-2 border-l-gray-300'
                      )} style={{ width: COL_W, minWidth: COL_W }}>
                        <div className="text-[8px] leading-tight">{formatDate(d)}</div>
                        <div className="text-[7px] text-gray-400">{['일','월','화','수','목','금','토'][d.getDay()]}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, ri) => {
                  const cm = catMerge[ri]
                  const mm = modelMerge[ri]
                  return (
                    <tr key={row.id} className="border-b border-surface-border/60 hover:bg-gray-50/30" style={{ height: ROW_H }}>
                      {!cm.hidden && (
                        <td rowSpan={cm.rowSpan} className="sticky left-0 z-10 bg-white border-r border-surface-border px-1.5 text-gray-600 text-[10px] whitespace-nowrap align-middle">
                          {editing ? <EditInput value={row.category} onChange={(v) => {
                            setData(prev => prev.map(r => r.category === row.category && r.model === row.model ? { ...r, category: v } : r))
                          }} /> : row.category}
                        </td>
                      )}
                      {!mm.hidden && (
                        <td rowSpan={mm.rowSpan} className="sticky left-20 z-10 bg-white border-r border-surface-border px-1.5 text-gray-900 font-medium text-[10px] whitespace-nowrap align-middle">
                          {editing ? <EditInput value={row.model} onChange={(v) => {
                            const oldModel = row.model; const oldCat = row.category
                            setData(prev => prev.map(r => r.model === oldModel && r.category === oldCat ? { ...r, model: v } : r))
                          }} /> : row.model}
                        </td>
                      )}
                      <td className="border-r border-surface-border px-1.5 text-gray-600 text-[10px] whitespace-nowrap">{row.variant}</td>
                      <td className="border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap">
                        {editing ? <EditInput value={row.manufacturer} onChange={(v) => updateField(row.id, 'manufacturer', v)} /> : <span className="text-gray-600">{row.manufacturer}</span>}
                      </td>
                      <td className="border-r border-surface-border px-1.5 text-gray-600 font-mono text-[10px] whitespace-nowrap">{row.soc}</td>
                      <td className="border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap">
                        {editing ? <EditInput value={row.staff} onChange={(v) => updateField(row.id, 'staff', v)} /> : <span className="text-gray-600">{row.staff}</span>}
                      </td>
                      <td className="border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap">
                        <span className={clsx('px-1 py-0.5 rounded text-[9px] font-bold', TEST_TYPE_STYLE[row.testType])}>{row.testType}</span>
                      </td>
                      <td className="border-r border-surface-border px-1.5 text-gray-500 text-[9px] whitespace-nowrap truncate max-w-[96px]">{row.changes}</td>
                      <td className="border-r border-surface-border px-1.5">
                        {editing ? (
                          <select value={row.status} onChange={(e) => updateField(row.id, 'status', e.target.value)}
                            className="text-[9px] px-1 py-0.5 border border-gray-300 rounded bg-white">
                            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (() => { const s = STATUS_STYLE[row.status] || STATUS_STYLE['예정']
                          return <span className={`px-1 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>{row.status}</span>
                        })()}
                      </td>
                      {editing && (
                        <td className="border-r border-surface-border px-1 text-center">
                          {row.testType === '일반성능' && (
                            <button onClick={() => deleteModel(row.model, row.category)} className="text-red-400 hover:text-red-600" title="모델 삭제">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      )}

                      {dates.map((d, di) => {
                        const isW = d.getDay() === 0 || d.getDay() === 6
                        const isM = d.getDay() === 1
                        const bar = row.bars.find(b => d >= toDate(b.start) && d <= toDate(b.end))
                        const isBarStart = bar && toDate(bar.start).getTime() === d.getTime()
                        const barCfg = bar ? BAR_CONFIG[bar.type] : null

                        return (
                          <td key={di} className={clsx(
                            'border-r border-surface-border/40 px-0 py-0 relative',
                            isW && 'bg-gray-50/50', isM && 'border-l-2 border-l-gray-200',
                            editing && 'cursor-pointer hover:bg-blue-50/50'
                          )} style={{ width: COL_W, minWidth: COL_W, height: ROW_H }}
                            onClick={editing ? (e) => { e.shiftKey ? extendBar(row.id, d) : toggleBar(row.id, d) } : undefined}
                            onDoubleClick={editing ? () => cycleBarType(row.id, d) : undefined}
                          >
                            {bar && barCfg && (
                              <div className="absolute inset-y-1 inset-x-0 rounded-sm flex items-center justify-center" style={{ backgroundColor: barCfg.color }}>
                                {isBarStart && bar.label && <span className="text-white text-[7px] font-bold truncate px-0.5 drop-shadow-sm">{bar.label}</span>}
                              </div>
                            )}
                            {di === todayOffset && <div className="absolute inset-y-0 left-1/2 w-0.5 bg-red-600 z-20" style={{ transform: 'translateX(-50%)' }} />}
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
        <p className="text-[10px] text-gray-400 mt-2 text-right">빨간 세로선 = 오늘 ({formatDate(today)})</p>
      </div>
    </>
  )
}
