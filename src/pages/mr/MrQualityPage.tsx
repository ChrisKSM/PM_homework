import Header from '../../components/layout/Header'
import SectionCard from '../../components/cards/SectionCard'
import KpiCard from '../../components/cards/KpiCard'
import { Bug, CheckCircle2, ShieldAlert, TrendingUp } from 'lucide-react'

const MOCK_ISSUES = [
  { key: 'HMW-042', summary: 'W7 BT 연결 후 오디오 끊김 발생', priority: 'P0', status: 'In Progress', assignee: '김민준', model: 'W7', age: 3 },
  { key: 'HMW-038', summary: 'H7 HDMI eARC 간헐적 미인식', priority: 'P1', status: 'Open', assignee: '박도현', model: 'H7', age: 5 },
  { key: 'HMW-051', summary: 'M7 자동 전원 Off 시 팝노이즈', priority: 'P1', status: 'In Progress', assignee: '이서연', model: 'M7', age: 2 },
  { key: 'HMW-055', summary: 'W7 Airplay 연결 1분 후 끊어짐', priority: 'P2', status: 'Open', assignee: '최지아', model: 'W7', age: 7 },
  { key: 'HMW-060', summary: 'H7/M7 EQ Preset 저장 안됨', priority: 'P2', status: 'Resolved', assignee: '정우진', model: 'H7/M7', age: 1 },
]

const PRI_STYLE: Record<string, string> = {
  P0: 'bg-red-50 text-red-600 border border-red-200',
  P1: 'bg-orange-50 text-orange-600 border border-orange-200',
  P2: 'bg-amber-50 text-amber-600 border border-amber-200',
  P3: 'bg-gray-50 text-gray-500 border border-gray-200',
}

const STATUS_STYLE: Record<string, string> = {
  Open: 'text-red-500',
  'In Progress': 'text-blue-500',
  Resolved: 'text-emerald-500',
}

export default function MrQualityPage() {
  const openCount = MOCK_ISSUES.filter((i) => i.status !== 'Resolved').length
  const resolvedCount = MOCK_ISSUES.filter((i) => i.status === 'Resolved').length
  const p0p1Open = MOCK_ISSUES.filter((i) => ['P0', 'P1'].includes(i.priority) && i.status !== 'Resolved').length

  return (
    <>
      <Header
        title="품질 이슈 현황"
        subtitle="H7/M7/W7 9월 MR — 모델별 Bug 현황 및 미결 이슈 추적"
      />

      <div className="pt-16 p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="전체 이슈" value={MOCK_ISSUES.length} icon={<Bug size={16} />} />
          <KpiCard label="처리 완료" value={resolvedCount} tone="success" sub={`${Math.round((resolvedCount / MOCK_ISSUES.length) * 100)}% 처리율`} icon={<CheckCircle2 size={16} />} />
          <KpiCard label="미결" value={openCount} tone="warning" />
          <KpiCard label="P0/P1 미결" value={p0p1Open} tone="danger" icon={<ShieldAlert size={16} />} />
        </div>

        {/* 모델별 분포 */}
        <SectionCard title="모델별 이슈 분포" subtitle="H7 / M7 / W7 개별 현황">
          <div className="grid grid-cols-3 gap-4">
            {['H7', 'M7', 'W7'].map((model) => {
              const count = MOCK_ISSUES.filter((i) => i.model.includes(model)).length
              const open = MOCK_ISSUES.filter((i) => i.model.includes(model) && i.status !== 'Resolved').length
              return (
                <div key={model} className="rounded-xl border border-surface-border bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">{model}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">미결 {open}건</p>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* 이슈 테이블 */}
        <SectionCard title="미결 이슈 목록" subtitle="P0/P1 우선 · 경과일 순">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">이슈</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">제목</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">모델</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">담당</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">상태</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">우선순위</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">경과일</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ISSUES.map((issue) => (
                  <tr key={issue.key} className="border-b border-surface-border/60 hover:bg-surface-page transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-blue-600">{issue.key}</td>
                    <td className="py-3 px-4 text-gray-900 max-w-xs truncate">{issue.summary}</td>
                    <td className="py-3 px-4 text-gray-600">{issue.model}</td>
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
