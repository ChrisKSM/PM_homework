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

  return (
    <div className="space-y-5" data-testid="model-status-sprint-panel">
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[11px] text-blue-950">
        <span className="font-semibold">{modelCode.replace(/_/g, ' ')}</span>
        {tvLive ? (
          <>
            {' '}
            · TV Jira (TVPLAT) — Initiative · 릴리즈·Epic · story-sp-kpi 와 <b>동일 모델 label</b>
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

          <SectionCard
            title="Milestone Burn Down (IR/SP)"
            subtitle="Target Sprint별 계획 SP 누적 vs 완료 — release/gantt · Description 표"
          >
            {burndown?.points?.length ? (
              <BurndownChart data={burndown} />
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">마일스톤 SP 데이터 없음</p>
            )}
          </SectionCard>

          <SectionCard
            title="Velocity (SP01–SP26)"
            subtitle="Target Sprint별 Milestone 계획 SP vs 완료 SP"
          >
            {velocity?.some((v) => v.committed > 0) ? (
              <VelocityChart data={velocity} />
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">—</p>
            )}
          </SectionCard>

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
