import Header from '../../components/layout/Header'
import SectionCard from '../../components/cards/SectionCard'
import KpiCard from '../../components/cards/KpiCard'
import { Bug, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// ── Mock 데이터 ──────────────────────────────────────────────────────────────

type Issue = {
  key: string; summary: string; priority: string; status: string
  assignee: string; model: string; category: string; source: string; age: number
}

const MOCK_ISSUES: Issue[] = [
  { key: 'HMW-042', summary: 'W7 BT 연결 후 오디오 끊김 발생', priority: 'Critical', status: 'In Progress', assignee: '김민준', model: 'W7', category: 'BT', source: '제품', age: 3 },
  { key: 'HMW-038', summary: 'H7 HDMI eARC 간헐적 미인식', priority: 'Major', status: 'Open', assignee: '박도현', model: 'H7', category: 'eARC', source: '제품', age: 5 },
  { key: 'HMW-051', summary: 'M7 자동 전원 Off 시 팝노이즈', priority: 'Major', status: 'In Progress', assignee: '이서연', model: 'M7', category: 'Audio', source: '제품', age: 2 },
  { key: 'HMW-055', summary: 'W7 Airplay 연결 1분 후 끊어짐', priority: 'Minor', status: 'Open', assignee: '최지아', model: 'W7', category: 'Wireless', source: '제품', age: 7 },
  { key: 'HMW-060', summary: 'H7/M7 EQ Preset 저장 안됨', priority: 'Minor', status: 'Fixed', assignee: '정우진', model: 'H7', category: 'Audio', source: '앱', age: 1 },
  { key: 'HMW-063', summary: 'LG ThinQ 앱 기기 등록 실패', priority: 'Critical', status: 'Open', assignee: '김민준', model: 'H7', category: 'APP', source: '앱', age: 4 },
  { key: 'HMW-065', summary: 'M7 USB 재생 시 간헐적 멈춤', priority: 'Major', status: 'Fixed', assignee: '박도현', model: 'M7', category: 'USB', source: '제품', age: 2 },
  { key: 'HMW-068', summary: 'W7 Night Mode EQ 미적용', priority: 'Minor', status: 'Fixed', assignee: '이서연', model: 'W7', category: 'Audio', source: '제품', age: 1 },
  { key: 'HMW-071', summary: 'H7 VFD 밝기 조절 불가', priority: 'Minor', status: 'Open', assignee: '최지아', model: 'H7', category: 'VFD', source: '제품', age: 6 },
  { key: 'HMW-074', summary: 'ThinQ 앱 볼륨 슬라이더 동기화 안됨', priority: 'Major', status: 'In Progress', assignee: '정우진', model: 'M7', category: 'APP', source: '앱', age: 3 },
  { key: 'HMW-076', summary: 'W7 Wi-Fi 재연결 시 5초 딜레이', priority: 'Minor', status: 'Open', assignee: '김민준', model: 'W7', category: 'Wireless', source: '제품', age: 8 },
  { key: 'HMW-079', summary: 'H7 리모컨 Key 입력 2회 인식', priority: 'Major', status: 'Fixed', assignee: '박도현', model: 'H7', category: 'Key', source: '제품', age: 1 },
]

// ── 집계 ─────────────────────────────────────────────────────────────────────

const total = MOCK_ISSUES.length
const fixed = MOCK_ISSUES.filter((i) => i.status === 'Fixed').length
const open = MOCK_ISSUES.filter((i) => i.status !== 'Fixed').length
const criticalMajor = MOCK_ISSUES.filter((i) => ['Critical', 'Major'].includes(i.priority) && i.status !== 'Fixed').length

function countBy(items: Issue[], field: keyof Issue): { name: string; value: number }[] {
  const map: Record<string, number> = {}
  items.forEach((i) => {
    const key = String(i[field])
    map[key] = (map[key] || 0) + 1
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

const sourceData = countBy(MOCK_ISSUES, 'source')
const modelData = countBy(MOCK_ISSUES, 'model')
const categoryData = countBy(MOCK_ISSUES, 'category')

const PIE_COLORS = ['#A50034', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#6B7280']

const openIssues = MOCK_ISSUES
  .filter((i) => i.status !== 'Fixed')
  .sort((a, b) => {
    const priOrder: Record<string, number> = { Critical: 0, Major: 1, Minor: 2 }
    return (priOrder[a.priority] ?? 9) - (priOrder[b.priority] ?? 9) || b.age - a.age
  })

// ── 스타일 ───────────────────────────────────────────────────────────────────

const PRI_STYLE: Record<string, string> = {
  Critical: 'bg-red-50 text-red-600 border border-red-200',
  Major: 'bg-orange-50 text-orange-600 border border-orange-200',
  Minor: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const STATUS_STYLE: Record<string, string> = {
  Open: 'text-red-500',
  'In Progress': 'text-blue-500',
  Fixed: 'text-emerald-500',
}

// ── Pie 차트 컴포넌트 ────────────────────────────────────────────────────────

function MiniPieChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            dataKey="value"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [`${value}건`, name]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#6B7280' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 페이지 ───────────────────────────────────────────────────────────────────

export default function MrQualityPage() {
  return (
    <>
      <Header
        title="품질 이슈 현황"
        subtitle="H7/M7/W7 9월 MR — Defect 현황 및 미결 이슈 추적"
      />

      <div className="pt-16 p-6 space-y-6">
        {/* Row 1: KPI 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="전체 이슈" value={total} icon={<Bug size={16} />} />
          <KpiCard label="Fixed" value={fixed} tone="success" sub={`${Math.round((fixed / total) * 100)}% 처리율`} icon={<CheckCircle2 size={16} />} />
          <KpiCard label="Open" value={open} tone="warning" sub={`In Progress ${MOCK_ISSUES.filter((i) => i.status === 'In Progress').length}건 포함`} icon={<AlertCircle size={16} />} />
          <KpiCard label="Critical/Major" value={criticalMajor} tone="danger" sub="미결 기준" icon={<ShieldAlert size={16} />} />
        </div>

        {/* Row 2: Pie 차트 3개 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MiniPieChart data={sourceData} title="제품/앱 Defect 건수" />
          <MiniPieChart data={modelData} title="모델별 Defect" />
          <MiniPieChart data={categoryData} title="기능별 분류" />
        </div>

        {/* Row 3: 미결 이슈 목록 */}
        <SectionCard title="미결 이슈 목록" subtitle={`${openIssues.length}건 · Critical/Major 우선 · 경과일 순`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">이슈</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">제목</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">모델</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">분류</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">담당</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">상태</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">우선순위</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">경과일</th>
                </tr>
              </thead>
              <tbody>
                {openIssues.map((issue) => (
                  <tr key={issue.key} className="border-b border-surface-border/60 hover:bg-surface-page transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-blue-600 font-medium">{issue.key}</td>
                    <td className="py-3 px-4 text-gray-900 max-w-xs truncate">{issue.summary}</td>
                    <td className="py-3 px-4 text-gray-600">{issue.model}</td>
                    <td className="py-3 px-4 text-gray-600">{issue.category}</td>
                    <td className="py-3 px-4 text-gray-700">{issue.assignee}</td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${STATUS_STYLE[issue.status] || 'text-gray-500'}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PRI_STYLE[issue.priority]}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{issue.age}일</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </>
  )
}
