import { useState, useEffect, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import Header from '../../components/layout/Header'
import SectionCard from '../../components/cards/SectionCard'
import KpiCard from '../../components/cards/KpiCard'
import DatePickerField from '../../components/mr/DatePickerField'
import { Bug, CheckCircle2, AlertCircle, ShieldAlert, Loader2, RefreshCw, Filter, Plus, X, Search } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import clsx from 'clsx'
import { mrQualityApi } from '../../api/mrQualityApi'
import type { MrQualityDashboard, ChartDataItem } from '../../api/mrQualityApi'
import { buildPolarionQuery } from '../../utils/polarionQuery'

const DEFAULT_PROJECTS = [
  '[MR_Minor] 26년 Sound Suite H7 정기 MR8 (9월)',
  '2025_M7_NA_B_HW',
]
const DEFAULT_FROM = '2026-09-09'
const DEFAULT_TO = '2026-09-26'
const EVENT_SEQUENCES = ['ALL', '1', '2', '3', '4', '5']
const SEQ_LABELS: Record<string, string> = { ALL: 'ALL', '1': '1차', '2': '2차', '3': '3차', '4': '4차', '5': '5차' }

// ── Mock fallback ────────────────────────────────────────────────────────────

const MOCK_DATA: MrQualityDashboard = {
  kpi: { total: 12, fixed: 4, open: 8, criticalMajor: 5, inProgress: 3, fixRate: 33 },
  charts: {
    bySource: [{ name: '제품', value: 9 }, { name: '앱', value: 3 }],
    byModel: [{ name: 'H7', value: 5 }, { name: 'W7', value: 4 }, { name: 'M7', value: 3 }],
    byCategory: [
      { name: 'Audio', value: 3 }, { name: 'BT', value: 2 }, { name: 'APP', value: 2 },
      { name: 'Wireless', value: 2 }, { name: 'eARC', value: 1 }, { name: 'USB', value: 1 }, { name: 'VFD', value: 1 },
    ],
  },
  openIssues: [
    { key: 'HMW-063', title: 'LG ThinQ 앱 기기 등록 실패', model: 'H7', category: 'APP', source: '앱', assignee: '김민준', status: 'Open', severity: 'Critical', swVersion: '' },
    { key: 'HMW-042', title: 'W7 BT 연결 후 오디오 끊김 발생', model: 'W7', category: 'BT', source: '제품', assignee: '김민준', status: 'In Progress', severity: 'Critical', swVersion: '' },
    { key: 'HMW-038', title: 'H7 HDMI eARC 간헐적 미인식', model: 'H7', category: 'eARC', source: '제품', assignee: '박도현', status: 'Open', severity: 'Major', swVersion: '' },
    { key: 'HMW-051', title: 'M7 자동 전원 Off 시 팝노이즈', model: 'M7', category: 'Audio', source: '제품', assignee: '이서연', status: 'In Progress', severity: 'Major', swVersion: '' },
    { key: 'HMW-074', title: 'ThinQ 앱 볼륨 슬라이더 동기화 안됨', model: 'M7', category: 'APP', source: '앱', assignee: '정우진', status: 'In Progress', severity: 'Major', swVersion: '' },
    { key: 'HMW-055', title: 'W7 Airplay 연결 1분 후 끊어짐', model: 'W7', category: 'Wireless', source: '제품', assignee: '최지아', status: 'Open', severity: 'Minor', swVersion: '' },
    { key: 'HMW-071', title: 'H7 VFD 밝기 조절 불가', model: 'H7', category: 'VFD', source: '제품', assignee: '최지아', status: 'Open', severity: 'Minor', swVersion: '' },
    { key: 'HMW-076', title: 'W7 Wi-Fi 재연결 시 5초 딜레이', model: 'W7', category: 'Wireless', source: '제품', assignee: '김민준', status: 'Open', severity: 'Minor', swVersion: '' },
  ],
  modelFilter: 'all',
}

// ── 스타일 상수 ──────────────────────────────────────────────────────────────

const PIE_COLORS = ['#A50034', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#6B7280']

const SEV_STYLE: Record<string, string> = {
  Critical: 'bg-red-50 text-red-600 border border-red-200',
  Major: 'bg-orange-50 text-orange-600 border border-orange-200',
  Minor: 'bg-gray-100 text-gray-600 border border-gray-200',
  critical: 'bg-red-50 text-red-600 border border-red-200',
  major: 'bg-orange-50 text-orange-600 border border-orange-200',
  minor: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const STATUS_STYLE: Record<string, string> = {
  Open: 'text-red-500', open: 'text-red-500',
  'In Progress': 'text-blue-500', '진행중': 'text-blue-500',
  Fixed: 'text-emerald-500', fixed: 'text-emerald-500',
  Resolved: 'text-emerald-500', resolved: 'text-emerald-500',
}

// ── Pie 차트 컴포넌트 ────────────────────────────────────────────────────────

function MiniPieChart({ data, title }: { data: ChartDataItem[]; title: string }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value}건`, name]}
          />
          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6B7280' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 페이지 ───────────────────────────────────────────────────────────────────

export default function MrQualityPage() {
  const [data, setData] = useState<MrQualityDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [eventSeq, setEventSeq] = useState('ALL')
  const [projectNames, setProjectNames] = useState<string[]>(DEFAULT_PROJECTS)
  const [projectDraft, setProjectDraft] = useState('')
  const [createdFrom, setCreatedFrom] = useState(DEFAULT_FROM)
  const [createdTo, setCreatedTo] = useState(DEFAULT_TO)

  const previewQuery = buildPolarionQuery({
    projectNames,
    eventSequence: eventSeq,
    createdFrom,
    createdTo,
  })

  const loadData = useCallback(async (overrides?: {
    eventSequence?: string
    names?: string[]
    from?: string
    to?: string
  }) => {
    const seq = overrides?.eventSequence ?? eventSeq
    const names = overrides?.names ?? projectNames
    const from = overrides?.from ?? createdFrom
    const to = overrides?.to ?? createdTo
    setLoading(true)
    setError('')
    try {
      const result = await mrQualityApi.getDashboard({
        project_names: names,
        event_sequence: seq,
        created_from: from,
        created_to: to,
      })
      setData(result)
    } catch (e: any) {
      console.warn('[MR Quality] API 실패 → Mock fallback:', e?.message)
      setError(e?.response?.data?.detail || e?.message || 'API 호출 실패')
      setData({
        ...MOCK_DATA,
        query: buildPolarionQuery({
          projectNames: names,
          eventSequence: seq,
          createdFrom: from,
          createdTo: to,
        }),
        projectNames: names,
        createdFrom: from,
        createdTo: to,
        eventSequence: seq,
      })
    } finally {
      setLoading(false)
    }
  }, [eventSeq, projectNames, createdFrom, createdTo])

  useEffect(() => { loadData() }, [])

  const addProjectName = () => {
    const name = projectDraft.trim()
    if (!name || projectNames.includes(name)) {
      setProjectDraft('')
      return
    }
    setProjectNames([...projectNames, name])
    setProjectDraft('')
  }

  const removeProjectName = (name: string) => {
    setProjectNames(projectNames.filter((item) => item !== name))
  }

  const handleDraftKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addProjectName()
    }
  }

  const handleApply = (e?: FormEvent) => {
    e?.preventDefault()
    const nextNames = [...projectNames]
    const draft = projectDraft.trim()
    if (draft && !nextNames.includes(draft)) nextNames.push(draft)
    if (draft) {
      setProjectNames(nextNames)
      setProjectDraft('')
    }
    loadData({ names: nextNames })
  }

  const handleSeqChange = (seq: string) => {
    setEventSeq(seq)
    loadData({ eventSequence: seq })
  }

  const kpi = data?.kpi || MOCK_DATA.kpi
  const charts = data?.charts || MOCK_DATA.charts
  const openIssues = data?.openIssues || MOCK_DATA.openIssues
  const appliedQuery = previewQuery

  return (
    <>
      <Header title="품질 이슈 현황" subtitle="H7/M7/W7 9월 MR — Defect 현황 및 미결 이슈 추적" />

      <div className="pt-16 p-6 space-y-6">
        <SectionCard
          title="조회 필터"
          subtitle="프로젝트 이름 OR · 차수 AND · 생성일 AND"
        >
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                <Filter size={14} />
                <span className="font-medium">프로젝트 이름</span>
                <span className="text-xs text-gray-400">OR 조건 · 다른 모델도 추가 가능</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {projectNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-lg bg-lg-red-light text-gray-800 text-xs font-medium border border-red-100"
                  >
                    <span className="truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => removeProjectName(name)}
                      className="text-gray-500 hover:text-lg-red"
                      aria-label={`${name} 제거`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {projectNames.length === 0 && (
                  <span className="text-xs text-amber-600">프로젝트 이름이 없으면 전체 모델이 조회됩니다</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectDraft}
                  onChange={(e) => setProjectDraft(e.target.value)}
                  onKeyDown={handleDraftKey}
                  placeholder="프로젝트 이름 입력 후 Enter / 추가"
                  className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-surface-border text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-lg-red"
                />
                <button
                  type="button"
                  onClick={addProjectName}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-surface-border text-sm font-medium text-gray-700 hover:bg-surface-page"
                >
                  <Plus size={14} />
                  추가
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <span className="font-medium">차수</span>
                <span className="text-xs text-gray-400">AND</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {EVENT_SEQUENCES.map((seq) => (
                  <button
                    key={seq}
                    type="button"
                    onClick={() => handleSeqChange(seq)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                      eventSeq === seq
                        ? 'bg-lg-red text-white border-lg-red'
                        : 'bg-white text-gray-600 border-surface-border hover:bg-surface-page'
                    )}
                  >
                    {SEQ_LABELS[seq] || seq}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-4 flex-wrap">
              <DatePickerField
                label="From (AND)"
                value={createdFrom}
                onChange={setCreatedFrom}
                max={createdTo || undefined}
              />
              <span className="text-gray-400 pb-2">~</span>
              <DatePickerField
                label="To (AND)"
                value={createdTo}
                onChange={setCreatedTo}
                min={createdFrom || undefined}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-lg-red text-white text-sm font-semibold hover:bg-lg-red-mid"
              >
                <Search size={14} />
                조회
              </button>
            </div>

            <div className="rounded-lg bg-surface-page border border-surface-border px-3 py-2">
              <p className="text-[11px] font-semibold text-gray-500 mb-1">Polarion query</p>
              <p className="text-xs font-mono text-gray-700 break-all">{appliedQuery}</p>
            </div>
          </form>
        </SectionCard>

        {error && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error} (Mock 데이터로 표시 중)</span>
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="text-lg-red animate-spin" />
          </div>
        )}

        {loading && data && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={14} className="text-lg-red animate-spin" />
            Polarion 조회 중...
          </div>
        )}

        {data && (
        <>
        {/* Row 1: KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="전체 이슈" value={kpi.total} icon={<Bug size={16} />} />
          <KpiCard label="Fixed" value={kpi.fixed} tone="success" sub={`${kpi.fixRate}% 처리율`} icon={<CheckCircle2 size={16} />} />
          <KpiCard label="Open" value={kpi.open} tone="warning" sub={`In Progress ${kpi.inProgress}건 포함`} icon={<AlertCircle size={16} />} />
          <KpiCard label="Critical/Major" value={kpi.criticalMajor} tone="danger" sub="미결 기준" icon={<ShieldAlert size={16} />} />
        </div>

        {/* Row 2: Pie 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MiniPieChart data={charts.bySource} title="제품/앱 Defect 건수" />
          <MiniPieChart data={charts.byModel} title="모델별 Defect" />
          <MiniPieChart data={charts.byCategory} title="기능별 분류" />
        </div>

        {/* Row 3: 미결 이슈 테이블 */}
        <SectionCard
          title="미결 이슈 목록"
          subtitle={`${openIssues.length}건 · Critical/Major 우선`}
        >
          <div className="flex justify-end mb-3">
            <button
              onClick={() => loadData()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-surface-page border border-surface-border rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw size={12} />
              새로고침
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">ID</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">제목</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">모델</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">분류</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">구분</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">담당</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">상태</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">심각도</th>
                </tr>
              </thead>
              <tbody>
                {openIssues.map((issue) => (
                  <tr key={issue.key} className="border-b border-surface-border/60 hover:bg-surface-page transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-blue-600 font-medium">{issue.key}</td>
                    <td className="py-3 px-4 text-gray-900 max-w-xs truncate">{issue.title}</td>
                    <td className="py-3 px-4 text-gray-600">{issue.model}</td>
                    <td className="py-3 px-4 text-gray-600">{issue.category}</td>
                    <td className="py-3 px-4 text-gray-600">{issue.source}</td>
                    <td className="py-3 px-4 text-gray-700">{issue.assignee}</td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${STATUS_STYLE[issue.status] || 'text-gray-500'}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${SEV_STYLE[issue.severity] || 'bg-gray-100 text-gray-500'}`}>
                        {issue.severity}
                      </span>
                    </td>
                  </tr>
                ))}
                {openIssues.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">미결 이슈 없음</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
        </>
        )}
      </div>
    </>
  )
}
