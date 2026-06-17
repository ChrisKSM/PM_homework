import type { BurndownData, MemberWorkload, SprintSummary, SprintVelocity } from '../../types/jira'
import type { ForecastStatus, SprintPlanForecast } from '../../types/sprintPlanForecast'

const SCHEDULE_RESERVE_DAYS = 45

function statusFromDelay(delayDays: number): ForecastStatus {
  if (delayDays <= 0) return 'ok'
  if (delayDays <= 2) return 'warning'
  return 'critical'
}

function buildBurndownForecast(burndown: BurndownData, summary: SprintSummary) {
  const points = burndown.points ?? []
  const daysLeft = summary.daysLeft ?? 0
  const plannedEnd = summary.endDate ?? ''
  let remaining = summary.remainingPoints ?? 0
  if (points.length > 0) {
    remaining = points[points.length - 1].actual ?? remaining
  }

  const requiredDaily = daysLeft > 0 ? Math.round((remaining / daysLeft) * 100) / 100 : remaining

  let actualDaily = 0
  if (points.length >= 2) {
    const sample = points.length >= 4 ? points.slice(-4) : points
    const burns: number[] = []
    for (let i = 1; i < sample.length; i += 1) {
      const delta = (sample[i - 1].actual ?? 0) - (sample[i].actual ?? 0)
      if (delta >= 0) burns.push(delta)
    }
    if (burns.length > 0) {
      actualDaily = Math.round((burns.reduce((a, b) => a + b, 0) / burns.length) * 100) / 100
    }
  }

  let predictedEnd: string | null = null
  let delayDays = 0
  const today = new Date()

  if (actualDaily > 0.05 && remaining > 0) {
    const daysNeeded = remaining / actualDaily
    const predicted = new Date(today)
    predicted.setDate(predicted.getDate() + Math.ceil(daysNeeded))
    predictedEnd = predicted.toISOString().slice(0, 10)
    if (plannedEnd) {
      const endDt = new Date(plannedEnd)
      delayDays = Math.round((predicted.getTime() - endDt.getTime()) / 86400000)
    } else {
      delayDays = Math.max(0, Math.round(daysNeeded - daysLeft))
    }
  } else if (remaining > 0 && daysLeft > 0) {
    delayDays = daysLeft
  }

  let status = statusFromDelay(delayDays)
  let summaryText: string
  if (remaining <= 0) {
    status = 'ok'
    summaryText = `${summary.sprintName} — 잔여 SP 없음, 스프린트 목표 달성 가능`
  } else if (actualDaily <= 0.05) {
    status = 'critical'
    summaryText = `최근 SP 소진 없음 · 필요 ${requiredDaily} SP/일`
  } else if (delayDays > 0) {
    summaryText = `예측 +${delayDays.toFixed(0)}일 지연 · 필요 ${requiredDaily} vs 실제 ${actualDaily} SP/일`
  } else {
    summaryText = `정상 궤도 · 실제 ${actualDaily} SP/일 (필요 ${requiredDaily})`
  }

  return {
    sprintName: burndown.sprintName || summary.sprintName,
    remainingSp: Math.round(remaining * 10) / 10,
    daysLeft,
    requiredDailyBurn: requiredDaily,
    actualDailyBurn: actualDaily,
    predictedCompletionDate: predictedEnd,
    plannedEndDate: plannedEnd,
    delayDays,
    status,
    summary: summaryText,
  }
}

function buildVelocityForecast(velocity: SprintVelocity[], burndown: BurndownData) {
  const completed = velocity.map((v) => v.completed).filter((v) => v > 0)
  const planned = velocity.map((v) => v.planned).filter((v) => v > 0)
  const avgCompleted = completed.length
    ? Math.round((completed.reduce((a, b) => a + b, 0) / completed.length) * 10) / 10
    : 0
  const avgPlanned = planned.length
    ? Math.round((planned.reduce((a, b) => a + b, 0) / planned.length) * 10) / 10
    : 0

  const current = velocity[velocity.length - 1]
  const currentPlanned = current?.planned ?? burndown.totalPoints ?? 0
  const currentCompleted = current?.completed ?? 0
  const velocityGap = Math.round((currentPlanned - avgCompleted) * 10) / 10
  const achievement = currentPlanned
    ? Math.round((currentCompleted / currentPlanned) * 1000) / 10
    : 0

  let status: ForecastStatus = 'ok'
  let summaryText: string
  if (avgCompleted <= 0) {
    status = 'warning'
    summaryText = 'Velocity 이력 부족 — 예측 신뢰도 낮음'
  } else if (velocityGap > avgCompleted * 0.15) {
    status = 'critical'
    summaryText = `커밋 ${currentPlanned} SP vs 평균 완료 ${avgCompleted} SP — 과대 계획 위험`
  } else if (velocityGap > 0) {
    status = 'warning'
    summaryText = `평균 Velocity ${avgCompleted} SP 대비 +${velocityGap} SP 커밋`
  } else {
    summaryText = `평균 Velocity ${avgCompleted} SP · 달성률 ${achievement}%`
  }

  return {
    avgCompletedSp: avgCompleted,
    avgPlannedSp: avgPlanned,
    currentSprintPlanned: Math.round(currentPlanned * 10) / 10,
    currentSprintCompleted: Math.round(currentCompleted * 10) / 10,
    velocityGap,
    commitAchievementPct: achievement,
    status,
    summary: summaryText,
  }
}

function buildResourceForecast(workload: MemberWorkload[]) {
  const members = workload.filter(
    (m) => !['unassigned', '미할당'].includes(m.name.toLowerCase()),
  )
  if (members.length === 0) {
    return {
      teamSize: 0,
      avgSpPerMember: 0,
      maxSpPerMember: 0,
      overloadedCount: 0,
      status: 'ok' as ForecastStatus,
      summary: '워크로드 데이터 없음',
    }
  }

  const sps = members.map((m) => m.storyPoints)
  const avgSp = sps.reduce((a, b) => a + b, 0) / sps.length
  const maxSp = Math.max(...sps)
  const threshold = avgSp * 1.3
  const overloaded = sps.filter((sp) => sp > threshold).length

  let status: ForecastStatus = 'ok'
  let summaryText: string
  if (overloaded >= 2) {
    status = 'critical'
    summaryText = `${overloaded}명 과부하 (평균 ${avgSp.toFixed(1)} SP 대비 130% 초과)`
  } else if (overloaded === 1) {
    status = 'warning'
    summaryText = `1명 과부하 · 최대 ${maxSp.toFixed(1)} SP`
  } else {
    summaryText = `팀 ${members.length}명 · 평균 ${avgSp.toFixed(1)} SP/인`
  }

  return {
    teamSize: members.length,
    avgSpPerMember: Math.round(avgSp * 10) / 10,
    maxSpPerMember: Math.round(maxSp * 10) / 10,
    overloadedCount: overloaded,
    status,
    summary: summaryText,
  }
}

function buildAlerts(forecast: Pick<SprintPlanForecast, 'sprintBurndown' | 'velocity' | 'emv' | 'resource'>) {
  return [forecast.sprintBurndown, forecast.velocity, forecast.emv, forecast.resource]
    .filter((b) => b.status === 'warning' || b.status === 'critical')
    .map((b) => b.summary)
}

/** 개발팀 대시보드 Burndown/Velocity/Workload로 예측 생성 (BE forecast API 실패 시에도 표시) */
export function buildSprintForecastFromDevTeamData(input: {
  burndown: BurndownData
  sprint: SprintSummary
  velocity: SprintVelocity[]
  workload: MemberWorkload[]
  emvOverride?: SprintPlanForecast['emv']
}): SprintPlanForecast {
  const sprintBurndown = buildBurndownForecast(input.burndown, input.sprint)
  const velocity = buildVelocityForecast(input.velocity, input.burndown)
  const resource = buildResourceForecast(input.workload)
  const emv = input.emvOverride ?? {
    totalEmvSchedule: 0,
    totalEmvEffort: 0,
    scheduleReserveDays: SCHEDULE_RESERVE_DAYS,
    reserveUsedPct: 0,
    openRisks: 0,
    highExposure: 0,
    status: 'ok' as ForecastStatus,
    summary: 'EMV — /api/sprint-plan/forecast 또는 리스크 대시보드 참조',
  }

  const partial = { sprintBurndown, velocity, emv, resource }
  return {
    asOf: new Date().toISOString(),
    ...partial,
    alerts: buildAlerts(partial),
    meta: {
      dataSource: 'jira',
      methods: 'burndown_slope · velocity_gap · workload_ratio (devteam local)',
    },
  }
}
