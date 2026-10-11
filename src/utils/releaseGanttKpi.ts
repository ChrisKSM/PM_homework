import type { ModelReleaseGanttData, ReleaseMilestone, ReleaseSprintDef } from '../types/modelStatusReleaseGantt'

/** Jira 완료로 간주하는 status (TVPLAT Milestone) */
export function isMilestoneDone(status?: string): boolean {
  const n = (status ?? '').toLowerCase()
  return (
    n.includes('done') ||
    n.includes('closed') ||
    n.includes('complete') ||
    n.includes('resolved') ||
    n.includes('완료')
  )
}

export function sprintForDate(sprints: ReleaseSprintDef[] | undefined, day: Date): number | null {
  if (!sprints?.length) return null
  const t = new Date(day)
  t.setHours(12, 0, 0, 0)
  let lastEnded: number | null = null
  for (const s of sprints) {
    const start = new Date(`${s.startDate}T12:00:00`)
    const end = new Date(`${s.endDate}T12:00:00`)
    if (t >= start && t <= end) return s.sp
    if (t > end) lastEnded = s.sp
    if (t < start) return lastEnded ?? s.sp
  }
  const first = sprints[0]
  const last = sprints[sprints.length - 1]
  const t0 = new Date(`${first.startDate}T12:00:00`)
  const t1 = new Date(`${last.endDate}T12:00:00`)
  if (t < t0) return first.sp
  if (t > t1) return last.sp
  return lastEnded
}

/** Gantt 그리드에서 오늘 세로선 위치 (px, sprint 열만) */
export function todayLineOffsetPx(
  gantt: Pick<ModelReleaseGanttData, 'sprintMin' | 'sprints'>,
  colW: number,
  day = new Date(),
): number | null {
  const sprints = gantt.sprints
  if (!sprints?.length) return null
  const sp = sprintForDate(sprints, day)
  if (sp == null) return null
  const def = sprints.find((s) => s.sp === sp)
  if (!def) return (sp - gantt.sprintMin) * colW + colW / 2
  const start = new Date(`${def.startDate}T12:00:00`).getTime()
  const end = new Date(`${def.endDate}T12:00:00`).getTime()
  const t = new Date(day)
  t.setHours(12, 0, 0, 0)
  const frac = end > start ? Math.min(1, Math.max(0, (t.getTime() - start) / (end - start))) : 0.5
  return (sp - gantt.sprintMin) * colW + frac * colW
}

export function filterEpicsWithMilestones(gantt: ModelReleaseGanttData): ModelReleaseGanttData {
  const epics = gantt.epics
    .map((e) => ({
      ...e,
      milestones: (e.milestones ?? []).filter((m) => m.issueKey),
    }))
    .filter((e) => (e.milestones?.length ?? 0) > 0)
  const milestones = epics.flatMap((e) => e.milestones ?? [])
  return { ...gantt, epics, milestones }
}

export interface ReleaseGanttKpiResult {
  kpi1Pct: number
  kpi1Sub: string
  kpi1Detail: string
  kpi2Pct: number
  kpi2Sub: string
  kpi2Detail: string
  spTotal: number
  spElapsed: number
  milestoneTotal: number
  milestoneDone: number
}

/**
 * KPI-1: 2026 릴리즈 캘린더 SP(26) 중 오늘 기준 경과 SP 수
 * KPI-2: Milestone 이슈 완료율 (Jira status)
 */
export function computeReleaseGanttKpis(gantt: ModelReleaseGanttData, day = new Date()): ReleaseGanttKpiResult {
  const filtered = filterEpicsWithMilestones(gantt)
  const sprints = gantt.sprints ?? []
  const spTotal = gantt.sprintMax - gantt.sprintMin + 1
  const today = new Date(day)
  today.setHours(12, 0, 0, 0)

  let spElapsed = 0
  if (sprints.length) {
    for (const s of sprints) {
      const end = new Date(`${s.endDate}T12:00:00`)
      if (end < today) spElapsed += 1
    }
    const cur = sprintForDate(sprints, today)
    if (cur != null && !sprints.some((s) => s.sp === cur && new Date(`${s.endDate}T12:00:00`) < today)) {
      /* 현재 진행 중인 SP — 완료 SP에 포함하지 않음 (경과 = 종료된 SP만) */
    }
  } else {
    spElapsed = Math.max(0, (sprintForDate([], today) ?? gantt.sprintMin) - gantt.sprintMin)
  }

  const milestones: ReleaseMilestone[] = filtered.milestones
  const milestoneTotal = milestones.length
  const milestoneDone = milestones.filter((m) => isMilestoneDone(m.status)).length

  const kpi1Pct = spTotal > 0 ? Math.round((spElapsed / spTotal) * 1000) / 10 : 0
  const kpi2Pct =
    milestoneTotal > 0 ? Math.round((milestoneDone / milestoneTotal) * 1000) / 10 : 0

  return {
    spTotal,
    spElapsed,
    milestoneTotal,
    milestoneDone,
    kpi1Pct,
    kpi1Sub: `경과 SP ${spElapsed}/${spTotal} (2026 SP01~SP${String(spTotal).padStart(2, '0')} 캘린더)`,
    kpi1Detail: 'KPI-1 = 릴리즈 연간 스프린트 중 종료일이 지난 SP 비율 (Story Point 합산이 아님)',
    kpi2Pct,
    kpi2Sub: `마일스톤 완료 ${milestoneDone}/${milestoneTotal}`,
    kpi2Detail: 'KPI-2 = Epic 하위 Milestone issuetype · Jira Done/Closed/Resolved 비율',
  }
}
