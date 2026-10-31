import { AlertTriangle, Flame, Target, TrendingUp } from 'lucide-react'
import KpiCard from '../cards/KpiCard'
import SectionCard from '../cards/SectionCard'
import IssueTable from '../cards/IssueTable'
import BurndownChart from '../charts/BurndownChart'
import VelocityChart from '../charts/VelocityChart'
import { useModelStatusSprint } from '../../hooks/useModelStatusSprint'
import { MODEL_SPRINT_JIRA_MODELS } from '../../api/modelStatusApi'
import { canonicalModelName } from '../../utils/modelScheduleRows'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export interface ModelStatusSprintPanelProps {
  modelCode: string
  active: boolean
}

export default function ModelStatusSprintPanel({ modelCode, active }: ModelStatusSprintPanelProps) {
  const norm = canonicalModelName(modelCode)
  const tvLive = MODEL_SPRINT_JIRA_MODELS.has(norm)
  const { data, isLoading, isFetching } = useModelStatusSprint(modelCode, active)

  if (!active) return null

  const meta = data?.meta
  const summary = data?.summary
  const burndown = data?.burndown
  const velocity = data?.velocity
  const issues = data?.issues
  const alerts = data?.alerts ?? []
  const kpi = data?.kpi
  const worklog = data?.worklog
  const workload = data?.workload ?? []

  return (
    <div className="space-y-5" data-testid="model-status-sprint-panel">
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[11px] text-blue-950">
        <span className="font-semibold">{modelCode.replace(/_/g, ' ')}</span>
        {tvLive ? (
          <>
            {' '}
            · TV Jira (TVPLAT) — Initiative · 릴리즈·Epic · Epic Story <b>worklog</b> (IR/SP 캘린더)
            {meta?.label ? <> · {meta.label}</> : null}
            {meta?.currentSprintLabel ? <> · 현재 {meta.currentSprintLabel}</> : null}
          </>
        ) : (
          <>
            {' '}
            · TV sprint label 미등록 (현재 live: H7 VI). Sound Suite → H7_VI 선택.
          </>
        )}
        {isFetching && !isLoading ? <span className="ml-2 text-blue-600">갱신 중…</span> : null}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {alerts.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-950 flex items-center gap-2 mb-2">
                <AlertTriangle size={14} />
                IR/SP · Milestone 리스크 (모델 스코프)
              </p>
              <ul className="space-y-1 text-[11px] text-amber-900">
                {alerts.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-2 text-[11px] text-emerald-900">
              자동 감지 리스크 없음 (소진율 · Story 완료 · 현재 SP Milestone 기준)
            </div>
          )}

          {summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="현재 IR/SP"
                value={summary.sprintName}
                sub={meta?.currentSp ? `SP${meta.currentSp}` : '2026 캘린더'}
                icon={<Flame size={16} />}
              />
              <KpiCard
                label="계획 SP 잔여"
                value={`${summary.remainingPoints} SP`}
                sub={`계획 ${kpi?.plannedSpTotal ?? '—'} · 소진 ${kpi?.effectiveSpConsumed ?? '—'}`}
                tone="warning"
                icon={<Target size={16} />}
              />
              <KpiCard
                label="Story 완료율"
                value={`${summary.completionRate}%`}
                sub="Epic 하위 Story (TV Jira)"
                tone={summary.completionRate >= 70 ? 'success' : 'warning'}
                icon={<TrendingUp size={16} />}
              />
              <KpiCard
                label="SP 소진율"
                value={kpi?.consumptionPct != null ? `${kpi.consumptionPct}%` : '—'}
                sub="Initiative Description KPI-1"
                tone={
                  kpi?.consumptionPct != null && kpi.consumptionPct >= 70 ? 'success' : 'info'
                }
                icon={<AlertTriangle size={16} />}
              />
            </div>
          ) : null}

          {worklog ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Worklog (모델 스코프)"
                value={`${worklog.totalSpLogged ?? '—'} SP`}
                sub={`${worklog.issuesWithWorklog ?? 0} issues · ${worklog.entriesCount ?? 0} entries`}
                icon={<TrendingUp size={16} />}
              />
              <KpiCard
                label="Worklog 시간"
                value={`${worklog.totalHours ?? '—'} h`}
                sub={`1 SP = ${worklog.spHoursPerPoint ?? 4}h (WorklogReport)`}
                icon={<Target size={16} />}
              />
            </div>
          ) : null}

          <SectionCard
            title="Burn Down (현재 IR/SP)"
            subtitle="마일스톤 계획 SP vs 일별 worklog 소진 — 2026 Audio 캘린더"
          >
            {burndown?.points?.length ? (
              <BurndownChart data={burndown} />
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">마일스톤 SP 데이터 없음</p>
            )}
          </SectionCard>

          <SectionCard
            title="Velocity (SP01–SP26)"
            subtitle="planned = Description·Milestone target SP · completed = worklog SP (started 날짜 → IR/SP)"
          >
            {velocity?.some((v) => (v.planned ?? v.committed ?? 0) > 0 || (v.completed ?? 0) > 0) ? (
              <VelocityChart
                data={velocity.map((v) => ({
                  sprintName: v.sprintName,
                  planned: v.planned ?? v.committed ?? 0,
                  completed: v.completed ?? 0,
                }))}
              />
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">—</p>
            )}
          </SectionCard>

          {workload.length > 0 ? (
            <SectionCard title="현재 SP 팀 Workload" subtitle="worklog author · SP 환산">
              <ul className="divide-y divide-gray-100 text-sm">
                {workload.map((m) => (
                  <li key={m.name} className="flex justify-between py-2">
                    <span className="font-medium text-gray-800">{m.name}</span>
                    <span className="text-gray-600">
                      {m.storyPoints} SP · {m.issueCount} issues
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <SectionCard title="미완료 Milestone" subtitle="Initiative 표 + Jira Milestone">
            {issues?.length ? <IssueTable issues={issues} /> : (
              <p className="text-sm text-gray-500 py-8 text-center">미완료 Milestone 없음</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
