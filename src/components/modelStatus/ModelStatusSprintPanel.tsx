import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Flame, Target, Zap } from 'lucide-react'
import KpiCard from '../cards/KpiCard'
import SectionCard from '../cards/SectionCard'
import IssueTable from '../cards/IssueTable'
import BurndownChart from '../charts/BurndownChart'
import VelocityChart from '../charts/VelocityChart'
import WorkloadChart from '../charts/WorkloadChart'
import JiraDegradedBanner from '../jira/JiraDegradedBanner'
import SprintForecastPanel from '../devteam/SprintForecastPanel'
import {
  useBurndown,
  useSprintIssues,
  useSprintSummary,
  useTeamWorkload,
  useVelocity,
} from '../../hooks/useJiraData'
import { useJiraDegraded } from '../../hooks/useJiraDegraded'
import { useSprintPlanForecast } from '../../hooks/useSprintPlanData'
import { buildSprintForecastFromDevTeamData } from '../devteam/sprintForecastUtils'
import { MODEL_INITIATIVE_JIRA_MODELS } from '../../api/modelStatusApi'
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
  const jiraLive = MODEL_INITIATIVE_JIRA_MODELS.has(norm)

  if (!active) return null

  return (
    <div className="space-y-5" data-testid="model-status-sprint-panel">
      <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-[11px] text-violet-950">
        <span className="font-semibold">{modelCode.replace(/_/g, ' ')}</span>
        {jiraLive ? (
          <> · Jira 스프린트 보드 연동 (S80C Soundbar와 동일 API)</>
        ) : (
          <>
            {' '}
            · Jira 라벨 미연동 — 아래는 mock/폴백 미리보기. live는{' '}
            <Link to="/model-schedule/status?group=bt-soundbar&model=S80C&tab=sprint" className="underline font-medium">
              S80C
            </Link>{' '}
            또는{' '}
            <Link to="/s80c/devteam" className="underline font-medium">
              개발팀 대시보드
            </Link>
          </>
        )}
      </div>
      <ModelStatusSprintPanelBody jiraLive={jiraLive} />
    </div>
  )
}

function ModelStatusSprintPanelBody({ jiraLive }: { jiraLive: boolean }) {
  const jiraDegraded = useJiraDegraded()
  const { data: sprint, isLoading: loadingSprint } = useSprintSummary()
  const { data: burndown, isLoading: loadingBurndown } = useBurndown()
  const { data: workload, isLoading: loadingWorkload } = useTeamWorkload()
  const { data: velocity, isLoading: loadingVelocity } = useVelocity()
  const { data: issues, isLoading: loadingIssues } = useSprintIssues()
  const { data: forecastApi, isLoading: loadingForecastApi } = useSprintPlanForecast()

  const localForecast = useMemo(() => {
    if (!burndown || !sprint) return null
    return buildSprintForecastFromDevTeamData({
      burndown,
      sprint,
      velocity: velocity ?? [],
      workload: workload ?? [],
      emvOverride: forecastApi?.emv,
    })
  }, [burndown, sprint, velocity, workload, forecastApi?.emv])

  const forecast = useMemo(() => {
    if (forecastApi) {
      return {
        ...forecastApi,
        meta: {
          ...forecastApi.meta,
          methods: forecastApi.meta.methods ?? 'burndown · velocity · EMV · workload (API)',
        },
      }
    }
    return localForecast
  }, [forecastApi, localForecast])

  const sprintRiskLines = useMemo(() => {
    const lines: string[] = []
    if (sprint?.blockerCount && sprint.blockerCount > 0) {
      lines.push(`블로커 ${sprint.blockerCount}건 — 즉시 해소 필요`)
    }
    if (sprint && sprint.completionRate < 50 && (sprint.daysLeft ?? 99) <= 5) {
      lines.push(`스프린트 종료 D-${sprint.daysLeft} · 완료율 ${sprint.completionRate}% — 일정 리스크`)
    }
    if (forecast?.alerts?.length) {
      for (const a of forecast.alerts.slice(0, 4)) lines.push(a)
    }
    if (burndown?.points?.length) {
      const last = burndown.points[burndown.points.length - 1]
      if (last && last.actual > last.ideal * 1.15) {
        lines.push('Burn Down — 실제 잔여 SP가 이상선 대비 15% 이상 높음')
      }
    }
    return lines
  }, [sprint, forecast, burndown])

  const showForecastLoading = loadingForecastApi && !localForecast

  return (
    <>
      {jiraDegraded ? <JiraDegradedBanner /> : null}

      {sprintRiskLines.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-bold text-amber-950 flex items-center gap-2 mb-2">
            <AlertTriangle size={14} />
            스프린트 · Velocity 리스크 신호
          </p>
          <ul className="space-y-1 text-[11px] text-amber-900">
            {sprintRiskLines.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                {line}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-amber-800/80 mt-2 border-t border-amber-200/80 pt-2">
            {jiraLive ? 'Jira live · 예측 API/로컬 가공' : 'mock/폴백 — S80C 연동 후 live 리스크 판단'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-2 text-[11px] text-emerald-900">
          현재 자동 감지된 스프린트 리스크 신호 없음 (블로커·burndown gap·예측 alert 기준)
        </div>
      )}

      {loadingSprint ? (
        <LoadingSpinner />
      ) : sprint ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="현재 스프린트"
            value={sprint.sprintName}
            sub={`종료 ${sprint.endDate} · D-${sprint.daysLeft}`}
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
            tone={sprint.completionRate >= 70 ? 'success' : 'warning'}
            icon={<Zap size={16} />}
          />
          <KpiCard
            label="블로커"
            value={sprint.blockerCount}
            sub="스프린트 리스크 입력"
            tone={sprint.blockerCount > 0 ? 'danger' : 'success'}
            icon={<AlertTriangle size={16} />}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          title="Burn Down"
          subtitle={sprint?.sprintName ? `${sprint.sprintName} — 이상 vs 실제` : '현재 스프린트'}
        >
          {loadingBurndown ? <LoadingSpinner /> : burndown ? <BurndownChart data={burndown} /> : null}
        </SectionCard>
        <SectionCard title="팀 워크로드 (SP)" subtitle="담당자별 현재 스프린트">
          {loadingWorkload ? <LoadingSpinner /> : workload ? <WorkloadChart data={workload} /> : null}
        </SectionCard>
      </div>

      <SectionCard title="Velocity" subtitle="스프린트별 committed vs done Story SP">
        {loadingVelocity ? <LoadingSpinner /> : velocity ? <VelocityChart data={velocity} /> : null}
      </SectionCard>

      <SectionCard title="현재 스프린트 이슈" subtitle="Story / Sub-task / Bug">
        {loadingIssues ? <LoadingSpinner /> : issues ? <IssueTable issues={issues} /> : null}
      </SectionCard>

      {showForecastLoading ? (
        <LoadingSpinner />
      ) : forecast ? (
        <SprintForecastPanel data={forecast} />
      ) : (
        <SectionCard title="스프린트 · 릴리즈 예측" subtitle="Burndown/Velocity 로드 후">
          <p className="text-sm text-gray-500 py-6 text-center">데이터 로드 중이거나 없습니다.</p>
        </SectionCard>
      )}
    </>
  )
}
