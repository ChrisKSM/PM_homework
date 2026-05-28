import { useMemo, useState } from 'react'
import { AlertCircle, Bug, Clock, ShieldAlert } from 'lucide-react'
import Header from '../components/layout/Header'
import KpiCard from '../components/cards/KpiCard'
import SectionCard from '../components/cards/SectionCard'
import QualityFilters from '../components/quality/QualityFilters'
import QualityPriorityChart from '../components/quality/QualityPriorityChart'
import QualityCategoryChart from '../components/quality/QualityCategoryChart'
import {
  QualityAgingBarChart,
  QualityAvgResolveChart,
} from '../components/quality/QualityAgingCharts'
import QualityIssueTable from '../components/quality/QualityIssueTable'
import {
  useQualityDashboard,
  useQualityFilters,
  USE_QUALITY_MOCK,
} from '../hooks/useQualityData'
import type { QualityCategory, QualityEventGroup } from '../types/quality'
import { CHART } from '../theme/colors'

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-lg-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
    if (detail) return detail
  }
  return String((error as Error).message || '데이터를 불러오지 못했습니다.')
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-lg-red bg-lg-red-light border border-red-200 rounded-lg px-4 py-3">
      <AlertCircle size={16} className="shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function ResolveRateBar({ resolved, open, rate }: { resolved: number; open: number; rate: number }) {
  const total = resolved + open
  const resolvedPct = total ? (resolved / total) * 100 : 0
  const openPct = total ? (open / total) * 100 : 0

  return (
    <div className="bg-white border border-surface-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">처리율 (발견 대비)</p>
        <p className="text-xs text-gray-500 font-medium">{rate}%</p>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-muted">
        <div className="bg-emerald-500 transition-all" style={{ width: `${resolvedPct}%` }} title="처리" />
        <div className="bg-amber-400 transition-all" style={{ width: `${openPct}%` }} title="미결" />
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-500 font-medium">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          처리 {resolved}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          미결 {open}
        </span>
      </div>
    </div>
  )
}

export default function QualityDashboardPage() {
  const [eventGroup, setEventGroup] = useState<QualityEventGroup>('DEV')
  const [phase, setPhase] = useState('1')
  const [category, setCategory] = useState<QualityCategory>('all')

  const filterParams = useMemo(
    () => ({ event: eventGroup, phase, category }),
    [eventGroup, phase, category]
  )

  const { data: filterOptions } = useQualityFilters()
  const { data, isLoading, error } = useQualityDashboard(filterParams)

  const handleEventChange = (event: QualityEventGroup) => {
    setEventGroup(event)
    setPhase('1')
  }

  return (
    <>
      <Header
        title="품질 이슈 현황"
        subtitle={
          USE_QUALITY_MOCK
            ? 'DEV/FC/PV/자동화 이벤트별 Bug 현황 — Mock 데이터'
            : 'DEV/FC/PV/자동화 이벤트별 Bug 현황 — Jira API 연동'
        }
      />

      <div className="pt-16 p-6 space-y-6">
        <SectionCard title="이벤트 · 차수 · 분류 필터">
          {filterOptions?.phases && filterOptions?.eventGroups ? (
            <QualityFilters
              filterOptions={filterOptions}
              eventGroup={eventGroup}
              phase={phase}
              category={category}
              jql={data?.meta.jql}
              onEventChange={handleEventChange}
              onPhaseChange={setPhase}
              onCategoryChange={setCategory}
            />
          ) : (
            <LoadingBlock />
          )}
        </SectionCard>

        {error ? (
          <ErrorBlock message={getErrorMessage(error)} />
        ) : isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="발견 (전체)" value={data.kpi.discovered} icon={<Bug size={16} />} />
              <KpiCard
                label="처리 완료"
                value={data.kpi.resolved}
                tone="success"
                sub={`${data.kpi.resolveRatePct}% 처리율`}
              />
              <KpiCard label="미결" value={data.kpi.open} tone="warning" />
              <KpiCard
                label="P0/P1/P2 미결"
                value={data.kpi.p0p1p2Open ?? data.kpi.p1p2Open}
                tone="danger"
                icon={<ShieldAlert size={16} />}
              />
            </div>

            <ResolveRateBar
              resolved={data.kpi.resolved}
              open={data.kpi.open}
              rate={data.kpi.resolveRatePct}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                title="Priority별 발견 / 처리 / 미결"
                subtitle={`${data.meta.phaseLabel} · ${data.meta.jiraLabel}`}
              >
                <QualityPriorityChart data={data.byPriority} />
              </SectionCard>

              <SectionCard title="분류별 건수" subtitle="Jira label · VFD / BT / Wireless / Audio …">
                <QualityCategoryChart data={data.byCategory} />
              </SectionCard>
            </div>

            <SectionCard
              title="Issue Aging — 생성→처리 소요 시간"
              subtitle="calendar day 기준 · created / resolutiondate"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard label="평균 처리 소요" value={`${data.agingKpi.avgResolveDays}일`} icon={<Clock size={16} />} />
                <KpiCard
                  label="중앙값 (처리)"
                  value={`${data.agingKpi.medianResolveDays}일`}
                  tone="info"
                />
                <KpiCard
                  label="미결 평균 경과"
                  value={`${data.agingKpi.avgOpenAgeDays}일`}
                  tone="warning"
                />
                <KpiCard
                  label="P0/P1/P2 평균 처리"
                  value={`${data.agingKpi.p0p1p2AvgResolveDays ?? data.agingKpi.p1p2AvgResolveDays}일`}
                  tone="success"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">
                    처리 소요일 분포 (생성 → 완료)
                  </h4>
                  <QualityAgingBarChart
                    data={data.resolveAgingBuckets}
                    color={CHART.colors.success}
                    subtitle={`완료 ${data.kpi.resolved}건 · resolutiondate − created`}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3">
                    미결 경과일 분포 (생성 → 현재)
                  </h4>
                  <QualityAgingBarChart
                    data={data.openAgingBuckets}
                    color={CHART.colors.warning}
                    subtitle={`미결 ${data.kpi.open}건 · now − created`}
                  />
                </div>
              </div>

              <h4 className="text-sm font-bold text-gray-900 mb-3">Priority별 평균 처리 소요일</h4>
              <QualityAvgResolveChart data={data.avgResolveByPriority} />
            </SectionCard>

            <SectionCard
              title="P0/P1/P2 미결 — 대응 계획"
              subtitle={
                (data.kpi.p0p1p2Open ?? data.kpi.p1p2Open) > 0
                  ? `${data.kpi.p0p1p2Open ?? data.kpi.p1p2Open}건 · customfield_10901(대응 계획) · 미입력 시 행 강조`
                  : 'P0/P1/P2 미결 없음'
              }
            >
              <QualityIssueTable issues={data.p0p1p2OpenIssues ?? data.p1p2OpenIssues} showResponsePlan />
            </SectionCard>

            <SectionCard title="미결 전체 목록" subtitle="P3 포함 · 경과일 순">
              <QualityIssueTable issues={data.openIssues} />
            </SectionCard>
          </>
        )}
      </div>
    </>
  )
}
