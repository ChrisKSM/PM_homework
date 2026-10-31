import type {
  BurndownData,
  MemberWorkload,
  SprintIssue,
  SprintSummary,
  SprintVelocity,
} from './jira'

export interface ModelStatusSprintResponse {
  meta: {
    model?: string
    label: string
    projectKey?: string
    source?: 'tvjira' | string
    currentSp?: number | null
    currentSprintLabel?: string
    initiativeCount?: number
    epicCount?: number
    milestoneRows?: number
    milestoneDone?: number
    asOf?: string
    hint?: string
  }
  summary: SprintSummary & {
    plannedSpTotal?: number
    consumptionPct?: number | null
    currentSp?: number | null
  }
  burndown: BurndownData
  velocity: SprintVelocity[]
  workload: MemberWorkload[]
  issues: SprintIssue[]
  alerts: string[]
  kpi?: {
    plannedSpTotal?: number
    effectiveSpConsumed?: number
    consumptionPct?: number | null
    completionPct?: number | null
    byInitiative?: unknown[]
  }
  worklog?: {
    spHoursPerPoint?: number
    issueScopeCount?: number
    issuesWithWorklog?: number
    entriesCount?: number
    totalSpLogged?: number
    totalHours?: number
    bySprint?: Array<{ sp: number; sprintName: string; spLogged: number; hours: number }>
  }
}
