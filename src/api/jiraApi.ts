import client from './client'
import type {
  ProjectSummary,
  EpicProgress,
  IssueDistribution,
  SprintVelocity,
  RiskIssue,
  BurndownData,
  SprintSummary,
  MemberWorkload,
  SprintIssue,
} from '../types/jira'

export const jiraApi = {
  // 책임자 대시보드
  getProjectSummary: () =>
    client.get<ProjectSummary>('/metrics/summary').then((r) => r.data),

  getEpicProgress: () =>
    client.get<EpicProgress[]>('/epics/progress').then((r) => r.data),

  getIssueDistribution: () =>
    client.get<IssueDistribution[]>('/issues/distribution').then((r) => r.data),

  getVelocity: () =>
    client.get<SprintVelocity[]>('/sprints/velocity').then((r) => r.data),

  getRiskIssues: () =>
    client.get<RiskIssue[]>('/issues/risks').then((r) => r.data),

  // 개발팀 대시보드
  getSprintSummary: (sprintId?: string) =>
    client
      .get<SprintSummary>('/sprints/current/summary', { params: { sprintId } })
      .then((r) => r.data),

  getBurndown: (sprintId?: string) =>
    client
      .get<BurndownData>(`/sprints/${sprintId ?? 'current'}/burndown`)
      .then((r) => r.data),

  getTeamWorkload: () =>
    client.get<MemberWorkload[]>('/team/workload').then((r) => r.data),

  getCurrentSprintIssues: () =>
    client.get<SprintIssue[]>('/issues/current-sprint').then((r) => r.data),
}
