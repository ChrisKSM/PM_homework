import { LayoutDashboard, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Header from '../components/layout/Header'
import KpiCard from '../components/cards/KpiCard'
import SectionCard from '../components/cards/SectionCard'
import RiskTable from '../components/cards/RiskTable'
import EpicProgressChart from '../components/charts/EpicProgressChart'
import IssueStatusChart from '../components/charts/IssueStatusChart'
import VelocityChart from '../components/charts/VelocityChart'
import {
  useProjectSummary,
  useEpicProgress,
  useIssueDistribution,
  useVelocity,
  useRiskIssues,
} from '../hooks/useJiraData'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function ManagerDashboard() {
  const { data: summary, isLoading: loadingSummary } = useProjectSummary()
  const { data: epics, isLoading: loadingEpics } = useEpicProgress()
  const { data: distribution, isLoading: loadingDist } = useIssueDistribution()
  const { data: velocity, isLoading: loadingVelocity } = useVelocity()
  const { data: risks, isLoading: loadingRisks } = useRiskIssues()

  return (
    <>
      <Header
        title="조직 책임자 대시보드"
        subtitle="전체 프로젝트 현황 — KPI, Epic 진행률, Velocity, 리스크 관리"
      />

      <div className="pt-16 p-6 space-y-6">
        {/* KPI 카드 */}
        {loadingSummary ? (
          <LoadingSpinner />
        ) : summary ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="전체 진행률"
              value={`${summary.totalProgress}%`}
              sub="Story Point 기준"
              tone="success"
              icon={<TrendingUp size={16} />}
              trend={{ value: 8, label: '지난 스프린트 대비' }}
            />
            <KpiCard
              label="완료 Epic"
              value={`${summary.completedEpics} / ${summary.totalEpics}`}
              sub={`${summary.totalEpics - summary.completedEpics}개 진행중`}
              tone="info"
              icon={<LayoutDashboard size={16} />}
            />
            <KpiCard
              label="완료 Story"
              value={`${summary.completedStories} / ${summary.totalStories}`}
              sub={`완료율 ${Math.round((summary.completedStories / summary.totalStories) * 100)}%`}
              icon={<CheckCircle2 size={16} />}
            />
            <KpiCard
              label="블로커 이슈"
              value={summary.blockerCount}
              sub="즉시 대응 필요"
              tone="danger"
              icon={<AlertTriangle size={16} />}
            />
          </div>
        ) : null}

        {/* Epic 진행률 */}
        <SectionCard
          title="Epic별 진행률"
          subtitle="Story Point 기준 완료 / 진행중 / 미시작 누적 비율"
        >
          {loadingEpics ? <LoadingSpinner /> : epics ? <EpicProgressChart data={epics} /> : null}
        </SectionCard>

        {/* 이슈 분포 + Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard
            title="이슈 상태 분포"
            subtitle="전체 이슈 유형별 현황"
          >
            {loadingDist ? (
              <LoadingSpinner />
            ) : distribution ? (
              <IssueStatusChart data={distribution} />
            ) : null}
          </SectionCard>

          <SectionCard
            title="스프린트 Velocity"
            subtitle="스프린트별 계획 대비 완료 Story Points"
          >
            {loadingVelocity ? (
              <LoadingSpinner />
            ) : velocity ? (
              <VelocityChart data={velocity} />
            ) : null}
          </SectionCard>
        </div>

        {/* 리스크 테이블 */}
        <SectionCard
          title="주요 리스크 및 블로커"
          subtitle="즉시 조치가 필요한 이슈 목록"
        >
          {loadingRisks ? (
            <LoadingSpinner />
          ) : risks ? (
            <RiskTable issues={risks} />
          ) : null}
        </SectionCard>
      </div>
    </>
  )
}
