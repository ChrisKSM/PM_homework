import Header from '../../components/layout/Header'
import SectionCard from '../../components/cards/SectionCard'
import KpiCard from '../../components/cards/KpiCard'
import { Package, CheckCircle2, Clock, GitBranch } from 'lucide-react'

const BUILDS = [
  { version: 'H7_MR_v1.0.8', model: 'H7', date: '09/10', branch: 'release/h7-mr-sept', status: 'planned', notes: 'BT/eARC 수정 포함' },
  { version: 'M7_MR_v2.1.3', model: 'M7', date: '09/11', branch: 'release/m7-mr-sept', status: 'planned', notes: '팝노이즈 fix 포함' },
  { version: 'W7_MR_v1.2.0', model: 'W7', date: '09/12', branch: 'release/w7-mr-sept', status: 'planned', notes: 'Airplay 안정화' },
  { version: 'H7_MR_v1.0.9-rc', model: 'H7', date: '09/16', branch: 'rc/h7-mr-sept', status: 'rc', notes: 'RC 후보 빌드' },
  { version: 'M7_MR_v2.1.4-rc', model: 'M7', date: '09/16', branch: 'rc/m7-mr-sept', status: 'rc', notes: 'RC 후보 빌드' },
  { version: 'W7_MR_v1.2.1-rc', model: 'W7', date: '09/17', branch: 'rc/w7-mr-sept', status: 'rc', notes: 'RC 후보 빌드' },
]

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  done: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '완료' },
  planned: { bg: 'bg-blue-50', text: 'text-blue-600', label: '예정' },
  rc: { bg: 'bg-purple-50', text: 'text-purple-600', label: 'RC' },
  building: { bg: 'bg-amber-50', text: 'text-amber-600', label: '빌드중' },
}

export default function MrBuildPlanPage() {
  return (
    <>
      <Header
        title="버전 빌드 계획"
        subtitle="H7/M7/W7 9월 MR — 모델별 빌드 일정 및 브랜치 관리"
      />

      <div className="pt-16 p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="총 빌드" value={BUILDS.length} icon={<Package size={16} />} />
          <KpiCard label="완료" value={BUILDS.filter((b) => b.status === 'done').length} tone="success" icon={<CheckCircle2 size={16} />} />
          <KpiCard label="예정" value={BUILDS.filter((b) => b.status === 'planned').length} tone="info" icon={<Clock size={16} />} />
          <KpiCard label="RC 빌드" value={BUILDS.filter((b) => b.status === 'rc').length} tone="warning" sub="릴리즈 후보" icon={<GitBranch size={16} />} />
        </div>

        {/* 모델별 빌드 현황 */}
        {['H7', 'M7', 'W7'].map((model) => {
          const modelBuilds = BUILDS.filter((b) => b.model === model)
          return (
            <SectionCard key={model} title={`${model} 빌드 계획`} subtitle={`${modelBuilds.length}건 예정`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">버전</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">빌드 일자</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">브랜치</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">비고</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelBuilds.map((b, i) => {
                      const s = STATUS_STYLE[b.status] || STATUS_STYLE.planned
                      return (
                        <tr key={i} className="border-b border-surface-border/60 hover:bg-surface-page transition-colors">
                          <td className="py-3 px-4 font-mono text-xs font-bold text-gray-900">{b.version}</td>
                          <td className="py-3 px-4 text-gray-600 font-mono text-xs">{b.date}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono text-xs">{b.branch}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{b.notes}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )
        })}
      </div>
    </>
  )
}
