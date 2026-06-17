import clsx from 'clsx'
import { AlertTriangle, CalendarClock, Gauge, ShieldAlert, Users } from 'lucide-react'
import type { ForecastStatus, SprintPlanForecast } from '../../types/sprintPlanForecast'
import KpiCard from '../cards/KpiCard'
import SectionCard from '../cards/SectionCard'

function toneFor(status: ForecastStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'ok') return 'success'
  if (status === 'warning') return 'warning'
  return 'danger'
}

interface SprintForecastPanelProps {
  data: SprintPlanForecast
}

export default function SprintForecastPanel({ data }: SprintForecastPanelProps) {
  const bd = data.sprintBurndown
  const vl = data.velocity
  const emv = data.emv
  const res = data.resource

  const delayLabel =
    bd.delayDays > 0 ? `+${bd.delayDays.toFixed(0)}일` : bd.remainingSp <= 0 ? '0일' : '정상'

  return (
    <SectionCard
      title="스프린트 · 릴리즈 예측 (1단계)"
      subtitle="Burndown 기울기 · Velocity gap · EMV Reserve · 자원 부하 — Jira 실데이터 가공"
    >
      <div className="space-y-4">
        {data.alerts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-900">식별된 위험 신호</p>
            {data.alerts.map((alert) => (
              <p key={alert} className="text-sm text-amber-900 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                {alert}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="스프린트 완료 예측"
            value={delayLabel}
            sub={bd.summary}
            tone={toneFor(bd.status)}
            icon={<CalendarClock size={16} />}
          />
          <KpiCard
            label="Velocity Gap"
            value={`${vl.velocityGap > 0 ? '+' : ''}${vl.velocityGap} SP`}
            sub={vl.summary}
            tone={toneFor(vl.status)}
            icon={<Gauge size={16} />}
          />
          <KpiCard
            label="EMV Reserve"
            value={`${emv.reserveUsedPct}%`}
            sub={emv.summary}
            tone={toneFor(emv.status)}
            icon={<ShieldAlert size={16} />}
          />
          <KpiCard
            label="자원 부하"
            value={res.overloadedCount > 0 ? `${res.overloadedCount}명 과부하` : '균형'}
            sub={res.summary}
            tone={toneFor(res.status)}
            icon={<Users size={16} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-surface-border bg-surface-page px-4 py-3 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Burndown 예측 상세</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-800">
              <dt className="text-gray-500">잔여 SP</dt>
              <dd className="font-semibold">{bd.remainingSp} SP</dd>
              <dt className="text-gray-500">필요 소진</dt>
              <dd>{bd.requiredDailyBurn} SP/일</dd>
              <dt className="text-gray-500">실제 소진</dt>
              <dd>{bd.actualDailyBurn} SP/일</dd>
              <dt className="text-gray-500">예측 완료</dt>
              <dd>{bd.predictedCompletionDate ?? '—'}</dd>
              <dt className="text-gray-500">계획 종료</dt>
              <dd>{bd.plannedEndDate || '—'}</dd>
            </dl>
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-page px-4 py-3 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Velocity · EMV · 자원</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-800">
              <dt className="text-gray-500">평균 Velocity</dt>
              <dd className="font-semibold">{vl.avgCompletedSp} SP</dd>
              <dt className="text-gray-500">현재 달성률</dt>
              <dd>{vl.commitAchievementPct}%</dd>
              <dt className="text-gray-500">Σ EMV_일정</dt>
              <dd>{emv.totalEmvSchedule}일</dd>
              <dt className="text-gray-500">Reserve</dt>
              <dd>
                {emv.reserveUsedPct}% / {emv.scheduleReserveDays}일
              </dd>
              <dt className="text-gray-500">Open Risk</dt>
              <dd>{emv.openRisks}건</dd>
              <dt className="text-gray-500">팀 규모</dt>
              <dd>
                {res.teamSize}명 · max {res.maxSpPerMember} SP
              </dd>
            </dl>
          </div>
        </div>

        <p className={clsx('text-[11px] text-gray-400 font-medium')}>
          갱신 {new Date(data.asOf).toLocaleString('ko-KR')} · {data.meta.methods}
        </p>
      </div>
    </SectionCard>
  )
}
