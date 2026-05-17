import { useQuery } from '@tanstack/react-query'
import { jiraApi } from '../api/jiraApi'
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
import {
  mockProjectSummary,
  mockEpicProgress,
  mockIssueDistribution,
  mockVelocity,
  mockRiskIssues,
  mockSprintSummary,
  mockBurndown,
  mockTeamWorkload,
  mockSprintIssues,
} from '../mocks/mockData'

// VITE_USE_MOCK=false 로 설정하면 실제 백엔드 API 호출로 전환
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// ── 책임자 대시보드 ──────────────────────────────────────────────────────────

export function useProjectSummary() {
  return useQuery<ProjectSummary>({
    queryKey: ['projectSummary'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockProjectSummary) : jiraApi.getProjectSummary,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEpicProgress() {
  return useQuery<EpicProgress[]>({
    queryKey: ['epicProgress'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockEpicProgress) : jiraApi.getEpicProgress,
    staleTime: 5 * 60 * 1000,
  })
}

export function useIssueDistribution() {
  return useQuery<IssueDistribution[]>({
    queryKey: ['issueDistribution'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockIssueDistribution) : jiraApi.getIssueDistribution,
    staleTime: 5 * 60 * 1000,
  })
}

export function useVelocity() {
  return useQuery<SprintVelocity[]>({
    queryKey: ['velocity'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockVelocity) : jiraApi.getVelocity,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRiskIssues() {
  return useQuery<RiskIssue[]>({
    queryKey: ['riskIssues'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockRiskIssues) : jiraApi.getRiskIssues,
    staleTime: 5 * 60 * 1000,
  })
}

// ── 개발팀 대시보드 ──────────────────────────────────────────────────────────

export function useSprintSummary() {
  return useQuery<SprintSummary>({
    queryKey: ['sprintSummary'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockSprintSummary) : () => jiraApi.getSprintSummary(),
    staleTime: 2 * 60 * 1000,
  })
}

export function useBurndown() {
  return useQuery<BurndownData>({
    queryKey: ['burndown'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockBurndown) : () => jiraApi.getBurndown(),
    staleTime: 2 * 60 * 1000,
  })
}

export function useTeamWorkload() {
  return useQuery<MemberWorkload[]>({
    queryKey: ['teamWorkload'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockTeamWorkload) : jiraApi.getTeamWorkload,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSprintIssues() {
  return useQuery<SprintIssue[]>({
    queryKey: ['sprintIssues'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockSprintIssues) : jiraApi.getCurrentSprintIssues,
    staleTime: 2 * 60 * 1000,
  })
}
