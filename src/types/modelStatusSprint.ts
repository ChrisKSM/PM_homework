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
    boardId?: number
    sprintId?: number
    scope?: string
    matchedStories?: number
    totalInSprint?: number
    asOf?: string
  }
  summary: SprintSummary
  burndown: BurndownData
  velocity: SprintVelocity[]
  workload: MemberWorkload[]
  issues: SprintIssue[]
  alerts: string[]
}
