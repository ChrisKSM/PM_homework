import { useState, useRef, useMemo } from 'react'
import Header from '../components/layout/Header'
import { Download, Pencil, Check, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
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

// ── 바 색상/범례 ─────────────────────────────────────────────────────────────

const BAR_CONFIG: Record<BarType, { color: string; label: string }> = {
  planned:        { color: '#94A3B8', label: '진행 예정' },
  inprogress:     { color: '#FACC15', label: '진행중' },
  event_ng:       { color: '#EF4444', label: 'Event NG' },
  event_ok:       { color: '#22C55E', label: 'Event OK' },
  event_done_est: { color: '#A78BFA', label: 'Event 완료 예상 일정' },
  su_fota:        { color: '#F97316', label: 'SU/FOTA 배포' },
}

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
  { id: 'h7-2', category: '사운드바(Wi-Fi)', model: 'H7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'Q2S', staff: '김로경', testType: '호환성', changes: '', status: '예정', bars: [
    { start: '2026-09-28', end: '2026-10-01', type: 'planned' },
  ]},
  { id: 'h7-3', category: '사운드바(Wi-Fi)', model: 'H7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'Q2S', staff: '김승화', testType: '안정성', changes: '', status: '예정', bars: [
    { start: '2026-10-02', end: '2026-10-05', type: 'planned' },
  ]},
  { id: 'h7-4', category: '사운드바(Wi-Fi)', model: 'H7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'Q2S', staff: '김승화', testType: '시너지', changes: '', status: '예정', bars: [
    { start: '2026-10-06', end: '2026-10-08', type: 'planned' },
  ]},
  { id: 'w7-1', category: '사운드바(Wi-Fi)', model: 'W7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김승화', testType: '일반성능', changes: 'OLED TV 연동', status: '예정', bars: [
    { start: '2026-09-18', end: '2026-09-22', type: 'inprogress' },
    { start: '2026-09-23', end: '2026-09-25', type: 'event_ok', label: 'DEV' },
  ]},
  { id: 'w7-2', category: '사운드바(Wi-Fi)', model: 'W7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김승화', testType: '호환성', changes: '', status: '예정', bars: [
    { start: '2026-09-26', end: '2026-09-30', type: 'planned' },
  ]},
  { id: 'w7-3', category: '사운드바(Wi-Fi)', model: 'W7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김로경', testType: '안정성', changes: '', status: '예정', bars: [
    { start: '2026-10-01', end: '2026-10-03', type: 'planned' },
  ]},
  { id: 'w7-4', category: '사운드바(Wi-Fi)', model: 'W7', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김로경', testType: '시너지', changes: '', status: '예정', bars: [
    { start: '2026-10-04', end: '2026-10-06', type: 'planned' },
  ]},
  { id: 'm7-1', category: '사운드바(Wi-Fi)', model: 'M7/M5', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김로경', testType: '일반성능', changes: 'MCU 개선', status: '예정', bars: [
    { start: '2026-09-29', end: '2026-10-03', type: 'planned' },
    { start: '2026-10-06', end: '2026-10-08', type: 'event_done_est', label: 'MR9' },
  ]},
  { id: 'm7-2', category: '사운드바(Wi-Fi)', model: 'M7/M5', variant: 'MR8/9', manufacturer: 'Symphony', soc: 'MTK532', staff: '김승화', testType: '호환성', changes: '', status: '예정', bars: [
    { start: '2026-10-09', end: '2026-10-12', type: 'planned' },
  ]},
  { id: 's80c-1', category: '사운드바(Wi-Fi)', model: 'S80C', variant: 'GM.B.HW', manufacturer: 'Tonly', soc: 'MLC3763', staff: '김로경', testType: '일반성능', changes: 'Near Source 추가', status: '완료', bars: [
    { start: '2026-09-22', end: '2026-09-26', type: 'event_ok', label: 'FC1' },
    { start: '2026-10-15', end: '2026-10-20', type: 'event_done_est', label: 'FC2' },
  ]},
  { id: 's80c-2', category: '사운드바(Wi-Fi)', model: 'S80C', variant: 'GM.B.HW', manufacturer: 'Tonly', soc: 'MLC3763', staff: '김승화', testType: '호환성', changes: '', status: '완료', bars: [
    { start: '2026-09-27', end: '2026-09-30', type: 'event_ok' },
  ]},
  { id: 'cb-1', category: '사운드드래', model: 'Connect Box', variant: '개발규격', manufacturer: 'Tonly', soc: 'ES8680', staff: '김승화', testType: '일반성능', changes: 'VFD H1, H1N RS', status: '예정', bars: [
    { start: '2026-09-20', end: '2026-09-28', type: 'inprogress' },
    { start: '2026-10-13', end: '2026-10-18', type: 'event_done_est', label: 'FC' },
  ]},
  { id: 'app-1', category: '앱', model: 'LG Soundbar 앱', variant: 'MR8/9', manufacturer: 'LG', soc: 'MTK532', staff: '김로경', testType: '일반성능', changes: 'ThinQ Alexa login', status: '예정', bars: [
    { start: '2026-09-16', end: '2026-09-19', type: 'inprogress' },
    { start: '2026-09-24', end: '2026-09-30', type: 'event_done_est' },
  ]},
  { id: 'mini-1', category: '휴대스피커(BT)', model: 'Mini', variant: 'MR8/9', manufacturer: 'Worik', soc: 'BES2710A', staff: '김승화', testType: '일반성능', changes: 'USB Audio Part', status: '예정', bars: [
    { start: '2026-10-01', end: '2026-10-08', type: 'planned' },
    { start: '2026-10-19', end: '2026-10-22', type: 'su_fota', label: 'SU배포' },
  ]},
  { id: 'xt75-1', category: '휴대스피커(BT)', model: 'XT75', variant: '', manufacturer: '', soc: '', staff: '김로경', testType: '일반성능', changes: 'TV 넘기기 통화', status: '예정', bars: [
    { start: '2026-09-24', end: '2026-10-02', type: 'inprogress' },
    { start: '2026-10-12', end: '2026-10-15', type: 'su_fota', label: 'FOTA' },
  ]},
  { id: 'stg-1', category: '거치스피커(BT)', model: 'STAGE5301', variant: 'MR1/N', manufacturer: 'Tonly', soc: 'MLC3725', staff: '김승화', testType: '일반성능', changes: 'USB Audio Part', status: '검증제외', bars: [
    { start: '2026-09-26', end: '2026-10-03', type: 'planned' },
  ]},
]

// ── 날짜 헬퍼 ────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function formatDate(d: Date): string { return `${d.getMonth() + 1}/${d.getDate()}` }
function daysBetween(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86400000) }
function toDate(s: string): Date { return new Date(s + 'T00:00:00') }

// ── 필터에서 고유값 추출 ─────────────────────────────────────────────────────

function uniqueValues(data: ModelRow[], field: keyof ModelRow): string[] {
  const set = new Set<string>()
  data.forEach(r => { const v = String(r[field] || '').trim(); if (v) set.add(v) })
  return Array.from(set).sort()
}

// ── 엑셀 내보내기 ────────────────────────────────────────────────────────────

function exportToCSV(data: ModelRow[]) {
  const headers = ['카테고리', '모델명', '개발등급', '생산업체', 'SoC', '담당 스텝', '구분', '주요 변경점', 'Status']
  const rows = data.map(r => [r.category, r.model, r.variant, r.manufacturer, r.soc, r.staff, r.testType, r.changes, r.status])
  const BOM = '\uFEFF'
  const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `모델검증현황_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── 필터 드롭다운 ────────────────────────────────────────────────────────────

function FilterDropdown({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'text-[10px] px-1.5 py-1 rounded border bg-white cursor-pointer',
          value ? 'border-lg-red text-lg-red font-bold' : 'border-gray-200 text-gray-500'
        )}
      >
        <option value="">{label} ▾</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ── 범례 ─────────────────────────────────────────────────────────────────────

function BarLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap text-[10px] font-medium">
      {Object.entries(BAR_CONFIG).map(([key, cfg]) => (
        <div key={key} className="flex items-center gap-1">
          <div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: cfg.color }} />
          <span className="text-gray-600">{cfg.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── 페이지 ───────────────────────────────────────────────────────────────────

const TOTAL_DAYS = 42
const COL_W = 28
const ROW_H = 28

export default function ModelSchedulePage() {
  const [data, setData] = useState<ModelRow[]>(INITIAL_DATA)
  const [editing, setEditing] = useState(false)
  const [startDate, setStartDate] = useState(new Date('2026-09-15'))
  const scrollRef = useRef<HTMLDivElement>(null)

  // 필터 상태
  const [fCategory, setFCategory] = useState('')
  const [fModel, setFModel] = useState('')
  const [fManufacturer, setFManufacturer] = useState('')
  const [fStaff, setFStaff] = useState('')
  const [fTestType, setFTestType] = useState('')
  const [fStatus, setFStatus] = useState('')

  const hasFilter = !!(fCategory || fModel || fManufacturer || fStaff || fTestType || fStatus)

  const filteredData = useMemo(() => {
    return data.filter(r =>
      (!fCategory || r.category === fCategory) &&
      (!fModel || r.model === fModel) &&
      (!fManufacturer || r.manufacturer === fManufacturer) &&
      (!fStaff || r.staff === fStaff) &&
      (!fTestType || r.testType === fTestType) &&
      (!fStatus || r.status === fStatus)
    )
  }, [data, fCategory, fModel, fManufacturer, fStaff, fTestType, fStatus])

  const clearFilters = () => { setFCategory(''); setFModel(''); setFManufacturer(''); setFStaff(''); setFTestType(''); setFStatus('') }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dates = useMemo(() => Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(startDate, i)), [startDate])
  const todayOffset = useMemo(() => daysBetween(startDate, today), [startDate, today])
  const shiftDays = (n: number) => setStartDate(prev => addDays(prev, n))

  const handleFieldEdit = (rowId: string, field: keyof ModelRow, value: string) => {
    setData(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r))
  }

  return (
    <>
      <Header title="모델 검증 현황" subtitle="모델별 개발/검증 일정 Gantt — 편집 · 엑셀 출력 · 필터" />

      <div className="pt-16 p-4">
        {/* 툴바 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button onClick={() => shiftDays(-7)} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
            {formatDate(startDate)} ~ {formatDate(addDays(startDate, TOTAL_DAYS - 1))}
          </span>
          <button onClick={() => shiftDays(7)} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page"><ChevronRight size={16} /></button>

          <div className="w-px h-6 bg-gray-200 mx-1" />
          <BarLegend />
          <div className="flex-1" />

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

        {/* 필터 바 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Filter size={14} className="text-gray-400" />
          <FilterDropdown label="카테고리" options={uniqueValues(data, 'category')} value={fCategory} onChange={setFCategory} />
          <FilterDropdown label="모델명" options={uniqueValues(data, 'model')} value={fModel} onChange={setFModel} />
          <FilterDropdown label="생산업체" options={uniqueValues(data, 'manufacturer')} value={fManufacturer} onChange={setFManufacturer} />
          <FilterDropdown label="담당" options={uniqueValues(data, 'staff')} value={fStaff} onChange={setFStaff} />
          <FilterDropdown label="구분" options={uniqueValues(data, 'testType')} value={fTestType} onChange={setFTestType} />
          <FilterDropdown label="Status" options={uniqueValues(data, 'status')} value={fStatus} onChange={setFStatus} />
          {hasFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-red-500 hover:bg-red-50">
              <X size={10} /> 필터 초기화
            </button>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">{filteredData.length} / {data.length}건</span>
        </div>

        {/* 테이블 + Gantt */}
        <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto" ref={scrollRef}>
            <table className="text-xs border-collapse" style={{ minWidth: `${660 + TOTAL_DAYS * COL_W}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b border-surface-border">
                  {[
                    { label: '카테고리', w: 'w-20' },
                    { label: '모델명', w: 'w-18' },
                    { label: '개발등급', w: 'w-14' },
                    { label: '생산업체', w: 'w-14' },
                    { label: 'SoC', w: 'w-14' },
                    { label: '담당', w: 'w-12' },
                    { label: '구분', w: 'w-14' },
                    { label: '주요 변경점', w: 'w-24' },
                    { label: 'Status', w: 'w-14' },
                  ].map((col, ci) => (
                    <th key={ci} className={clsx(
                      'border-r border-surface-border px-1.5 py-2 text-gray-500 font-semibold text-[10px] whitespace-nowrap',
                      ci < 2 && 'sticky z-10 bg-gray-50',
                      ci === 0 && 'left-0',
                      ci === 1 && 'left-20',
                      col.w,
                    )}>{col.label}</th>
                  ))}
                  {dates.map((d, i) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    const isToday = d.getTime() === today.getTime()
                    const isMonday = d.getDay() === 1
                    return (
                      <th key={i} className={clsx(
                        'border-r border-surface-border px-0 py-1 text-center font-medium',
                        isToday ? 'bg-red-100 text-red-700' : isWeekend ? 'bg-gray-100 text-gray-400' : 'text-gray-500',
                        isMonday && 'border-l-2 border-l-gray-300'
                      )} style={{ width: COL_W, minWidth: COL_W }}>
                        <div className="text-[8px] leading-tight">{formatDate(d)}</div>
                        <div className="text-[7px] text-gray-400">{['일','월','화','수','목','금','토'][d.getDay()]}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => (
                  <tr key={row.id} className="border-b border-surface-border/60 hover:bg-gray-50/50" style={{ height: ROW_H }}>
                    <td className="sticky left-0 z-10 bg-white border-r border-surface-border px-1.5 text-gray-600 text-[10px] whitespace-nowrap overflow-hidden">{row.category}</td>
                    <td className="sticky left-20 z-10 bg-white border-r border-surface-border px-1.5 text-gray-900 font-medium text-[10px] whitespace-nowrap">
                      {editing && row.model ? (
                        <input className="w-full px-1 py-0.5 border border-gray-300 rounded text-[10px]" value={row.model}
                          onChange={(e) => handleFieldEdit(row.id, 'model', e.target.value)} />
                      ) : row.model}
                    </td>
                    <td className="border-r border-surface-border px-1.5 text-gray-600 text-[10px] whitespace-nowrap">{row.variant}</td>
                    <td className="border-r border-surface-border px-1.5 text-gray-600 text-[10px] whitespace-nowrap">{row.manufacturer}</td>
                    <td className="border-r border-surface-border px-1.5 text-gray-600 font-mono text-[10px] whitespace-nowrap">{row.soc}</td>
                    <td className="border-r border-surface-border px-1.5 text-gray-600 text-[10px] whitespace-nowrap">{row.staff}</td>
                    <td className="border-r border-surface-border px-1.5 text-[10px] whitespace-nowrap">
                      <span className={clsx('px-1 py-0.5 rounded text-[9px] font-bold', TEST_TYPE_STYLE[row.testType])}>{row.testType}</span>
                    </td>
                    <td className="border-r border-surface-border px-1.5 text-gray-500 text-[9px] whitespace-nowrap overflow-hidden max-w-[96px] truncate">{row.changes}</td>
                    <td className="border-r border-surface-border px-1.5">
                      {(() => { const s = STATUS_STYLE[row.status] || STATUS_STYLE['예정']
                        return <span className={`px-1 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${s.bg} ${s.text}`}>{row.status}</span>
                      })()}
                    </td>

                    {dates.map((d, di) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      const isMonday = d.getDay() === 1
                      const bar = row.bars.find(b => d >= toDate(b.start) && d <= toDate(b.end))
                      const isBarStart = bar && toDate(bar.start).getTime() === d.getTime()
                      const barCfg = bar ? BAR_CONFIG[bar.type] : null

                      return (
                        <td key={di} className={clsx(
                          'border-r border-surface-border/40 px-0 py-0 relative',
                          isWeekend && 'bg-gray-50/50',
                          isMonday && 'border-l-2 border-l-gray-200'
                        )} style={{ width: COL_W, minWidth: COL_W, height: ROW_H }}>
                          {bar && barCfg && (
                            <div className="absolute inset-y-1 inset-x-0 rounded-sm flex items-center justify-center"
                              style={{ backgroundColor: barCfg.color }}>
                              {isBarStart && bar.label && (
                                <span className="text-white text-[7px] font-bold truncate px-0.5 drop-shadow-sm">{bar.label}</span>
                              )}
                            </div>
                          )}
                          {di === todayOffset && (
                            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-red-600 z-20" style={{ transform: 'translateX(-50%)' }} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mt-2 text-right">
          빨간 세로선 = 오늘 ({formatDate(today)})
        </p>
      </div>
    </>
  )
}
