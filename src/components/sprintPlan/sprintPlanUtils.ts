import dayjs from 'dayjs'
import type { SprintPlanRow, SprintPlanRisk, SprintPlanStatus } from '../../types/sprintPlan'
import { CHART, LG } from '../../theme/colors'

export const GANTT_START = '2026-02-01'
export const GANTT_END = '2026-08-31'

export function parseDate(value: string): dayjs.Dayjs {
  return dayjs(value)
}

export function daysBetween(start: string, end: string): number {
  return parseDate(end).diff(parseDate(start), 'day')
}

export function pctInRange(date: string, rangeStart: string, rangeEnd: string): number {
  const total = parseDate(rangeEnd).diff(parseDate(rangeStart), 'day')
  if (total <= 0) return 0
  const offset = parseDate(date).diff(parseDate(rangeStart), 'day')
  return Math.min(100, Math.max(0, (offset / total) * 100))
}

/** Gantt 축(Feb~Aug) 기준 막대 위치 — 스프린트가 축 밖이면 clip */
export function barStyleForGantt(
  row: Pick<SprintPlanRow, 'startDate' | 'endDate'>,
  ganttStart: string,
  ganttEnd: string,
): { left: string; width: string; visible: boolean } {
  const rowStart = parseDate(row.startDate)
  const rowEnd = parseDate(row.endDate)
  const axisStart = parseDate(ganttStart)
  const axisEnd = parseDate(ganttEnd)

  if (rowEnd.isBefore(axisStart) || rowStart.isAfter(axisEnd)) {
    return { left: '0%', width: '0%', visible: false }
  }

  const clipStart = rowStart.isBefore(axisStart) ? axisStart : rowStart
  const clipEnd = rowEnd.isAfter(axisEnd) ? axisEnd : rowEnd
  const totalDays = daysBetween(ganttStart, ganttEnd)
  const startOffset = daysBetween(ganttStart, clipStart.format('YYYY-MM-DD'))
  const duration = daysBetween(clipStart.format('YYYY-MM-DD'), clipEnd.format('YYYY-MM-DD')) + 1

  return {
    left: `${(startOffset / totalDays) * 100}%`,
    width: `${Math.max((duration / totalDays) * 100, 0.5)}%`,
    visible: true,
  }
}

export function markerLeftOnTimeline(
  risk: SprintPlanRisk,
  row: Pick<SprintPlanRow, 'startDate' | 'endDate'>,
  ganttStart: string,
  ganttEnd: string,
): string {
  const bar = barStyleForGantt(row, ganttStart, ganttEnd)
  if (!bar.visible) return bar.left
  const barLeft = parseFloat(bar.left)
  const barWidth = parseFloat(bar.width)
  const inBar = pctInRange(risk.markerDate, row.startDate, row.endDate)
  const raw = barLeft + (barWidth * inBar) / 100
  return `${Math.min(100, Math.max(0, raw))}%`
}

export function statusBarColor(status: SprintPlanStatus, isActive: boolean): string {
  if (isActive) return LG.red
  if (status === 'completed') return CHART.colors.success
  if (status === 'active') return CHART.colors.info
  return CHART.colors.planned
}

export function issueTypeBarColor(issueType: SprintPlanRow['issueType'], status: SprintPlanStatus): string {
  if (issueType === 'Risk') return CHART.colors.warning
  if (status === 'active') return LG.red
  if (issueType === 'Epic') return CHART.colors.info
  return status === 'completed' ? CHART.colors.success : CHART.colors.planned
}

/** Gantt 헤더 — 2월~8월 */
export function buildGanttMonthTicks(ganttStart: string, ganttEnd: string): { label: string; left: string }[] {
  const axisStart = parseDate(ganttStart)
  const axisEnd = parseDate(ganttEnd)
  const totalDays = daysBetween(ganttStart, ganttEnd)
  const ticks: { label: string; left: string }[] = []

  let cursor = axisStart.startOf('month')
  while (cursor.isBefore(axisEnd) || cursor.isSame(axisEnd, 'month')) {
    if (cursor.isBefore(axisStart)) {
      cursor = cursor.add(1, 'month')
      continue
    }
    const offset = daysBetween(ganttStart, cursor.format('YYYY-MM-DD'))
    ticks.push({
      label: `${cursor.month() + 1}월`,
      left: `${(offset / totalDays) * 100}%`,
    })
    cursor = cursor.add(1, 'month')
  }

  return ticks
}

export function todayMarkerLeft(ganttStart: string, ganttEnd: string): number | null {
  const today = dayjs()
  const start = parseDate(ganttStart)
  const end = parseDate(ganttEnd)
  if (today.isBefore(start) || today.isAfter(end)) return null
  const total = end.diff(start, 'day')
  const offset = today.diff(start, 'day')
  return (offset / total) * 100
}

export const TIMELINE_WIDTH_PX = 720
export const SUMMARY_COL_W = 300
export const SPRINT_COL_W = 168
export const ROW_HEIGHT_PX = 34

/** labels / fixVersions 기준 MVP 여부 (BE와 동일 규칙) */
export function isMvpLabel(label: string): boolean {
  const norm = label.toLowerCase().replace(/[_\-\s]/g, '')
  return norm === 'mvp' || norm.startsWith('mvp')
}

export function rowMvpLabels(labels: string[]): string[] {
  return labels.filter(isMvpLabel)
}
