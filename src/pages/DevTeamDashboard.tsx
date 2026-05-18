import { Flame, Target, Zap, AlertTriangle } from 'lucide-react'
import Header from '../components/layout/Header'
import KpiCard from '../components/cards/KpiCard'
import SectionCard from '../components/cards/SectionCard'
import IssueTable from '../components/cards/IssueTable'
import BurndownChart from '../components/charts/BurndownChart'
import VelocityChart from '../components/charts/VelocityChart'
import WorkloadChart from '../components/charts/WorkloadChart'
import {
  useSprintSummary,
  useBurndown,
  useTeamWorkload,
  useVelocity,
  useSprintIssues,
} from '../hooks/useJiraData'
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function DevTeamDashboard() {
  const { data: sprint, isLoading: loadingSprint } = useSprintSummary()
  const { data: burndown, isLoading: loadingBurndown } = useBurndown()
  const { data: workload, isLoading: loadingWorkload } = useTeamWorkload()
  const { data: velocity, isLoading: loadingVelocity } = useVelocity()
  const { data: issues, isLoading: loadingIssues } = useSprintIssues()

  return (
    <>
      <Header
        title="개발팀 대시보드"
        subtitle="현재 스프린트 집중 분석 — Burn Down, 워크로드, 이슈 상세"
      />

      <div className="pt-16 p-6 space-y-6">
        {/* 스프린트 KPI */}
        {loadingSprint ? (
          <LoadingSpinner />
        ) : sprint ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="현재 스프린트"
              value={sprint.sprintName}
              sub={`종료일 ${sprint.endDate} · D-${sprint.daysLeft}`}
              icon={<Flame size={16} />}
            />
            <KpiCard
              label="남은 Story Points"
              value={`${sprint.remainingPoints} SP`}
              sub="현재 스프린트 잔여"
              tone="warning"
              icon={<Target size={16} />}
            />
            <KpiCard
              label="완료율"
              value={`${sprint.completionRate}%`}
              sub="Story Points 기준"
              tone="success"
              icon={<Zap size={16} />}
              trend={{ value: 4, label: '전 스프린트 대비' }}
            />
            <KpiCard
              label="블로커"
              value={sprint.blockerCount}
              sub="즉시 해결 필요"
              tone="danger"
              icon={<AlertTriangle size={16} />}
            />
          </div>
        ) : null}

        {/* Burndown + Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard
            title="Burn Down Chart"
            subtitle={`${sprint?.sprintName ?? ''} — 이상적 번다운 대비 실제 진행`}
          >
            {loadingBurndown ? (
              <LoadingSpinner />
            ) : burndown ? (
              <BurndownChart data={burndown} />
            ) : null}
          </SectionCard>

          <SectionCard
            title="팀원별 Story Points 분배"
            subtitle="현재 스프린트 담당 작업량"
          >
            {loadingWorkload ? (
              <LoadingSpinner />
            ) : workload ? (
              <WorkloadChart data={workload} />
            ) : null}
          </SectionCard>
        </div>

        {/* Velocity */}
        <SectionCard
          title="스프린트 Velocity 비교"
          subtitle="전체 스프린트 계획 대비 완료 — 팀 역량 및 예측 정확도 분석"
        >
          {loadingVelocity ? (
            <LoadingSpinner />
          ) : velocity ? (
            <VelocityChart data={velocity} />
          ) : null}
        </SectionCard>

        {/* 이슈 테이블 */}
        <SectionCard
          title="현재 스프린트 이슈 현황"
          subtitle="Story / Sub-task / Bug / Epic 전체 목록"
        >
          {loadingIssues ? (
            <LoadingSpinner />
          ) : issues ? (
            <IssueTable issues={issues} />
          ) : null}
        </SectionCard>
      </div>
    </>
  )
}
