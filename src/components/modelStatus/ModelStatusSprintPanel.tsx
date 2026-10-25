import { Link } from 'react-router-dom'
import { AlertTriangle, Flame, Target, Zap } from 'lucide-react'
import KpiCard from '../cards/KpiCard'
import SectionCard from '../cards/SectionCard'
import IssueTable from '../cards/IssueTable'
import BurndownChart from '../charts/BurndownChart'
import VelocityChart from '../charts/VelocityChart'
import WorkloadChart from '../charts/WorkloadChart'
import JiraDegradedBanner from '../jira/JiraDegradedBanner'
import { useModelStatusSprint } from '../../hooks/useModelStatusSprint'
import { MODEL_SPRINT_JIRA_MODELS } from '../../api/modelStatusApi'
import { useJiraDegraded } from '../../hooks/useJiraDegraded'
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
  const jiraLive = MODEL_SPRINT_JIRA_MODELS.has(norm)
  const { data, isLoading, isFetching } = useModelStatusSprint(modelCode, active)
  const jiraDegraded = useJiraDegraded()

  if (!active) return null

  const meta = data?.meta
  const summary = data?.summary
  const burndown = data?.burndown
  const velocity = data?.velocity
  const workload = data?.workload
  const issues = data?.issues
  const alerts = data?.alerts ?? []

  return (
    <div className="space-y-5" data-testid="model-status-sprint-panel">
      <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-[11px] text-violet-950">
        <span className="font-semibold">{modelCode.replace(/_/g, ' ')}</span>
        {jiraLive ? (
          <>
            {' '}
            · <code className="text-[10px]">GET /api/model-status/sprint/dashboard</code>
            {meta?.label ? (
              <>
                {' '}
                · label <b>{meta.label}</b>
              </>
            ) : null}
            {meta?.matchedStories != null ? (
              <>
                {' '}
                · Story {meta.matchedStories}건 / sprint 전체 {meta.totalInSprint ?? '—'}건
              </>
            ) : null}
          </>
        ) : (
          <>
            {' '}
            · sprint label 미등록 — mock 미리보기. 매핑 추가 또는{' '}
            <Link to="/model-schedule/status?group=bt-soundbar&model=S80C&tab=sprint" className="underline">
              S80C
            </Link>
          </>
        )}
        {isFetching && !isLoading ? (
          <span className="ml-2 text-violet-600">갱신 중…</span>
        ) : null}
      </div>

      {jiraDegraded ? <JiraDegradedBanner /> : null}

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {alerts.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-950 flex items-center gap-2 mb-2">
                <AlertTriangle size={14} />
                스프린트 · Velocity 리스크 (모델 스코프)
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
              자동 감지 리스크 없음 (모델 label 기준 Story · burndown · velocity)
            </div>
          )}

          {summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="현재 스프린트"
                value={summary.sprintName}
                sub={`종료 ${summary.endDate} · D-${summary.daysLeft}`}
                icon={<Flame size={16} />}
              />
              <KpiCard
                label="남은 Story Points"
                value={`${summary.remainingPoints} SP`}
                sub="선택 모델 Story 합산"
                tone="warning"
                icon={<Target size={16} />}
              />
              <KpiCard
                label="완료율"
                value={`${summary.completionRate}%`}
                sub="모델 스코프 SP"
                tone={summary.completionRate >= 70 ? 'success' : 'warning'}
                icon={<Zap size={16} />}
              />
              <KpiCard
                label="블로커"
                value={summary.blockerCount}
                sub="P0 · label JQL"
                tone={summary.blockerCount > 0 ? 'danger' : 'success'}
                icon={<AlertTriangle size={16} />}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard title="Burn Down" subtitle={summary?.sprintName ?? '현재 스프린트 · 모델 Story'}>
              {burndown?.points?.length ? <BurndownChart data={burndown} /> : (
                <p className="text-sm text-gray-500 py-8 text-center">모델 Story SP 없음</p>
              )}
            </SectionCard>
            <SectionCard title="팀 워크로드 (SP)" subtitle="모델 스코프 담당자별">
              {workload?.length ? <WorkloadChart data={workload} /> : (
                <p className="text-sm text-gray-500 py-8 text-center">—</p>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Velocity" subtitle="모델 Story — committed vs done SP">
            {velocity?.length ? <VelocityChart data={velocity} /> : (
              <p className="text-sm text-gray-500 py-8 text-center">—</p>
            )}
          </SectionCard>

          <SectionCard title="현재 스프린트 이슈" subtitle="labels/components 매칭">
            {issues?.length ? <IssueTable issues={issues} /> : (
              <p className="text-sm text-gray-500 py-8 text-center">매칭 이슈 없음 — Jira label 확인</p>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
