import { AlertCircle } from 'lucide-react'
import Header from '../components/layout/Header'
import KpiCard from '../components/cards/KpiCard'
import SectionCard from '../components/cards/SectionCard'
import SprintPlanGantt from '../components/sprintPlan/SprintPlanGantt'
import { useSprintPlanTimeline, USE_SPRINT_PLAN_MOCK } from '../hooks/useSprintPlanData'

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-lg-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function ReleaseSprintPlanPage() {
  const { data, isLoading, error } = useSprintPlanTimeline()

  const riskCount = data?.rows.reduce((n, r) => n + r.risks.length, 0) ?? 0
  const mvpCount = data?.rows.filter((r) => r.isMvp).length ?? 0

  return (
    <>
      <Header
        title="Release / Sprint Plan"
        subtitle={
          USE_SPRINT_PLAN_MOCK
            ? 'Epic · Story · 2026_IR1SP02~IR4SP17 · Gantt 2~8월 — Mock'
            : 'Epic · Story · 2026_IR1SP02~IR4SP17 · Jira Agile API'
        }
      />

      <div className="pt-16 p-6 space-y-6">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-lg-red bg-lg-red-light border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>일정 데이터를 불러오지 못했습니다.</span>
          </div>
        ) : isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 max-w-xl">
              <KpiCard
                label="MVP 항목"
                value={mvpCount}
                tone={mvpCount > 0 ? 'info' : 'success'}
                sub="labels=MVP"
              />
              <KpiCard
                label="RISK 마커"
                value={riskCount}
                tone={riskCount > 0 ? 'warning' : 'success'}
                sub="Description · Environment"
              />
            </div>

            {data.meta.message && (
              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                {data.meta.message}
              </div>
            )}

            <SectionCard
              title="Release / Sprint Gantt"
              subtitle="Summary · Sprint 기간(2026_IRxSPxx) · Gantt 2026년 2~8월 — Gate는 fixVersions(Release 1.0) 대체 표시"
            >
              <SprintPlanGantt data={data} />
            </SectionCard>
          </>
        )}
      </div>
    </>
  )
}
