import { useState, useRef, useMemo } from 'react'
import Header from '../components/layout/Header'
import { Download, Pencil, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface ScheduleBar {
  start: string   // YYYY-MM-DD
  end: string
  color: string
  label?: string
}

interface ModelRow {
  id: string
  category: string
  model: string
  variant: string
  devStage: string
  chipset: string
  soc: string
  buildTarget: string
  phase: string
  status: string
  remark: string
  bars: ScheduleBar[]
}

// ── Mock 데이터 ──────────────────────────────────────────────────────────────

const INITIAL_DATA: ModelRow[] = [
  {
    id: '1', category: '사운드바\n(Wi-Fi)', model: 'H7', variant: 'MR8/9', devStage: 'MR Minor',
    chipset: 'Symphony', soc: 'Q2S', buildTarget: '금우향',
    status: 'In Progress', phase: 'DEV', remark: '1. SoC LPE 적용 사항\n2. Q2S 연동 적용',
    bars: [
      { start: '2026-09-17', end: '2026-09-23', color: '#EF4444', label: 'MR8 검증' },
      { start: '2026-09-28', end: '2026-10-05', color: '#8B5CF6', label: 'MR9' },
    ],
  },
  {
    id: '2', category: '사운드바\n(Wi-Fi)', model: 'W7', variant: 'MR8/9', devStage: 'MR Minor',
    chipset: 'Symphony', soc: 'MTK532', buildTarget: '금우향',
    status: 'In Progress', phase: 'DEV', remark: '1. OLED TV 모델 연동 플로우',
    bars: [
      { start: '2026-09-18', end: '2026-09-24', color: '#3B82F6', label: 'DEV' },
      { start: '2026-09-25', end: '2026-09-30', color: '#EF4444', label: 'FC' },
    ],
  },
  {
    id: '3', category: '사운드바\n(Wi-Fi)', model: 'M7/M5', variant: 'MR8/9', devStage: 'MR Minor',
    chipset: 'Symphony', soc: 'MTK532', buildTarget: '금우향',
    status: 'Planned', phase: 'DEV', remark: '1. MCU 개선 2. SoM 사항\n2. 4CH TV 탑재',
    bars: [
      { start: '2026-09-29', end: '2026-10-08', color: '#F59E0B', label: 'MR9' },
    ],
  },
  {
    id: '4', category: '사운드바\n(Wi-Fi)', model: 'H7', variant: 'MR8/H', devStage: 'MR Minor',
    chipset: 'Symphony', soc: 'Q2S', buildTarget: '금우향',
    status: 'Planned', phase: '', remark: '1. G75 X 적용',
    bars: [
      { start: '2026-10-06', end: '2026-10-12', color: '#10B981' },
    ],
  },
  {
    id: '5', category: '사운드바\n(Wi-Fi)', model: 'S80C', variant: 'GM.B.HW', devStage: 'Tonly',
    chipset: '', soc: 'MLC3763', buildTarget: '',
    status: 'Done', phase: 'FC', remark: '1. Near Source 기능 추가\n2. F1M My BR 지원',
    bars: [
      { start: '2026-09-22', end: '2026-09-26', color: '#10B981', label: 'FC1' },
      { start: '2026-10-15', end: '2026-10-22', color: '#F59E0B', label: 'FC2' },
    ],
  },
  {
    id: '6', category: '사운드드래', model: 'Connect Box', variant: '개발규격', devStage: 'JBM CL ACC',
    chipset: 'Tonly', soc: 'ES8680', buildTarget: '금우향',
    status: 'In Progress', phase: 'DEV', remark: '2개벌(VFD) H1, H1N RS, S30C, S80C',
    bars: [
      { start: '2026-09-20', end: '2026-09-28', color: '#3B82F6' },
      { start: '2026-10-13', end: '2026-10-20', color: '#8B5CF6', label: 'FC_' },
    ],
  },
  {
    id: '7', category: '', model: 'LG Soundbar 앱\nSDS부', variant: 'MR8/9', devStage: 'MR Minor',
    chipset: 'LG', soc: 'MTK532', buildTarget: '',
    status: 'In Progress', phase: '', remark: '1) S2T/G LG Soundbar 앱 적용\n2) SDS/LG ThinQ By Alexa login manager',
    bars: [
      { start: '2026-09-16', end: '2026-09-19', color: '#6366F1' },
      { start: '2026-09-24', end: '2026-09-30', color: '#3B82F6' },
    ],
  },
  {
    id: '8', category: '', model: 'Mini', variant: 'MR8/9', devStage: 'MR Minor',
    chipset: 'Worik', soc: 'BES2710A', buildTarget: '금우향',
    status: 'Planned', phase: '', remark: '1. USB Audio Part Link 적용(사식/간이벨리)\n2. 3. BT5.4 → B/6 적용',
    bars: [
      { start: '2026-10-01', end: '2026-10-08', color: '#F59E0B' },
    ],
  },
  {
    id: '9', category: '', model: 'Rock', variant: 'MR8/9', devStage: 'MR Minor',
    chipset: 'Worik', soc: 'BES2710A', buildTarget: '금우향',
    status: 'Planned', phase: '', remark: '',
    bars: [],
  },
  {
    id: '10', category: '휴대스피커\n(Bluetooth)', model: 'xboom ThinQ 앱\n(연동 - Source)', variant: 'MR/N',
    devStage: 'MR Minor', chipset: 'Cowetic', soc: 'BES2710A', buildTarget: '',
    status: 'In Progress', phase: '', remark: '1. LG RealBor HW5.5 연결기능 개발\n2. My Button 사용성 개선',
    bars: [
      { start: '2026-09-22', end: '2026-09-30', color: '#EC4899' },
    ],
  },
  {
    id: '11', category: '', model: 'XT75', variant: '', devStage: '',
    chipset: '', soc: '', buildTarget: '',
    status: 'In Progress', phase: '', remark: '1. TV / XT75 넘기기 통화 100건/재 적용',
    bars: [
      { start: '2026-09-24', end: '2026-10-02', color: '#F97316' },
    ],
  },
  {
    id: '12', category: '', model: 'xboom ThinQ 앱\n(신통 / 재할)', variant: '방금 중', devStage: '',
    chipset: '', soc: '', buildTarget: '',
    status: 'Planned', phase: '', remark: '',
    bars: [
      { start: '2026-10-08', end: '2026-10-15', color: '#A855F7' },
    ],
  },
  {
    id: '13', category: '', model: 'STAGE5301', variant: 'MR1/N', devStage: 'MR Minor',
    chipset: 'Tonly', soc: 'MLC3725', buildTarget: '금우향',
    status: 'Planned', phase: '', remark: '1. USB Audio Part Link 적용(사식/간이벨리)',
    bars: [
      { start: '2026-09-26', end: '2026-10-03', color: '#64748B' },
    ],
  },
  {
    id: '14', category: '거치스피커\n(Bluetooth)', model: 'xboom ThinQ 앱\n(신통 / 재할)', variant: '방금 중',
    devStage: '', chipset: '', soc: '', buildTarget: '',
    status: 'Planned', phase: '', remark: '',
    bars: [
      { start: '2026-10-03', end: '2026-10-10', color: '#A855F7' },
    ],
  },
  {
    id: '15', category: '자이보드\n(Bluetooth)', model: 'True Free 앱\n(신통 / 재할)', variant: '방금 중',
    devStage: '', chipset: '', soc: '', buildTarget: '',
    status: 'Planned', phase: '', remark: '1. 앱 FOTA 반영\n2. 지연 반영 우선 계획',
    bars: [
      { start: '2026-10-05', end: '2026-10-12', color: '#06B6D4' },
    ],
  },
]

// ── 날짜 헬퍼 ────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function toDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

// ── 상태 뱃지 ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  'Done': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'In Progress': { bg: 'bg-blue-50', text: 'text-blue-600' },
  'Planned': { bg: 'bg-gray-100', text: 'text-gray-500' },
  'Blocked': { bg: 'bg-red-50', text: 'text-red-600' },
}

// ── 엑셀 내보내기 ────────────────────────────────────────────────────────────

function exportToCSV(data: ModelRow[]) {
  const headers = ['카테고리', '모델명', '개발등급', '칩셋', 'SoC', '빌드수량', '구분', 'Status', '비고']
  const rows = data.map(r => [
    r.category.replace(/\n/g, ' '), r.model.replace(/\n/g, ' '), r.devStage,
    r.chipset, r.soc, r.buildTarget, r.phase, r.status, r.remark.replace(/\n/g, ' '),
  ])

  const BOM = '\uFEFF'
  const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `모델일정현황_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── 페이지 ───────────────────────────────────────────────────────────────────

const TOTAL_DAYS = 42
const COL_W = 32

export default function ModelSchedulePage() {
  const [data, setData] = useState<ModelRow[]>(INITIAL_DATA)
  const [editing, setEditing] = useState(false)
  const [startDate, setStartDate] = useState(new Date('2026-09-15'))
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dates = useMemo(() => {
    return Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(startDate, i))
  }, [startDate])

  const todayOffset = useMemo(() => {
    return daysBetween(startDate, today)
  }, [startDate, today])

  const shiftDays = (n: number) => setStartDate(prev => addDays(prev, n))

  const handleBarEdit = (rowId: string, barIdx: number, field: 'start' | 'end', value: string) => {
    setData(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const bars = [...r.bars]
      bars[barIdx] = { ...bars[barIdx], [field]: value }
      return { ...r, bars }
    }))
  }

  const handleFieldEdit = (rowId: string, field: keyof ModelRow, value: string) => {
    setData(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r))
  }

  return (
    <>
      <Header title="모델 일정 현황" subtitle="모델별 개발/검증 일정 Gantt — 편집 · 엑셀 출력" />

      <div className="pt-16 p-4">
        {/* 툴바 */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => shiftDays(-7)} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page" title="1주 이전">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
            {formatDate(startDate)} ~ {formatDate(addDays(startDate, TOTAL_DAYS - 1))}
          </span>
          <button onClick={() => shiftDays(7)} className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-page" title="1주 이후">
            <ChevronRight size={16} />
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setEditing(!editing)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              editing
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-gray-600 border-surface-border hover:bg-surface-page'
            )}
          >
            {editing ? <Check size={14} /> : <Pencil size={14} />}
            {editing ? '편집 완료' : 'Edit'}
          </button>

          <button
            onClick={() => exportToCSV(data)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-600 border border-surface-border hover:bg-surface-page transition-colors"
          >
            <Download size={14} />
            엑셀
          </button>
        </div>

        {/* 테이블 + Gantt */}
        <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto" ref={scrollRef}>
            <table className="text-xs border-collapse" style={{ minWidth: `${700 + TOTAL_DAYS * COL_W}px` }}>
              <thead>
                <tr className="bg-gray-50 border-b border-surface-border">
                  <th className="sticky left-0 z-10 bg-gray-50 border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-16">카테고리</th>
                  <th className="sticky left-16 z-10 bg-gray-50 border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-20">모델명</th>
                  <th className="border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-16">개발등급</th>
                  <th className="border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-14">칩셋</th>
                  <th className="border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-16">SoC</th>
                  <th className="border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-14">빌드수량</th>
                  <th className="border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-12">구분</th>
                  <th className="border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-16">Status</th>
                  <th className="border-r border-surface-border px-2 py-2 text-gray-500 font-semibold w-32">비고</th>
                  {dates.map((d, i) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    const isToday = d.getTime() === today.getTime()
                    const isMonday = d.getDay() === 1
                    return (
                      <th
                        key={i}
                        className={clsx(
                          'border-r border-surface-border px-0 py-1 text-center font-medium',
                          isToday ? 'bg-red-100 text-red-700' : isWeekend ? 'bg-gray-100 text-gray-400' : 'text-gray-500',
                          isMonday && 'border-l-2 border-l-gray-300'
                        )}
                        style={{ width: COL_W, minWidth: COL_W }}
                      >
                        <div className="text-[9px] leading-tight">{formatDate(d)}</div>
                        <div className="text-[8px] text-gray-400">{['일','월','화','수','목','금','토'][d.getDay()]}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-surface-border/60 hover:bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-white border-r border-surface-border px-2 py-1.5 text-gray-600 whitespace-pre-line align-top text-[10px]">{row.category}</td>
                    <td className="sticky left-16 z-10 bg-white border-r border-surface-border px-2 py-1.5 text-gray-900 font-medium whitespace-pre-line align-top text-[10px]">
                      {editing ? (
                        <input
                          className="w-full px-1 py-0.5 border border-gray-300 rounded text-[10px]"
                          value={row.model}
                          onChange={(e) => handleFieldEdit(row.id, 'model', e.target.value)}
                        />
                      ) : row.model}
                    </td>
                    <td className="border-r border-surface-border px-2 py-1.5 text-gray-600 text-[10px]">{row.devStage}</td>
                    <td className="border-r border-surface-border px-2 py-1.5 text-gray-600 text-[10px]">{row.chipset}</td>
                    <td className="border-r border-surface-border px-2 py-1.5 text-gray-600 font-mono text-[10px]">{row.soc}</td>
                    <td className="border-r border-surface-border px-2 py-1.5 text-gray-600 text-[10px]">{row.buildTarget}</td>
                    <td className="border-r border-surface-border px-2 py-1.5 text-gray-600 text-[10px]">{row.phase}</td>
                    <td className="border-r border-surface-border px-2 py-1.5">
                      {row.status && (() => {
                        const s = STATUS_STYLE[row.status] || STATUS_STYLE.Planned
                        return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${s.bg} ${s.text}`}>{row.status}</span>
                      })()}
                    </td>
                    <td className="border-r border-surface-border px-2 py-1.5 text-gray-500 whitespace-pre-line text-[9px] max-w-[120px]">{row.remark}</td>

                    {/* Gantt 셀 */}
                    {dates.map((d, di) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      const isMonday = d.getDay() === 1

                      const bar = row.bars.find(b => {
                        const bs = toDate(b.start)
                        const be = toDate(b.end)
                        return d >= bs && d <= be
                      })

                      const isBarStart = bar && toDate(bar.start).getTime() === d.getTime()

                      return (
                        <td
                          key={di}
                          className={clsx(
                            'border-r border-surface-border/40 px-0 py-0 relative',
                            isWeekend && 'bg-gray-50/50',
                            isMonday && 'border-l-2 border-l-gray-200'
                          )}
                          style={{ width: COL_W, minWidth: COL_W, height: 32 }}
                        >
                          {bar && (
                            <div
                              className="absolute inset-y-0.5 inset-x-0 rounded-sm flex items-center justify-center"
                              style={{ backgroundColor: bar.color + 'CC' }}
                            >
                              {isBarStart && bar.label && (
                                <span className="text-white text-[8px] font-bold truncate px-0.5">{bar.label}</span>
                              )}
                            </div>
                          )}

                          {/* 오늘 세로선 */}
                          {di === todayOffset && (
                            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-red-500 z-20" style={{ transform: 'translateX(-50%)' }} />
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
          빨간 세로선 = 오늘 ({formatDate(today)}) · Edit 버튼으로 일정 수정 가능
        </p>
      </div>
    </>
  )
}
