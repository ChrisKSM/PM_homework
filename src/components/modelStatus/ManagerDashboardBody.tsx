import { LayoutDashboard, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import KpiCard from '../cards/KpiCard'
import SectionCard from '../cards/SectionCard'
import RiskTable from '../cards/RiskTable'
import EpicProgressChart from '../charts/EpicProgressChart'
import IssueStatusChart from '../charts/IssueStatusChart'
import VelocityChart from '../charts/VelocityChart'
import JiraDegradedBanner from '../jira/JiraDegradedBanner'
import {
  useProjectSummary,
  useEpicProgress,
  useIssueDistribution,
  useVelocity,
  useRiskIssues,
} from '../../hooks/useJiraData'
import { useJiraDegraded } from '../../hooks/useJiraDegraded'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-lg-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ApiErrorBanner({ label, error }: { label: string; error: unknown }) {
  const err = error as { response?: { status?: number; data?: { detail?: string } }; message?: string }
  const status = err?.response?.status
  const detail = err?.response?.data?.detail || err?.message || 'API 요청 실패'
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-800">
      <p className="font-semibold">
        {label} — HTTP {status ?? 'ERR'}
      </p>
      <p className="mt-1 text-red-700">{String(detail)}</p>
      <p className="mt-2 text-gray-500">
        BE pod: JIRA_API_TOKEN · Jira 연결 · uvicorn 재시작 확인
      </p>
    </div>
  )
}

/** S80C 조직 책임자 대시보드 본문 */
export default function ManagerDashboardBody() {
  const jiraDegraded = useJiraDegraded()
  const summaryQ = useProjectSummary()
  const epicsQ = useEpicProgress()
  const distQ = useIssueDistribution()
  const velocityQ = useVelocity()
  const risksQ = useRiskIssues()

  return (
    <div className="space-y-6">
      {jiraDegraded ? <JiraDegradedBanner /> : null}
      {summaryQ.isError ? (
        <ApiErrorBanner label="KPI 요약" error={summaryQ.error} />
      ) : summaryQ.isLoading ? (
        <LoadingSpinner />
      ) : summaryQ.data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="전체 진행률"
            value={`${summaryQ.data.totalProgress}%`}
            sub="Story Point 기준"
            tone="success"
            icon={<TrendingUp size={16} />}
            trend={{ value: 8, label: '지난 스프린트 대비' }}
          />
          <KpiCard
            label="완료 Epic"
            value={`${summaryQ.data.completedEpics} / ${summaryQ.data.totalEpics}`}
            sub={`${summaryQ.data.totalEpics - summaryQ.data.completedEpics}개 진행중`}
            tone="info"
            icon={<LayoutDashboard size={16} />}
          />
          <KpiCard
            label="완료 Story"
            value={`${summaryQ.data.completedStories} / ${summaryQ.data.totalStories}`}
            sub={`완료율 ${Math.round((summaryQ.data.completedStories / summaryQ.data.totalStories) * 100)}%`}
            tone="default"
            icon={<CheckCircle2 size={16} />}
          />
          <KpiCard
            label="블로커 이슈"
            value={summaryQ.data.blockerCount}
            sub="즉시 대응 필요"
            tone="danger"
            icon={<AlertTriangle size={16} />}
          />
        </div>
      ) : null}

      <SectionCard title="Epic별 진행률" subtitle="Story Point 기준 완료 / 진행중 / 미시작 누적 비율">
        {epicsQ.isError ? (
          <ApiErrorBanner label="Epic 진행률" error={epicsQ.error} />
        ) : epicsQ.isLoading ? (
          <LoadingSpinner />
        ) : epicsQ.data ? (
          <EpicProgressChart data={epicsQ.data} />
        ) : null}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="이슈 상태 분포" subtitle="전체 이슈 유형별 현황">
          {distQ.isError ? (
            <ApiErrorBanner label="이슈 분포" error={distQ.error} />
          ) : distQ.isLoading ? (
            <LoadingSpinner />
          ) : distQ.data ? (
            <IssueStatusChart data={distQ.data} />
          ) : null}
        </SectionCard>
        <SectionCard title="스프린트 Velocity" subtitle="스프린트 커밋 Story SP vs Done(SOC DELIVERED·Closed) Story SP">
          {velocityQ.isError ? (
            <ApiErrorBanner label="Velocity" error={velocityQ.error} />
          ) : velocityQ.isLoading ? (
            <LoadingSpinner />
          ) : velocityQ.data ? (
            <VelocityChart data={velocityQ.data} />
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="주요 리스크 및 블로커" subtitle="즉시 조치가 필요한 이슈 목록">
        {risksQ.isError ? (
          <ApiErrorBanner label="리스크 /issues/risks" error={risksQ.error} />
        ) : risksQ.isLoading ? (
          <LoadingSpinner />
        ) : risksQ.data ? (
          <RiskTable issues={risksQ.data} />
        ) : null}
      </SectionCard>
    </div>
  )
}
