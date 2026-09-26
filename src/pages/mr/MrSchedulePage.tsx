import Header from '../../components/layout/Header'
import SectionCard from '../../components/cards/SectionCard'
import KpiCard from '../../components/cards/KpiCard'
import { CalendarRange, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

const MILESTONES = [
  { phase: 'MR 준비', start: '09/01', end: '09/05', status: 'done', owner: '고석민' },
  { phase: 'Code Freeze', start: '09/06', end: '09/08', status: 'active', owner: 'ksko' },
  { phase: 'QA 검증', start: '09/09', end: '09/15', status: 'upcoming', owner: '금 光' },
  { phase: 'RC 빌드', start: '09/16', end: '09/18', status: 'upcoming', owner: '이종혁' },
  { phase: 'MR 릴리즈', start: '09/19', end: '09/19', status: 'upcoming', owner: '고석민' },
]

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  done: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '완료' },
  active: { bg: 'bg-blue-50', text: 'text-blue-600', label: '진행중' },
  upcoming: { bg: 'bg-gray-50', text: 'text-gray-500', label: '예정' },
}

export default function MrSchedulePage() {
  return (
    <>
      <Header
        title="MR 일정 계획"
        subtitle="H7/M7/W7 9월 MR — 마일스톤 및 일정 추적"
      />

      <div className="pt-16 p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="MR 릴리즈" value="9/19" sub="D-13" icon={<CalendarRange size={16} />} />
          <KpiCard label="완료 단계" value="1 / 5" tone="info" sub="MR 준비 완료" icon={<CheckCircle2 size={16} />} />
          <KpiCard label="현재 단계" value="Code Freeze" tone="warning" sub="09/06 ~ 09/08" icon={<Clock size={16} />} />
          <KpiCard label="블로커" value="0" tone="success" sub="일정 리스크 없음" icon={<AlertTriangle size={16} />} />
        </div>

        <SectionCard title="MR 마일스톤 일정" subtitle="9월 MR 릴리즈 주요 단계별 현황">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">단계</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">시작</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">종료</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">담당</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase">상태</th>
                </tr>
              </thead>
              <tbody>
                {MILESTONES.map((m, i) => {
                  const s = STATUS_STYLE[m.status]
                  return (
                    <tr key={i} className="border-b border-surface-border/60 hover:bg-surface-page transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{m.phase}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-xs">{m.start}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-xs">{m.end}</td>
                      <td className="py-3 px-4 text-gray-700">{m.owner}</td>
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

        <SectionCard title="Gantt (간이)" subtitle="마일스톤 타임라인 시각화">
          <div className="space-y-3 py-2">
            {MILESTONES.map((m, i) => {
              const s = STATUS_STYLE[m.status]
              const startDay = parseInt(m.start.split('/')[1])
              const endDay = parseInt(m.end.split('/')[1])
              const left = ((startDay - 1) / 19) * 100
              const width = Math.max(((endDay - startDay + 1) / 19) * 100, 3)
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-24 shrink-0 truncate">{m.phase}</span>
                  <div className="flex-1 h-7 bg-gray-50 rounded-lg relative border border-surface-border">
                    <div
                      className={`absolute top-1 bottom-1 rounded-md ${
                        m.status === 'done' ? 'bg-emerald-400' :
                        m.status === 'active' ? 'bg-blue-400 animate-pulse' : 'bg-gray-300'
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-[7.5rem]">
              <span>09/01</span><span>09/05</span><span>09/10</span><span>09/15</span><span>09/19</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  )
}
