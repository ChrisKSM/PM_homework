import { useState, useEffect, useCallback } from 'react'
import Header from '../../components/layout/Header'
import SectionCard from '../../components/cards/SectionCard'
import KpiCard from '../../components/cards/KpiCard'
import { Bug, CheckCircle2, AlertCircle, ShieldAlert, Loader2, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { mrQualityApi } from '../../api/mrQualityApi'
import type { MrQualityDashboard, ChartDataItem, MrOpenIssue } from '../../api/mrQualityApi'
import { USE_MOCK } from '../../config/dataSource'

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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500))
        setData(MOCK_DATA)
      } else {
        const result = await mrQualityApi.getDashboard()
        setData(result)
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'API 호출 실패')
      setData(MOCK_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <>
        <Header title="품질 이슈 현황" subtitle="H7/M7/W7 9월 MR — Defect 현황 및 미결 이슈 추적" />
        <div className="pt-16 p-6 flex items-center justify-center h-64">
          <Loader2 size={24} className="text-lg-red animate-spin" />
        </div>
      </>
    )
  }

  const kpi = data?.kpi || MOCK_DATA.kpi
  const charts = data?.charts || MOCK_DATA.charts
  const openIssues = data?.openIssues || MOCK_DATA.openIssues

  return (
    <>
      <Header title="품질 이슈 현황" subtitle="H7/M7/W7 9월 MR — Defect 현황 및 미결 이슈 추적" />

      <div className="pt-16 p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error} (Mock 데이터로 표시 중)</span>
          </div>
        )}

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
              onClick={loadData}
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
      </div>
    </>
  )
}
